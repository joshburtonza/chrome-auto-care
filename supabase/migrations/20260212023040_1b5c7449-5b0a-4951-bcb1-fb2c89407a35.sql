-- Fix staff_invitations RLS: restrict "Anyone can view invitation by token" to token-based lookup only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;

-- Create a restricted policy: only allow lookup when filtering by a specific token
-- This uses a restrictive approach - the query must include a token filter
CREATE POLICY "Lookup invitation by specific token"
ON public.staff_invitations
FOR SELECT
TO anon, authenticated
USING (
  -- Only allow access when the request includes a token equality filter
  -- This prevents enumeration while allowing token validation
  token IS NOT NULL
);

-- Actually, the above is still too permissive. Better approach: use an RPC function
-- Drop the policy we just created
DROP POLICY IF EXISTS "Lookup invitation by specific token" ON public.staff_invitations;

-- Create a server-side function for token validation instead
CREATE OR REPLACE FUNCTION public.validate_staff_invitation(p_token text)
RETURNS TABLE(
  id uuid,
  email text,
  staff_role staff_role,
  department_id uuid,
  job_title text,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    si.id,
    si.email,
    si.staff_role,
    si.department_id,
    si.job_title,
    si.expires_at,
    si.used_at
  FROM staff_invitations si
  WHERE si.token = p_token
    AND si.used_at IS NULL
    AND si.expires_at > now();
$$;