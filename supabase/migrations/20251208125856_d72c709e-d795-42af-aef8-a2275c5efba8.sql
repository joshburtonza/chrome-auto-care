-- Add phone column to profiles for WhatsApp notifications (if not already present)
-- Already exists based on schema

-- Create function to check low stock and notify managers
CREATE OR REPLACE FUNCTION public.check_low_stock_and_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  manager_record RECORD;
  manager_phone TEXT;
  item_name TEXT;
  item_qty INT;
  min_level INT;
BEGIN
  -- Only check if quantity changed and is now below minimum
  IF NEW.quantity < NEW.min_stock_level AND 
     (OLD.quantity >= OLD.min_stock_level OR OLD.quantity IS NULL OR TG_OP = 'INSERT') THEN
    
    item_name := NEW.name;
    item_qty := NEW.quantity;
    min_level := NEW.min_stock_level;
    
    -- Log the low stock alert
    RAISE NOTICE 'Low stock alert: % has % units (min: %)', item_name, item_qty, min_level;
    
    -- Insert notification for all managers/directors
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
      'low_stock_alert',
      'Low Stock Alert',
      format('%s is running low: %s units remaining (minimum: %s)', item_name, item_qty, min_level),
      'high',
      true
    FROM staff_profiles sp
    WHERE sp.staff_role IN ('manager', 'director');
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for low stock alerts
DROP TRIGGER IF EXISTS inventory_low_stock_trigger ON inventory;
CREATE TRIGGER inventory_low_stock_trigger
AFTER INSERT OR UPDATE OF quantity ON inventory
FOR EACH ROW
EXECUTE FUNCTION check_low_stock_and_notify();

-- Create table to track pending WhatsApp alerts (for batch processing)
CREATE TABLE IF NOT EXISTS public.whatsapp_alert_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  error_message text
);

-- Enable RLS
ALTER TABLE public.whatsapp_alert_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage the queue
CREATE POLICY "Admins can manage whatsapp queue"
ON public.whatsapp_alert_queue
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));