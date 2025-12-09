-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Only dispatch for certain notification types that warrant push
  IF NEW.type IN ('stage_started', 'stage_completed', 'eta_updated', 'ready_for_pickup', 'new_booking', 'booking_confirmed') THEN
    BEGIN
      -- Get Supabase URL from environment or use default
      supabase_url := 'https://cwigkiplwauyiyogegtj.supabase.co';
      
      -- Attempt to make async HTTP call to push notification edge function
      -- Using net.http_post from the net extension if available
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', NEW.recipient_uid::text,
          'title', NEW.title,
          'body', NEW.message,
          'url', CASE 
            WHEN NEW.booking_id IS NOT NULL THEN '/job-tracking'
            ELSE '/dashboard'
          END,
          'tag', NEW.type
        )
      );
      
      RAISE NOTICE 'Push notification dispatched for %', NEW.type;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the trigger - notifications should still be created
        RAISE WARNING 'Failed to dispatch push notification: % (this is non-critical)', SQLERRM;
    END;
  END IF;
  
  -- Always return NEW to ensure the notification insert succeeds
  RETURN NEW;
END;
$function$;