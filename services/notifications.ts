import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, messaging } from './firebase';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // You'll need to generate this from Firebase Console

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private isNative: boolean;
  
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initialize push notifications
   */
  async initialize(userId: string): Promise<void> {
    try {
      if (this.isNative) {
        await this.initializeNativePush(userId);
      } else {
        await this.initializeWebPush(userId);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      throw error;
    }
  }

  /**
   * Initialize native push notifications (iOS/Android)
   */
  private async initializeNativePush(userId: string): Promise<void> {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    
    if (permStatus.receive !== 'granted') {
      throw new Error('User denied permissions!');
    }
    
    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();
    
    // Listen for registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      await this.saveFCMToken(userId, token.value);
    });
    
    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });
    
    // Listen for push notifications received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
      this.handleNotification({
        title: notification.title || 'New notification',
        body: notification.body || '',
        data: notification.data
      });
    });
    
    // Listen for push notifications tapped
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification);
      this.handleNotificationTap(notification.notification.data);
    });
  }

  /**
   * Initialize web push notifications (browser)
   */
  private async initializeWebPush(userId: string): Promise<void> {
    if (!messaging) {
      console.warn('Firebase messaging not supported on this browser');
      return;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Get FCM token
    const token = await getToken(messaging as Messaging, { 
      vapidKey: VAPID_KEY 
    });
    
    console.log('FCM Token:', token);
    await this.saveFCMToken(userId, token);

    // Handle foreground messages
    onMessage(messaging as Messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      this.handleNotification({
        title: payload.notification?.title || 'New notification',
        body: payload.notification?.body || '',
        data: payload.data
      });
    });
  }

  /**
   * Save FCM token to user document
   */
  private async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString()
      });
      console.log('FCM token saved successfully');
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  /**
   * Handle notification display
   */
  private handleNotification(payload: NotificationPayload): void {
    // Show notification in the app or browser
    if (!this.isNative && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        icon: '/apple-touch-icon.png',
        badge: '/favicon-32x32.png',
        data: payload.data
      });
    }
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(data: Record<string, any>): void {
    console.log('Notification tapped with data:', data);
    
    // Navigate based on notification type
    if (data?.type === 'message' && data?.chatId) {
      window.location.href = `/chat/${data.chatId}`;
    } else if (data?.type === 'activity') {
      window.location.href = '/events';
    } else if (data?.type === 'match') {
      window.location.href = '/discover';
    }
  }

  /**
   * Remove FCM token when user logs out
   */
  async removeToken(userId: string): Promise<void> {
    if (this.isNative) {
      // Remove all listeners
      await PushNotifications.removeAllListeners();
    }
    // Note: We keep the token in Firestore for potential re-registration
    console.log('Notification listeners removed');
  }
}

export const notificationService = new NotificationService();
