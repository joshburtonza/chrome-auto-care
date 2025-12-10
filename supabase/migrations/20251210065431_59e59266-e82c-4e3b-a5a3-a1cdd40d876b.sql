-- Allow clients to delete their own pending addon requests
CREATE POLICY "Clients can delete their pending addon requests"
ON public.addon_requests
FOR DELETE
USING (
  status = 'pending'
  AND requested_by = auth.uid()
);