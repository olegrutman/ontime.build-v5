import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported || !user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      
      if (subscription) {
        // Check if subscription is still valid in database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();
        
        if (!data) {
          // Subscription exists locally but not in database, re-subscribe
          await subscription.unsubscribe();
          setIsSubscribed(false);
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }, [isSupported, user]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || permission !== 'granted') return false;

    setLoading(true);
    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // Wait for service worker to be ready
      registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const { data: vapidKey } = await supabase.functions.invoke('get-vapid-key');
      
      if (!vapidKey?.publicKey) {
        throw new Error('VAPID public key not available');
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey),
      });

      // Store subscription in database
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.keys.p256dh,
          auth_key: subscriptionData.keys.auth,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, user, permission]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return false;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, user]);

  const testNotification = useCallback(async () => {
    if (!isSupported || permission !== 'granted') return;

    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user?.id,
          title: 'Test Notification',
          body: 'This is a test notification from Ontime.Build',
          url: window.location.href,
        },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, [isSupported, permission, user]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
    checkSubscriptionStatus,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}