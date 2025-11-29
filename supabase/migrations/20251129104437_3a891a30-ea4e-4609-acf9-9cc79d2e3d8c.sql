-- =====================================================
-- RACE TECHNIK: Complete Notification System
-- =====================================================

-- =====================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_uid uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_uid uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'new_booking',
    'booking_confirmed', 
    'stage_started',
    'stage_completed',
    'eta_updated',
    'booking_completed',
    'ready_for_pickup',
    'client_inquiry',
    'system_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_required BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_uid);
CREATE INDEX idx_notifications_unread ON notifications(recipient_uid, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (recipient_uid = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_uid = auth.uid())
  WITH CHECK (recipient_uid = auth.uid());

-- =====================================================
-- 3. TRIGGER FUNCTION: Notify Staff on New Booking
-- =====================================================

CREATE OR REPLACE FUNCTION notify_staff_new_booking()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  staff_count INT;
  service_name TEXT;
  vehicle_name TEXT;
BEGIN
  -- Get service and vehicle info
  SELECT s.title, CONCAT(v.make, ' ', v.model)
  INTO service_name, vehicle_name
  FROM services s, vehicles v
  WHERE s.id = NEW.service_id AND v.id = NEW.vehicle_id;

  -- Insert notification for all staff users
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
    NEW.id,
    NEW.vehicle_id,
    'new_booking',
    'New Booking Received',
    format('New %s booking for %s. Review and confirm.', 
      service_name,
      vehicle_name
    ),
    'high',
    true
  FROM user_roles ur 
  WHERE ur.role IN ('staff', 'admin');
  
  GET DIAGNOSTICS staff_count = ROW_COUNT;
  
  RAISE NOTICE 'Created % notifications for new booking %', staff_count, NEW.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_staff_new_booking ON bookings;
CREATE TRIGGER trigger_notify_staff_new_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_staff_new_booking();

-- =====================================================
-- 4. TRIGGER FUNCTION: Notify Client on Stage Updates
-- =====================================================

CREATE OR REPLACE FUNCTION notify_client_stage_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  booking_owner uuid;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  vehicle_name TEXT;
  booking_vehicle_id uuid;
BEGIN
  -- Get booking owner and related info
  SELECT 
    b.user_id,
    CONCAT(v.make, ' ', v.model),
    b.vehicle_id
  INTO booking_owner, vehicle_name, booking_vehicle_id
  FROM bookings b
  JOIN vehicles v ON b.vehicle_id = v.id
  WHERE b.id = NEW.booking_id;
  
  -- CASE 1: Stage was started
  IF NEW.started_at IS NOT NULL AND (OLD.started_at IS NULL OR OLD.started_at IS DISTINCT FROM NEW.started_at) THEN
    notification_type := 'stage_started';
    notification_title := 'Work Started';
    notification_message := format('We''ve started working on: %s for your %s', 
      NEW.stage, 
      vehicle_name
    );
    
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
      'normal'
    );
  END IF;
  
  -- CASE 2: Stage was completed
  IF NEW.completed = true AND OLD.completed = false THEN
    notification_type := 'stage_completed';
    notification_title := 'Stage Complete';
    notification_message := format('Completed: %s for your %s', 
      NEW.stage, 
      vehicle_name
    );
    
    -- Special handling for final stage
    IF NEW.stage = 'delivery_prep' THEN
      notification_type := 'ready_for_pickup';
      notification_title := 'Vehicle Ready!';
      notification_message := format('Your %s is ready for pickup!', vehicle_name);
      
      INSERT INTO notifications (
        recipient_uid,
        booking_id,
        vehicle_id,
        type,
        title,
        message,
        priority,
        action_required
      ) VALUES (
        booking_owner,
        NEW.booking_id,
        booking_vehicle_id,
        notification_type,
        notification_title,
        notification_message,
        'high',
        true
      );
    ELSE
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
        'normal'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_client_stage_update ON booking_stages;
CREATE TRIGGER trigger_notify_client_stage_update
  AFTER UPDATE ON booking_stages
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_stage_update();

-- =====================================================
-- 5. TRIGGER FUNCTION: Notify Client on ETA Updates
-- =====================================================

CREATE OR REPLACE FUNCTION notify_client_eta_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estimated_completion IS DISTINCT FROM OLD.estimated_completion THEN
    INSERT INTO notifications (
      recipient_uid,
      booking_id,
      vehicle_id,
      type,
      title,
      message,
      priority
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.vehicle_id,
      'eta_updated',
      'Estimated Completion Updated',
      format('Your booking completion date has been updated to %s', 
        TO_CHAR(NEW.estimated_completion, 'Day, DD Month YYYY')
      ),
      'normal'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_eta_update ON bookings;
CREATE TRIGGER trigger_notify_eta_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.estimated_completion IS DISTINCT FROM NEW.estimated_completion)
  EXECUTE FUNCTION notify_client_eta_update();

-- =====================================================
-- 6. HELPER FUNCTION: Mark Notification as Read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE id = notification_id
    AND recipient_uid = auth.uid()
    AND read_at IS NULL;
END;
$$;

-- =====================================================
-- 7. HELPER FUNCTION: Mark All Notifications as Read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE recipient_uid = auth.uid()
    AND read_at IS NULL;
END;
$$;

-- =====================================================
-- 8. ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- 9. GRANT NECESSARY PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;