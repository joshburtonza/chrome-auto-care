-- Add priority field to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent'));

-- Add assigned_to field to booking_stages for task assignment
ALTER TABLE public.booking_stages 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Create index for faster work queue queries
CREATE INDEX IF NOT EXISTS idx_booking_stages_assigned_to ON public.booking_stages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON public.bookings(priority);
CREATE INDEX IF NOT EXISTS idx_booking_stages_completed ON public.booking_stages(completed);

-- Update RLS policy to allow staff to see assignments
DROP POLICY IF EXISTS "Staff can view all stage assignments" ON public.booking_stages;
CREATE POLICY "Staff can view all stage assignments" 
ON public.booking_stages 
FOR SELECT 
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));