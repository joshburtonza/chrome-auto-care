
-- =============================================
-- PHASE 1: DEPARTMENTS SYSTEM
-- =============================================

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  manager_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS policies for departments
CREATE POLICY "Anyone can view active departments"
ON public.departments FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add department_id to staff_profiles
ALTER TABLE public.staff_profiles 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 2: PROCESS TEMPLATES SYSTEM
-- =============================================

-- Create process_templates table
CREATE TABLE public.process_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on process_templates
ALTER TABLE public.process_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for process_templates
CREATE POLICY "Anyone can view active templates"
ON public.process_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Staff can manage templates"
ON public.process_templates FOR ALL
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Create process_template_stages table
CREATE TABLE public.process_template_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.process_templates(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  description TEXT,
  requires_photo BOOLEAN DEFAULT false,
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on process_template_stages
ALTER TABLE public.process_template_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies for process_template_stages
CREATE POLICY "Anyone can view template stages"
ON public.process_template_stages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.process_templates 
  WHERE id = process_template_stages.template_id AND is_active = true
));

CREATE POLICY "Staff can manage template stages"
ON public.process_template_stages FOR ALL
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Add template_id to bookings table
ALTER TABLE public.bookings 
ADD COLUMN template_id UUID REFERENCES public.process_templates(id) ON DELETE SET NULL;

-- =============================================
-- PHASE 3: PWA PUSH NOTIFICATIONS
-- =============================================

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id);

-- =============================================
-- PHASE 4: NOTIFICATION PREFERENCES
-- =============================================

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  notify_stage_updates BOOLEAN DEFAULT true,
  notify_booking_confirmations BOOLEAN DEFAULT true,
  notify_eta_updates BOOLEAN DEFAULT true,
  notify_ready_for_pickup BOOLEAN DEFAULT true,
  notify_promotions BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY "Users can manage their own preferences"
ON public.notification_preferences FOR ALL
USING (auth.uid() = user_id);

-- =============================================
-- INSERT DEFAULT DEPARTMENTS
-- =============================================

INSERT INTO public.departments (name, description) VALUES
  ('Detailing', 'Vehicle detailing and cleaning services'),
  ('PPF Installation', 'Paint protection film installation'),
  ('Paint Correction', 'Paint correction and polishing'),
  ('Ceramic Coating', 'Ceramic coating application'),
  ('Quality Control', 'Quality assurance and final inspection'),
  ('Administration', 'Office and administrative tasks');

-- =============================================
-- INSERT DEFAULT PROCESS TEMPLATE
-- =============================================

INSERT INTO public.process_templates (name, description, is_default, is_active) VALUES
  ('Standard PPF Workflow', 'Default 10-stage workflow for PPF installation services', true, true);

-- Get the template ID and insert stages
DO $$
DECLARE
  template_uuid UUID;
BEGIN
  SELECT id INTO template_uuid FROM public.process_templates WHERE is_default = true LIMIT 1;
  
  INSERT INTO public.process_template_stages (template_id, stage_name, stage_order, description, requires_photo, estimated_duration_minutes) VALUES
    (template_uuid, 'Vehicle Check-in', 1, 'Initial vehicle inspection and documentation', true, 30),
    (template_uuid, 'Stripping', 2, 'Remove existing protection and accessories', false, 60),
    (template_uuid, 'Surface Prep', 3, 'Clean and prepare surfaces for application', false, 90),
    (template_uuid, 'Paint Correction', 4, 'Polish and correct paint imperfections', false, 120),
    (template_uuid, 'PPF Installation', 5, 'Apply paint protection film', true, 240),
    (template_uuid, 'Reassembly', 6, 'Reinstall removed components', false, 60),
    (template_uuid, 'QC Round 1', 7, 'First quality control inspection', true, 30),
    (template_uuid, 'Final Detail', 8, 'Final cleaning and detailing', false, 45),
    (template_uuid, 'QC Round 2', 9, 'Final quality control inspection', true, 30),
    (template_uuid, 'Delivery Prep', 10, 'Prepare vehicle for customer pickup', true, 30);
END $$;

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Add updated_at trigger for new tables
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_process_templates_updated_at
  BEFORE UPDATE ON public.process_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CREATE NOTIFICATION PREFERENCES ON USER SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default client role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  -- Create default notification preferences
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;
