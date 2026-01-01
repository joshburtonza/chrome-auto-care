-- Add image_url column to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to merchandise table  
ALTER TABLE public.merchandise ADD COLUMN IF NOT EXISTS image_url TEXT;