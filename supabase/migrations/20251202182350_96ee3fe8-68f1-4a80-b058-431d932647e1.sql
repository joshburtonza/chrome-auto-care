-- Add image_url column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS image_url text;