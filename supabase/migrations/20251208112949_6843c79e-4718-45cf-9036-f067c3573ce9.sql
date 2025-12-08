-- Create enum for staff hierarchy roles
CREATE TYPE public.staff_role AS ENUM (
  'technician',
  'senior_technician', 
  'team_lead',
  'supervisor',
  'manager',
  'director'
);

-- Add staff_role column to staff_profiles
ALTER TABLE public.staff_profiles 
ADD COLUMN staff_role staff_role DEFAULT 'technician';

-- Enable realtime for staff_profiles and inventory
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;