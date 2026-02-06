-- Phase 1: Database Schema Updates

-- 1.1 Add new staff roles to enum
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'lead_manager';
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'admin_support';
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'reception';

-- 1.2 Enhance staff_profiles table with new columns
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS responsibilities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_primary_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_approve_pricing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_collect_deposits BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 1.3 Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT NOT NULL DEFAULT 'whatsapp',
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year TEXT,
  vehicle_color TEXT,
  service_interest TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quoted_amount NUMERIC,
  deposit_amount NUMERIC,
  deposit_paid_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_to_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON public.leads(next_follow_up_at);

-- Enable RLS on leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads table
CREATE POLICY "Staff can view all leads"
ON public.leads FOR SELECT
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can create leads"
ON public.leads FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update leads"
ON public.leads FOR UPDATE
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can delete leads"
ON public.leads FOR DELETE
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- 1.4 Create lead_activities table
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);

-- Enable RLS on lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_activities
CREATE POLICY "Staff can view lead activities"
ON public.lead_activities FOR SELECT
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can create lead activities"
ON public.lead_activities FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- 1.5 Add stage_name column to booking_stages
ALTER TABLE public.booking_stages
ADD COLUMN IF NOT EXISTS stage_name TEXT;

-- 1.6 Update create_booking_stages trigger function for dynamic stages
CREATE OR REPLACE FUNCTION public.create_booking_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  template_id_var UUID;
  stage_record RECORD;
  stage_counter INT := 1;
BEGIN
  -- Find template linked to this service
  SELECT pt.id INTO template_id_var
  FROM process_templates pt
  WHERE pt.service_id = NEW.service_id
    AND pt.is_active = true
  LIMIT 1;
  
  -- If no service-specific template, use default
  IF template_id_var IS NULL THEN
    SELECT pt.id INTO template_id_var
    FROM process_templates pt
    WHERE pt.is_default = true
      AND pt.is_active = true
    LIMIT 1;
  END IF;
  
  -- If template found, copy its stages
  IF template_id_var IS NOT NULL THEN
    FOR stage_record IN
      SELECT stage_name, stage_order, description, requires_photo, estimated_duration_minutes
      FROM process_template_stages
      WHERE template_id = template_id_var
      ORDER BY stage_order
    LOOP
      INSERT INTO booking_stages (
        booking_id, 
        stage, 
        stage_order, 
        stage_name,
        completed,
        notes
      )
      VALUES (
        NEW.id,
        'vehicle_checkin',
        stage_record.stage_order,
        stage_record.stage_name,
        false,
        stage_record.description
      );
      stage_counter := stage_counter + 1;
    END LOOP;
    
    -- Store template_id on booking
    UPDATE bookings SET template_id = template_id_var WHERE id = NEW.id;
  ELSE
    -- Fallback: create default 10 stages with stage_name
    INSERT INTO booking_stages (booking_id, stage, stage_order, stage_name, completed)
    VALUES
      (NEW.id, 'vehicle_checkin', 1, 'Vehicle Check-in', false),
      (NEW.id, 'stripping', 2, 'Stripping', false),
      (NEW.id, 'surface_prep', 3, 'Surface Preparation', false),
      (NEW.id, 'paint_correction', 4, 'Paint Correction', false),
      (NEW.id, 'ppf_installation', 5, 'PPF Installation', false),
      (NEW.id, 'reassembly', 6, 'Reassembly', false),
      (NEW.id, 'qc1', 7, 'Quality Control 1', false),
      (NEW.id, 'final_detail', 8, 'Final Detail', false),
      (NEW.id, 'qc2', 9, 'Quality Control 2', false),
      (NEW.id, 'delivery_prep', 10, 'Delivery Prep', false);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 1.7 Create trigger for lead notifications
CREATE OR REPLACE FUNCTION public.notify_staff_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If lead is assigned, notify that staff member
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (
      recipient_uid,
      type,
      title,
      message,
      priority,
      action_required
    ) VALUES (
      NEW.assigned_to,
      'new_lead',
      'New Lead Assigned',
      format('New lead from %s: %s %s %s', 
        NEW.source,
        COALESCE(NEW.vehicle_year, ''),
        COALESCE(NEW.vehicle_make, ''),
        COALESCE(NEW.vehicle_model, 'Unknown vehicle')
      ),
      CASE WHEN NEW.priority = 'urgent' THEN 'high' ELSE 'normal' END,
      true
    );
  ELSE
    -- If unassigned, notify all staff with lead_manager role
    INSERT INTO notifications (
      recipient_uid,
      type,
      title,
      message,
      priority,
      action_required
    )
    SELECT 
      sp.user_id,
      'new_lead',
      'New Unassigned Lead',
      format('New %s lead from %s: %s', 
        NEW.priority,
        NEW.source,
        NEW.name
      ),
      'high',
      true
    FROM staff_profiles sp
    WHERE sp.staff_role = 'lead_manager';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new leads
DROP TRIGGER IF EXISTS on_new_lead_notify ON public.leads;
CREATE TRIGGER on_new_lead_notify
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_new_lead();

-- 1.8 Auto-update updated_at on leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leads and lead_activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activities;