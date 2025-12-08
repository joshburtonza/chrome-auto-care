import { useEffect } from 'react';
import { Bell, MessageSquare, Smartphone, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export const NotificationSettings = () => {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    isLoading: pushLoading,
  } = usePushNotifications();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
      toast.success('Preferences updated');
    } catch {
      toast.error('Failed to update preferences');
    }
  };

  const handlePushToggle = async () => {
    try {
      if (pushSubscribed) {
        await unsubscribePush();
        toast.success('Push notifications disabled');
      } else {
        const success = await subscribePush();
        if (success) {
          toast.success('Push notifications enabled');
        } else if (pushPermission === 'denied') {
          toast.error('Notifications blocked. Please enable in browser settings.');
        }
      }
    } catch {
      toast.error('Failed to update push notification settings');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-4">Notification Channels</h4>
        <div className="space-y-4">
          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  {!pushSupported 
                    ? 'Not supported on this device'
                    : pushPermission === 'denied'
                    ? 'Blocked in browser settings'
                    : 'Receive alerts on this device'}
                </p>
              </div>
            </div>
            {pushSupported && pushPermission !== 'denied' && (
              <Switch
                checked={pushSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={pushLoading}
              />
            )}
          </div>

          {/* WhatsApp */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-success" />
              </div>
              <div>
                <Label className="text-sm font-medium">WhatsApp</Label>
                <p className="text-xs text-muted-foreground">
                  Receive updates via WhatsApp
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.whatsapp_enabled || false}
              onCheckedChange={(checked) => handleToggle('whatsapp_enabled', checked)}
            />
          </div>

          {/* In-App */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/50 flex items-center justify-center">
                <Bell className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <Label className="text-sm font-medium">In-App Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Show notifications in the app
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.in_app_enabled ?? true}
              onCheckedChange={(checked) => handleToggle('in_app_enabled', checked)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Notification Types */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-4">Notification Types</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm">Stage Updates</Label>
              <p className="text-xs text-muted-foreground">
                When work starts or completes on your vehicle
              </p>
            </div>
            <Switch
              checked={preferences?.notify_stage_updates ?? true}
              onCheckedChange={(checked) => handleToggle('notify_stage_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm">Booking Confirmations</Label>
              <p className="text-xs text-muted-foreground">
                When your booking is confirmed
              </p>
            </div>
            <Switch
              checked={preferences?.notify_booking_confirmations ?? true}
              onCheckedChange={(checked) => handleToggle('notify_booking_confirmations', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm">ETA Updates</Label>
              <p className="text-xs text-muted-foreground">
                When estimated completion date changes
              </p>
            </div>
            <Switch
              checked={preferences?.notify_eta_updates ?? true}
              onCheckedChange={(checked) => handleToggle('notify_eta_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm">Ready for Pickup</Label>
              <p className="text-xs text-muted-foreground">
                When your vehicle is ready
              </p>
            </div>
            <Switch
              checked={preferences?.notify_ready_for_pickup ?? true}
              onCheckedChange={(checked) => handleToggle('notify_ready_for_pickup', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm">Promotions</Label>
              <p className="text-xs text-muted-foreground">
                Special offers and discounts
              </p>
            </div>
            <Switch
              checked={preferences?.notify_promotions ?? false}
              onCheckedChange={(checked) => handleToggle('notify_promotions', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
