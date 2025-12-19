-- Create trigger for referral completion automation
CREATE OR REPLACE FUNCTION process_referral_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referral_record referrals%ROWTYPE;
BEGIN
  -- Only process when booking status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Find any pending/registered referral for this user
    SELECT * INTO referral_record
    FROM referrals
    WHERE referred_user_id = NEW.user_id
      AND status IN ('registered', 'pending')
    LIMIT 1;
    
    IF FOUND THEN
      -- Update referral to rewarded
      UPDATE referrals
      SET status = 'rewarded',
          completed_at = now()
      WHERE id = referral_record.id;
      
      -- Award points to referrer
      INSERT INTO loyalty_transactions (user_id, points, type, description)
      VALUES (referral_record.referrer_id, referral_record.reward_points, 'referral', 'Referral bonus - friend completed first booking');
      
      -- Update referrer's loyalty points
      UPDATE loyalty_points
      SET points = points + referral_record.reward_points,
          lifetime_points = lifetime_points + referral_record.reward_points,
          tier = CASE 
            WHEN lifetime_points + referral_record.reward_points >= 10000 THEN 'platinum'
            WHEN lifetime_points + referral_record.reward_points >= 5000 THEN 'gold'
            WHEN lifetime_points + referral_record.reward_points >= 2000 THEN 'silver'
            ELSE 'bronze'
          END,
          updated_at = now()
      WHERE user_id = referral_record.referrer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS on_booking_completed_award_referral ON bookings;
CREATE TRIGGER on_booking_completed_award_referral
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_completion();

-- Create gallery-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-images', 'gallery-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gallery-images bucket
CREATE POLICY "Anyone can view gallery images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery-images');

CREATE POLICY "Staff can upload gallery images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery-images' 
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can update gallery images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery-images' 
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Staff can delete gallery images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'gallery-images' 
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);