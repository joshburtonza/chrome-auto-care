-- Create junction table for booking services (many-to-many)
CREATE TABLE public.booking_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id, service_id)
);

-- Enable RLS
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- Users can view their own booking services
CREATE POLICY "Users can view their own booking services"
ON public.booking_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_services.booking_id
    AND (bookings.user_id = auth.uid() OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Users can insert booking services for their own bookings
CREATE POLICY "Users can insert their own booking services"
ON public.booking_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_services.booking_id
    AND bookings.user_id = auth.uid()
  )
);

-- Staff can manage all booking services
CREATE POLICY "Staff can manage booking services"
ON public.booking_services
FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add index for performance
CREATE INDEX idx_booking_services_booking_id ON public.booking_services(booking_id);
CREATE INDEX idx_booking_services_service_id ON public.booking_services(service_id);