import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Cloud Function to reset user password (Admin only)
 * 
 * This function allows admins to directly set a new password for any user.
 * It verifies that the caller is an admin before allowing the operation.
 */
export const adminResetPassword = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function.'
    );
  }

  const callerId = context.auth.uid;

  // Verify caller is admin
  const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
  const callerData = callerDoc.data();
  
  if (!callerData?.isAdmin && callerData?.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can reset user passwords.'
    );
  }

  // Validate input
  const { userId, newPassword } = data;
  
  if (!userId || typeof userId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId must be provided as a string.'
    );
  }

  if (!newPassword || typeof newPassword !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'newPassword must be provided as a string.'
    );
  }

  if (newPassword.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Password must be at least 6 characters long.'
    );
  }

  try {
    // Update the user's password using Firebase Admin SDK
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    // Log the admin activity
    await admin.firestore().collection('admin_activities').add({
      adminId: callerId,
      adminEmail: context.auth.token.email || 'unknown',
      action: 'password_reset',
      targetUserId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: 'Password reset by admin'
    });

    console.log(`Admin ${callerId} reset password for user ${userId}`);

    return {
      success: true,
      message: 'Password successfully reset'
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to reset password: ${error.message}`
    );
  }
});

/**
 * Cloud Function to send password reset email (Admin only)
 * 
 * Alternative method that sends a password reset email to the user.
 */
export const adminSendPasswordResetEmail = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function.'
    );
  }

  const callerId = context.auth.uid;

  // Verify caller is admin
  const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
  const callerData = callerDoc.data();
  
  if (!callerData?.isAdmin && callerData?.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can send password reset emails.'
    );
  }

  // Validate input
  const { email } = data;
  
  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'email must be provided as a string.'
    );
  }

  try {
    // Generate password reset link
    const link = await admin.auth().generatePasswordResetLink(email);

    // Log the admin activity
    await admin.firestore().collection('admin_activities').add({
      adminId: callerId,
      adminEmail: context.auth.token.email || 'unknown',
      action: 'password_reset_email_sent',
      targetEmail: email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: 'Password reset email sent by admin'
    });

    console.log(`Admin ${callerId} sent password reset email to ${email}`);

    return {
      success: true,
      message: 'Password reset email sent',
      resetLink: link // Return link in case admin wants to share it directly
    };
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to send password reset email: ${error.message}`
    );
  }
});

/**
 * Cloud Function to send push notification when a new message is sent
 * Triggers when a new document is created in the messages subcollection
 */
export const sendMessageNotification = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const chatId = context.params.chatId;
    
    // Get the chat document to find the participants
    const chatDoc = await admin.firestore().collection('chats').doc(chatId).get();
    const chatData = chatDoc.data();
    
    if (!chatData) {
      console.error('Chat not found:', chatId);
      return;
    }
    
    // Find the recipient (the user who didn't send the message)
    const recipientId = chatData.participants.find((id: string) => id !== message.senderId);
    
    if (!recipientId) {
      console.error('Recipient not found in chat:', chatId);
      return;
    }
    
    // Get recipient's FCM tokens
    const recipientDoc = await admin.firestore().collection('users').doc(recipientId).get();
    const recipientData = recipientDoc.data();
    
    if (!recipientData?.fcmTokens || recipientData.fcmTokens.length === 0) {
      console.log('Recipient has no FCM tokens:', recipientId);
      return;
    }
    
    // Get sender's display name
    const senderDoc = await admin.firestore().collection('users').doc(message.senderId).get();
    const senderData = senderDoc.data();
    const senderName = senderData?.displayName || 'Someone';
    
    // Prepare notification payload
    const payload = {
      notification: {
        title: `New message from ${senderName}`,
        body: message.text || '📷 Photo',
      },
      data: {
        type: 'message',
        chatId: chatId,
        senderId: message.senderId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      }
    };
    
    // Send to all tokens
    const tokens = recipientData.fcmTokens;
    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens: tokens,
        notification: payload.notification,
        data: payload.data,
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            }
          }
        }
      });
      
      console.log(`Sent message notification to ${recipientId}:`, response.successCount, 'successful,', response.failureCount, 'failed');
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            tokensToRemove.push(tokens[idx]);
          }
        });
        
        if (tokensToRemove.length > 0) {
          await admin.firestore().collection('users').doc(recipientId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
          });
        }
      }
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  });

/**
 * Cloud Function to send push notification for new activity/event
 * Call this function when creating activities or events
 */
export const sendActivityNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function.'
    );
  }
  
  const { userIds, title, body, activityType } = data;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userIds must be a non-empty array.'
    );
  }
  
  const results = [];
  
  for (const userId of userIds) {
    try {
      // Get user's FCM tokens
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData?.fcmTokens || userData.fcmTokens.length === 0) {
        console.log('User has no FCM tokens:', userId);
        continue;
      }
      
      // Prepare notification payload
      const payload = {
        notification: {
          title: title || 'New Activity',
          body: body || 'Check out new activities!',
        },
        data: {
          type: 'activity',
          activityType: activityType || 'general',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        }
      };
      
      // Send to all tokens
      const tokens = userData.fcmTokens;
      const response = await getMessaging().sendEachForMulticast({
        tokens: tokens,
        notification: payload.notification,
        data: payload.data,
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            }
          }
        }
      });
      
      console.log(`Sent activity notification to ${userId}:`, response.successCount, 'successful,', response.failureCount, 'failed');
      results.push({
        userId,
        success: response.successCount,
        failed: response.failureCount
      });
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            tokensToRemove.push(tokens[idx]);
          }
        });
        
        if (tokensToRemove.length > 0) {
          await admin.firestore().collection('users').doc(userId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
          });
        }
      }
    } catch (error) {
      console.error(`Error sending activity notification to ${userId}:`, error);
      results.push({
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    success: true,
    results
  };
});
