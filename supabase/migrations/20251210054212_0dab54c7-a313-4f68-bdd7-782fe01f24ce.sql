-- The service_availability table already has service_id column
-- Let's ensure it has proper constraints and update existing data

-- Make sure each service has availability entries
-- First, let's add a unique constraint on service_id + date if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'service_availability_service_date_unique'
  ) THEN
    ALTER TABLE service_availability 
    ADD CONSTRAINT service_availability_service_date_unique 
    UNIQUE (service_id, date);
  END IF;
END $$;

-- Add a color column to services table for visual differentiation
ALTER TABLE services ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

-- Set default colors based on category
UPDATE services SET color = '#3b82f6' WHERE category ILIKE '%protection%' AND color IS NULL;  -- Blue for protection/PPF
UPDATE services SET color = '#8b5cf6' WHERE category ILIKE '%enhancement%' AND color IS NULL; -- Purple for enhancement
UPDATE services SET color = '#10b981' WHERE category ILIKE '%detailing%' AND color IS NULL;   -- Green for detailing
UPDATE services SET color = '#f59e0b' WHERE category ILIKE '%paint%' AND color IS NULL;       -- Orange for paint related

-- Set a default fallback color for any remaining
UPDATE services SET color = '#6b7280' WHERE color IS NULL;