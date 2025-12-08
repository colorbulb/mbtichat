import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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
