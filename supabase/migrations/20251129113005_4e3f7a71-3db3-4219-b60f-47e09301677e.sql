-- Fix search_path security warnings by updating functions

CREATE OR REPLACE FUNCTION prevent_booking_deletion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM booking_stages WHERE booking_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete booking with existing stages. Archive it instead by setting status to cancelled.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_stage_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Booking stages cannot be deleted. This ensures complete history tracking.';
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_uncomplete_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.completed = true AND NEW.completed = false THEN
    RAISE EXCEPTION 'Cannot mark a completed stage as incomplete. Stage completion is permanent.';
  END IF;
  
  IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'Cannot remove completion timestamp from a completed stage.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_stage_image_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow deletion if the stage itself is being deleted (cascade)
  -- But since stages can't be deleted, this effectively prevents all deletions
  IF NOT EXISTS (SELECT 1 FROM booking_stages WHERE id = OLD.booking_stage_id) THEN
    RETURN OLD; -- Allow if stage doesn't exist (cleanup)
  END IF;
  
  RAISE EXCEPTION 'Stage images cannot be deleted. They serve as permanent work documentation.';
  RETURN NULL;
END;
$$;