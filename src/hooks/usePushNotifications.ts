import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
  iosInstructions: boolean;
}

// Cache for VAPID key
let cachedVapidKey: string | null = null;

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
    iosInstructions: false,
  });

  // Fetch VAPID public key from edge function
  const getVapidKey = useCallback(async (): Promise<string | null> => {
    if (cachedVapidKey) return cachedVapidKey;
    
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (error || !data?.publicKey) {
        console.error('[Push] Failed to get VAPID key:', error);
        return null;
      }
      cachedVapidKey = data.publicKey;
      return data.publicKey;
    } catch (error) {
      console.error('[Push] Error fetching VAPID key:', error);
      return null;
    }
  }, []);

  // Detect iOS
  const isIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  // Check if running as installed PWA
  const isInstalledPWA = useCallback(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }, []);

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    // iOS requires PWA to be installed for push to work
    if (isIOS() && !isInstalledPWA()) {
      console.log('[Push] iOS detected but not installed as PWA');
      return false;
    }
    
    return hasServiceWorker && hasPushManager && hasNotification;
  }, [isIOS, isInstalledPWA]);

  // Register push service worker
  const registerPushServiceWorker = useCallback(async () => {
    try {
      // First check if there's an existing service worker
      const existingReg = await navigator.serviceWorker.getRegistration();
      if (existingReg) {
        console.log('[Push] Using existing service worker');
        return existingReg;
      }
      
      // Register the push-specific service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/'
      });
      
      console.log('[Push] Service worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('[Push] Service worker registration failed:', error);
      throw error;
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const isSupported = checkSupport();
    const showIosInstructions = isIOS() && !isInstalledPWA();
    
    if (!isSupported) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isSupported: false,
        iosInstructions: showIosInstructions,
      }));
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
        iosInstructions: false,
      });
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, checkSupport, isIOS, isInstalledPWA]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    // Show iOS instructions if needed
    if (isIOS() && !isInstalledPWA()) {
      setState(prev => ({ ...prev, iosInstructions: true }));
      return false;
    }
    
    if (!checkSupport()) return false;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false, permission }));
        return false;
      }

      // Register/get service worker
      const registration = await registerPushServiceWorker();
      await navigator.serviceWorker.ready;

      // Get VAPID key from edge function
      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        console.error('VAPID public key not configured');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
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
        iosInstructions: false,
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, checkSupport, isIOS, isInstalledPWA, registerPushServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Get current subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

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

  // Dismiss iOS instructions
  const dismissIosInstructions = useCallback(() => {
    setState(prev => ({ ...prev, iosInstructions: false }));
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
    dismissIosInstructions,
    isIOS: isIOS(),
    isInstalledPWA: isInstalledPWA(),
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
