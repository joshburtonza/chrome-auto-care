-- Create function to notify client when addon request is approved/rejected
CREATE OR REPLACE FUNCTION public.notify_client_addon_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_name TEXT;
  vehicle_name TEXT;
  booking_owner UUID;
  booking_vehicle_id UUID;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only trigger when status changes from pending to approved/rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Get service info
    SELECT s.title INTO service_name
    FROM services s
    WHERE s.id = NEW.service_id;

    -- Get booking owner and vehicle info
    SELECT b.user_id, b.vehicle_id, CONCAT(v.make, ' ', v.model) 
    INTO booking_owner, booking_vehicle_id, vehicle_name
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.id = NEW.booking_id;

    IF NEW.status = 'approved' THEN
      notification_type := 'addon_approved';
      notification_title := 'Add-on Approved';
      notification_message := format('Your request to add %s (R%s) to your %s has been approved!', 
        service_name,
        NEW.requested_price::TEXT,
        vehicle_name
      );
    ELSE
      notification_type := 'addon_rejected';
      notification_title := 'Add-on Request Declined';
      notification_message := format('Your request to add %s to your %s was declined. %s', 
        service_name,
        vehicle_name,
        COALESCE('Reason: ' || NEW.rejection_reason, 'Please rebook for a later time.')
      );
    END IF;

    -- Insert notification for the booking owner
    INSERT INTO notifications (
      recipient_uid, 
      booking_id, 
      vehicle_id,
      type, 
      title, 
      message, 
      priority
    ) VALUES (
      booking_owner,
      NEW.booking_id,
      booking_vehicle_id,
      notification_type,
      notification_title,
      notification_message,
      CASE WHEN NEW.status = 'approved' THEN 'normal' ELSE 'high' END
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for addon request decisions
CREATE TRIGGER notify_client_on_addon_decision
  AFTER UPDATE ON public.addon_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_addon_decision();