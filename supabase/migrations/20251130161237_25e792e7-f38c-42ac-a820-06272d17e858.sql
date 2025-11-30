-- Add payment tracking columns to bookings table
ALTER TABLE bookings 
ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN payment_amount numeric,
ADD COLUMN yoco_checkout_id text,
ADD COLUMN yoco_payment_id text,
ADD COLUMN payment_date timestamp with time zone;

-- Create index for faster payment lookups
CREATE INDEX idx_bookings_yoco_checkout_id ON bookings(yoco_checkout_id);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);