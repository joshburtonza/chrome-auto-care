-- Create staff profiles table for extended employee information
CREATE TABLE public.staff_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT,
  department TEXT,
  start_date DATE,
  skills TEXT[],
  notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on staff_profiles
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Staff can view their own profile
CREATE POLICY "Staff can view their own staff profile"
ON public.staff_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Staff can update their own profile
CREATE POLICY "Staff can update their own staff profile"
ON public.staff_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all staff profiles
CREATE POLICY "Admins can view all staff profiles"
ON public.staff_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all staff profiles
CREATE POLICY "Admins can manage staff profiles"
ON public.staff_profiles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create inventory categories enum
CREATE TYPE public.inventory_category AS ENUM (
  'ppf_film',
  'vinyl',
  'adhesives',
  'cleaning_supplies',
  'polishing_compounds',
  'tools',
  'equipment',
  'safety_gear',
  'other'
);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category inventory_category NOT NULL,
  sku TEXT UNIQUE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'units',
  cost_per_unit NUMERIC(10,2),
  supplier TEXT,
  location TEXT,
  is_consumable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Staff can view inventory
CREATE POLICY "Staff can view inventory"
ON public.inventory FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Staff can manage inventory
CREATE POLICY "Staff can manage inventory"
ON public.inventory FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create inventory transactions table for tracking usage/restocking
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('restock', 'usage', 'adjustment', 'return')),
  quantity INTEGER NOT NULL,
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Staff can view inventory transactions
CREATE POLICY "Staff can view inventory transactions"
ON public.inventory_transactions FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Staff can create inventory transactions
CREATE POLICY "Staff can create inventory transactions"
ON public.inventory_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Function to update inventory quantity after transaction
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type IN ('restock', 'return') THEN
    UPDATE inventory 
    SET quantity = quantity + NEW.quantity,
        last_restocked_at = CASE WHEN NEW.transaction_type = 'restock' THEN now() ELSE last_restocked_at END,
        updated_at = now()
    WHERE id = NEW.inventory_id;
  ELSIF NEW.transaction_type = 'usage' THEN
    UPDATE inventory 
    SET quantity = quantity - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.inventory_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE inventory 
    SET quantity = NEW.quantity,
        updated_at = now()
    WHERE id = NEW.inventory_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for inventory updates
CREATE TRIGGER on_inventory_transaction
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_quantity();

-- Add updated_at triggers
CREATE TRIGGER update_staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();