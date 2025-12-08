import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  notify_stage_updates: boolean;
  notify_booking_confirmations: boolean;
  notify_eta_updates: boolean;
  notify_ready_for_pickup: boolean;
  notify_promotions: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Create default preferences if none exist
      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(newPrefs);
      } else {
        setPreferences(data);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updatePreferences = useCallback(async (
    updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<NotificationPreferences | null> => {
    if (!user) return null;

    try {
      const { data, error: updateError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updates,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (updateError) throw updateError;
      setPreferences(data);
      return data;
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      throw err;
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    refresh: fetchPreferences,
    updatePreferences,
  };
};
