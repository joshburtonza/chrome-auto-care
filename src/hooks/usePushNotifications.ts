import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    
    return isSupported;
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!user || !checkSupport()) {
      setState(prev => ({ ...prev, isLoading: false, isSupported: checkSupport() }));
      return;
    }

    try {
      const permission = Notification.permission;
      
      // Check if we have a subscription in the database
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id);

      setState({
        isSupported: true,
        isSubscribed: (subscriptions?.length ?? 0) > 0,
        isLoading: false,
        permission,
      });
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, checkSupport]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user || !checkSupport()) return false;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false, permission }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJson = subscription.toJSON();
      
      // Save subscription to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh_key: subscriptionJson.keys!.p256dh,
        auth_key: subscriptionJson.keys!.auth,
        device_info: navigator.userAgent,
      }, {
        onConflict: 'user_id,endpoint',
      });

      if (error) {
        console.error('Error saving push subscription:', error);
        throw error;
      }

      // Update notification preferences
      await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        push_enabled: true,
      }, {
        onConflict: 'user_id',
      });

      setState({
        isSupported: true,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, checkSupport]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Get current subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      // Update preferences
      await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        push_enabled: false,
      }, {
        onConflict: 'user_id',
      });

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
  };
};

// Helper function to convert base64 to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
