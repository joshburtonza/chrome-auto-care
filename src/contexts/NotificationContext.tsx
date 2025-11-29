import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

export interface Notification {
  id: string;
  recipient_uid: string;
  sender_uid: string | null;
  booking_id: string | null;
  vehicle_id: string | null;
  type: 
    | 'new_booking' 
    | 'booking_confirmed' 
    | 'stage_started' 
    | 'stage_completed' 
    | 'eta_updated'
    | 'booking_completed'
    | 'ready_for_pickup'
    | 'client_inquiry'
    | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_required: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

// =====================================================
// CONTEXT
// =====================================================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// =====================================================
// PROVIDER
// =====================================================

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // =====================================================
  // FETCH NOTIFICATIONS
  // =====================================================
  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_uid', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // MARK AS READ
  // =====================================================
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;

      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read_at: now }))
      );

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        variant: 'destructive',
      });
    }
  };

  // =====================================================
  // REALTIME SUBSCRIPTION
  // =====================================================
  useEffect(() => {
    if (!user) {
      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
      return;
    }

    fetchNotifications();

    const notificationChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_uid=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          setNotifications(prev => [newNotification, ...prev]);

          const toastVariant = 
            newNotification.priority === 'urgent' || newNotification.priority === 'high' 
              ? 'destructive' 
              : 'default';

          toast({
            title: `${getNotificationIcon(newNotification.type)} ${newNotification.title}`,
            description: newNotification.message,
            variant: toastVariant,
          });

          playNotificationSound(newNotification.priority);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_uid=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          setNotifications(prev =>
            prev.map(notif =>
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
          );
        }
      )
      .subscribe();

    setChannel(notificationChannel);

    return () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }
    };
  }, [user]);

  // =====================================================
  // COMPUTED VALUES
  // =====================================================
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // =====================================================
  // CONTEXT VALUE
  // =====================================================
  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'new_booking':
      return '📅';
    case 'stage_started':
      return '🔧';
    case 'stage_completed':
      return '✅';
    case 'ready_for_pickup':
      return '🎉';
    case 'eta_updated':
      return '📆';
    case 'booking_confirmed':
      return '👍';
    case 'system_alert':
      return '⚠️';
    default:
      return '🔔';
  }
}

function playNotificationSound(priority: Notification['priority']) {
  if (priority !== 'high' && priority !== 'urgent') return;

  const audio = new Audio('/notification.mp3');
  audio.volume = 0.3;
  audio.play().catch(() => {
    // Ignore errors (user might not have interacted with page yet)
  });
}
