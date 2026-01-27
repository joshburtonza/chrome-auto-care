-- Add new columns to services table for notes and add-ons
ALTER TABLE services ADD COLUMN IF NOT EXISTS notes TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS add_ons TEXT[];