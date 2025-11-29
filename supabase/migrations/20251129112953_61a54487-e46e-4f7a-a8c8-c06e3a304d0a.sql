-- Prevent deletion of bookings that have stages
CREATE OR REPLACE FUNCTION prevent_booking_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM booking_stages WHERE booking_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete booking with existing stages. Archive it instead by setting status to cancelled.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_booking_deletion_trigger
BEFORE DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_booking_deletion();

-- Prevent deletion of booking stages once created
CREATE OR REPLACE FUNCTION prevent_stage_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Booking stages cannot be deleted. This ensures complete history tracking.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_stage_deletion_trigger
BEFORE DELETE ON booking_stages
FOR EACH ROW
EXECUTE FUNCTION prevent_stage_deletion();

-- Prevent resetting completed stages
CREATE OR REPLACE FUNCTION prevent_uncomplete_stage()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.completed = true AND NEW.completed = false THEN
    RAISE EXCEPTION 'Cannot mark a completed stage as incomplete. Stage completion is permanent.';
  END IF;
  
  IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Cannot remove completion timestamp from a completed stage.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_uncomplete_stage_trigger
BEFORE UPDATE ON booking_stages
FOR EACH ROW
EXECUTE FUNCTION prevent_uncomplete_stage();

-- Prevent deletion of stage images (protect evidence of work)
CREATE OR REPLACE FUNCTION prevent_stage_image_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow deletion if the stage itself is being deleted (cascade)
  -- But since stages can't be deleted, this effectively prevents all deletions
  IF NOT EXISTS (SELECT 1 FROM booking_stages WHERE id = OLD.booking_stage_id) THEN
    RETURN OLD; -- Allow if stage doesn't exist (cleanup)
  END IF;
  
  RAISE EXCEPTION 'Stage images cannot be deleted. They serve as permanent work documentation.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_stage_image_deletion_trigger
BEFORE DELETE ON booking_stage_images
FOR EACH ROW
EXECUTE FUNCTION prevent_stage_image_deletion();

-- Create an audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS public.booking_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  stage_id UUID REFERENCES public.booking_stages(id),
  action TEXT NOT NULL,
  changed_by UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.booking_audit_log ENABLE ROW LEVEL SECURITY;

-- Staff and admins can view audit logs
CREATE POLICY "Staff can view audit logs"
ON public.booking_audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Clients can view audit logs for their bookings
CREATE POLICY "Clients can view their booking audit logs"
ON public.booking_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_audit_log.booking_id
    AND b.user_id = auth.uid()
  )
);

-- Trigger to log stage updates
CREATE OR REPLACE FUNCTION log_stage_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_audit_log (
    booking_id,
    stage_id,
    action,
    changed_by,
    old_values,
    new_values
  )
  VALUES (
    NEW.booking_id,
    NEW.id,
    TG_OP,
    auth.uid(),
    row_to_json(OLD)::jsonb,
    row_to_json(NEW)::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_stage_changes_trigger
AFTER UPDATE ON booking_stages
FOR EACH ROW
EXECUTE FUNCTION log_stage_changes();

-- Trigger to log booking status changes
CREATE OR REPLACE FUNCTION log_booking_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR 
     OLD.estimated_completion IS DISTINCT FROM NEW.estimated_completion THEN
    INSERT INTO booking_audit_log (
      booking_id,
      action,
      changed_by,
      old_values,
      new_values
    )
    VALUES (
      NEW.id,
      'booking_update',
      auth.uid(),
      jsonb_build_object(
        'status', OLD.status,
        'estimated_completion', OLD.estimated_completion
      ),
      jsonb_build_object(
        'status', NEW.status,
        'estimated_completion', NEW.estimated_completion
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_booking_changes_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION log_booking_changes();

-- Add index for better audit log performance
CREATE INDEX idx_audit_log_booking_id ON booking_audit_log(booking_id);
CREATE INDEX idx_audit_log_timestamp ON booking_audit_log(timestamp DESC);