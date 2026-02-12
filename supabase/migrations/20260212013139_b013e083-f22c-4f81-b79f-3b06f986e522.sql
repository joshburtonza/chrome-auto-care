
-- Drop existing staff_profiles policies
DROP POLICY IF EXISTS "Admins can manage staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can view all staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Staff can update their own staff profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Staff can view their own staff profile" ON public.staff_profiles;

-- Recreate as PERMISSIVE policies with proper scoping

-- Staff can only SELECT their own row
CREATE POLICY "Staff can view own profile"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can SELECT all rows
CREATE POLICY "Admins can view all staff profiles"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Staff can UPDATE only their own row
CREATE POLICY "Staff can update own profile"
ON public.staff_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can do ALL operations on all rows
CREATE POLICY "Admins can manage all staff profiles"
ON public.staff_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create a security definer function that returns staff profile data
-- with emergency contacts hidden for non-admin users
CREATE OR REPLACE FUNCTION public.get_staff_profile_safe(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  start_date date,
  created_at timestamptz,
  updated_at timestamptz,
  staff_role staff_role,
  department_id uuid,
  is_primary_contact boolean,
  can_approve_pricing boolean,
  can_collect_deposits boolean,
  job_title text,
  department text,
  skills text[],
  notes text,
  responsibilities text[],
  phone_number text,
  emergency_contact_name text,
  emergency_contact_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id,
    sp.user_id,
    sp.start_date,
    sp.created_at,
    sp.updated_at,
    sp.staff_role,
    sp.department_id,
    sp.is_primary_contact,
    sp.can_approve_pricing,
    sp.can_collect_deposits,
    sp.job_title,
    sp.department,
    sp.skills,
    sp.notes,
    sp.responsibilities,
    sp.phone_number,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN sp.emergency_contact_name ELSE NULL END,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN sp.emergency_contact_phone ELSE NULL END
  FROM staff_profiles sp
  WHERE sp.user_id = p_user_id
    AND (sp.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
$$;
