
-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to dispatch push notifications
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get Supabase URL and service key from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not available, use direct values (for Cloud)
  IF supabase_url IS NULL THEN
    supabase_url := 'https://cwigkiplwauyiyogegtj.supabase.co';
  END IF;
  
  -- Only dispatch for certain notification types that warrant push
  IF NEW.type IN ('stage_started', 'stage_completed', 'eta_updated', 'ready_for_pickup', 'new_booking', 'booking_confirmed') THEN
    -- Make async HTTP call to push notification edge function
    SELECT extensions.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      body := jsonb_build_object(
        'user_id', NEW.recipient_uid::text,
        'title', NEW.title,
        'body', NEW.message,
        'url', CASE 
          WHEN NEW.booking_id IS NOT NULL THEN '/job-tracking'
          ELSE '/dashboard'
        END,
        'tag', NEW.type
      )::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_key, current_setting('request.jwt.claim.sub', true))
      )::jsonb
    ) INTO request_id;
    
    RAISE NOTICE 'Push notification dispatched for % (request_id: %)', NEW.type, request_id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Failed to dispatch push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS dispatch_push_on_notification ON public.notifications;

CREATE TRIGGER dispatch_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_push_notification();

-- Add comment for documentation
COMMENT ON FUNCTION public.dispatch_push_notification() IS 
  'Dispatches push notifications via edge function when in-app notifications are created';
