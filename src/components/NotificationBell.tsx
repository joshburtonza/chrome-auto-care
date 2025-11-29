import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/contexts/NotificationContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    if (notification.booking_id) {
      const isStaff = window.location.pathname.includes('/staff');
      
      if (isStaff) {
        navigate('/staff/bookings');
      } else {
        navigate('/job-tracking');
      }
    }

    setIsOpen(false);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[600px] overflow-hidden rounded-lg bg-card shadow-xl ring-1 ring-border z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                  />
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2 text-center">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-primary hover:text-primary/80"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const isUnread = !notification.read_at;
  const timeAgo = getTimeAgo(notification.created_at);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 transition-colors
        hover:bg-accent
        ${isUnread ? 'bg-accent/50' : 'bg-card'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          flex-shrink-0 rounded-full p-2
          ${getPriorityColor(notification.priority)}
        `}>
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.title}
            </p>
            {isUnread && (
              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {notification.action_required && (
              <span className="inline-flex items-center rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                Action required
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function getNotificationIcon(type: Notification['type']) {
  const iconClass = "h-5 w-5";
  
  switch (type) {
    case 'new_booking':
      return <Bell className={iconClass} />;
    case 'stage_started':
    case 'stage_completed':
      return <Check className={iconClass} />;
    case 'ready_for_pickup':
      return <CheckCheck className={iconClass} />;
    default:
      return <Bell className={iconClass} />;
  }
}

function getPriorityColor(priority: Notification['priority']): string {
  switch (priority) {
    case 'urgent':
      return 'bg-destructive/20 text-destructive';
    case 'high':
      return 'bg-warning/20 text-warning';
    case 'normal':
      return 'bg-primary/20 text-primary';
    case 'low':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return past.toLocaleDateString();
}
