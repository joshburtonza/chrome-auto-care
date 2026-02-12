
-- Allow admins to insert vehicles for any user (walk-in customers)
CREATE POLICY "Admins can insert vehicles for any user"
ON public.vehicles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any vehicle
CREATE POLICY "Admins can update any vehicle"
ON public.vehicles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any profile (for walk-in phone/address)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
