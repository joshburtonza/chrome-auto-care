-- Create table for booking stage images
CREATE TABLE IF NOT EXISTS public.booking_stage_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_stage_id UUID NOT NULL REFERENCES public.booking_stages(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_stage_images ENABLE ROW LEVEL SECURITY;

-- Staff can upload images
CREATE POLICY "Staff can insert stage images"
ON public.booking_stage_images
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Staff can manage images
CREATE POLICY "Staff can manage stage images"
ON public.booking_stage_images
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Clients can view images for their bookings
CREATE POLICY "Clients can view images for their bookings"
ON public.booking_stage_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM booking_stages bs
    JOIN bookings b ON bs.booking_id = b.id
    WHERE bs.id = booking_stage_images.booking_stage_id
    AND (b.user_id = auth.uid() OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create storage bucket for stage images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-stage-images', 'booking-stage-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stage images
CREATE POLICY "Staff can upload stage images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-stage-images' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Anyone can view stage images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'booking-stage-images');

CREATE POLICY "Staff can delete stage images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'booking-stage-images' AND
  (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Add trigger for updated_at
CREATE TRIGGER update_booking_stage_images_updated_at
BEFORE UPDATE ON public.booking_stage_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();