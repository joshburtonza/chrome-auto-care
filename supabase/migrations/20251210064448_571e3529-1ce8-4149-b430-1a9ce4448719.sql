-- Allow clients to insert addon requests for their own bookings
CREATE POLICY "Clients can create addon requests for their bookings"
ON public.addon_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = addon_requests.booking_id
    AND b.user_id = auth.uid()
  )
  AND requested_by = auth.uid()
);