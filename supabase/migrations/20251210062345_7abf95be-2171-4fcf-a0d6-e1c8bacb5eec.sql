-- Allow clients to view addon requests for their own bookings
CREATE POLICY "Clients can view addon requests for their bookings"
ON public.addon_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = addon_requests.booking_id
    AND b.user_id = auth.uid()
  )
);