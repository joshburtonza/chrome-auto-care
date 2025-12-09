-- Add RLS policy for users to delete their own cancelled bookings
CREATE POLICY "Users can delete their own cancelled bookings"
ON public.bookings
FOR DELETE
USING (auth.uid() = user_id AND status = 'cancelled');

-- Allow cascading delete of booking_stages when parent booking is deleted
-- First drop any existing constraint and recreate with CASCADE
ALTER TABLE public.booking_stages
DROP CONSTRAINT IF EXISTS booking_stages_booking_id_fkey;

ALTER TABLE public.booking_stages
ADD CONSTRAINT booking_stages_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
ON DELETE CASCADE;

-- Also cascade delete for booking_stage_images
ALTER TABLE public.booking_stage_images
DROP CONSTRAINT IF EXISTS booking_stage_images_booking_stage_id_fkey;

ALTER TABLE public.booking_stage_images
ADD CONSTRAINT booking_stage_images_booking_stage_id_fkey
FOREIGN KEY (booking_stage_id) REFERENCES public.booking_stages(id)
ON DELETE CASCADE;

-- And for booking_audit_log
ALTER TABLE public.booking_audit_log
DROP CONSTRAINT IF EXISTS booking_audit_log_booking_id_fkey;

ALTER TABLE public.booking_audit_log
ADD CONSTRAINT booking_audit_log_booking_id_fkey
FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
ON DELETE CASCADE;

ALTER TABLE public.booking_audit_log
DROP CONSTRAINT IF EXISTS booking_audit_log_stage_id_fkey;

ALTER TABLE public.booking_audit_log
ADD CONSTRAINT booking_audit_log_stage_id_fkey
FOREIGN KEY (stage_id) REFERENCES public.booking_stages(id)
ON DELETE CASCADE;