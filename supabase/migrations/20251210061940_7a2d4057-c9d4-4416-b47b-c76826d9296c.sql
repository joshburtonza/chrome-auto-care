-- Create function to notify admins of new addon requests
CREATE OR REPLACE FUNCTION public.notify_admins_addon_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_name TEXT;
  vehicle_name TEXT;
  booking_vehicle_id UUID;
BEGIN
  -- Get service and booking/vehicle info
  SELECT s.title INTO service_name
  FROM services s
  WHERE s.id = NEW.service_id;

  SELECT CONCAT(v.make, ' ', v.model), b.vehicle_id INTO vehicle_name, booking_vehicle_id
  FROM bookings b
  JOIN vehicles v ON b.vehicle_id = v.id
  WHERE b.id = NEW.booking_id;

  -- Insert notification for all admin users
  INSERT INTO notifications (
    recipient_uid, 
    booking_id, 
    vehicle_id,
    type, 
    title, 
    message, 
    priority,
    action_required
  )
  SELECT 
    ur.user_id,
    NEW.booking_id,
    booking_vehicle_id,
    'addon_request',
    'Add-on Request',
    format('Staff requested to add %s (R%s) for %s. Review and approve or reject.', 
      service_name,
      NEW.requested_price::TEXT,
      vehicle_name
    ),
    'high',
    true
  FROM user_roles ur 
  WHERE ur.role = 'admin';
  
  RETURN NEW;
END;
$$;

-- Create trigger for new addon requests
CREATE TRIGGER notify_admins_on_addon_request
  AFTER INSERT ON public.addon_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_addon_request();