-- Create staff_invitations table for invitation tokens
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  staff_role staff_role NOT NULL DEFAULT 'technician',
  department_id UUID REFERENCES departments(id),
  job_title TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage staff invitations"
ON public.staff_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Anyone can view valid invitations by token (for signup validation)
CREATE POLICY "Anyone can view invitation by token"
ON public.staff_invitations
FOR SELECT
USING (true);

-- Create index for token lookup
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);