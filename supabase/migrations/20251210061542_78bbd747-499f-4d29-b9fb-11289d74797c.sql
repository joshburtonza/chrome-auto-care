-- Create addon_requests table for service add-on approval workflow
CREATE TABLE public.addon_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  requested_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.addon_requests ENABLE ROW LEVEL SECURITY;

-- Staff can view all addon requests
CREATE POLICY "Staff can view all addon requests"
ON public.addon_requests
FOR SELECT
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Staff can create addon requests
CREATE POLICY "Staff can create addon requests"
ON public.addon_requests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Only admins can update addon requests (approve/reject)
CREATE POLICY "Admins can update addon requests"
ON public.addon_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for addon_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.addon_requests;