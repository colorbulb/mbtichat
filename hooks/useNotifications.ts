import { useEffect } from 'react';
import { notificationService } from '../services/notifications';

/**
 * Hook to initialize push notifications for the current user
 */
export const useNotifications = (userId: string | null) => {
  useEffect(() => {
    if (!userId) return;

    let initialized = false;

    const initNotifications = async () => {
      try {
        await notificationService.initialize(userId);
        initialized = true;
        console.log('Push notifications initialized for user:', userId);
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    };

    initNotifications();

    return () => {
      if (initialized && userId) {
        notificationService.removeToken(userId).catch(console.error);
      }
    };
  }, [userId]);
};
