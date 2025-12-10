-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  points_value INTEGER NOT NULL DEFAULT 0,
  discount_percentage INTEGER,
  discount_amount NUMERIC,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create promo_code_redemptions table to track who used what
CREATE TABLE public.promo_code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  points_awarded INTEGER,
  UNIQUE(promo_code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Promo codes policies
CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Redemptions policies
CREATE POLICY "Users can view their own redemptions"
ON public.promo_code_redemptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can redeem promo codes"
ON public.promo_code_redemptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON public.promo_code_redemptions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Function to redeem promo code and award points
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_user_id UUID;
  v_already_redeemed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the promo code
  SELECT * INTO v_promo FROM promo_codes 
  WHERE UPPER(code) = UPPER(p_code) AND is_active = true;
  
  IF v_promo.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid promo code');
  END IF;
  
  -- Check expiration
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has expired');
  END IF;
  
  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has reached maximum uses');
  END IF;
  
  -- Check if already redeemed by this user
  SELECT EXISTS(
    SELECT 1 FROM promo_code_redemptions 
    WHERE promo_code_id = v_promo.id AND user_id = v_user_id
  ) INTO v_already_redeemed;
  
  IF v_already_redeemed THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already redeemed this code');
  END IF;
  
  -- Record redemption
  INSERT INTO promo_code_redemptions (promo_code_id, user_id, points_awarded)
  VALUES (v_promo.id, v_user_id, v_promo.points_value);
  
  -- Update use count
  UPDATE promo_codes SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = v_promo.id;
  
  -- Award points if applicable
  IF v_promo.points_value > 0 THEN
    -- Add transaction
    INSERT INTO loyalty_transactions (user_id, points, type, description)
    VALUES (v_user_id, v_promo.points_value, 'promo', 'Promo code: ' || v_promo.code);
    
    -- Update user points
    UPDATE loyalty_points 
    SET points = points + v_promo.points_value,
        lifetime_points = lifetime_points + v_promo.points_value,
        tier = CASE 
          WHEN lifetime_points + v_promo.points_value >= 10000 THEN 'platinum'
          WHEN lifetime_points + v_promo.points_value >= 5000 THEN 'gold'
          WHEN lifetime_points + v_promo.points_value >= 2000 THEN 'silver'
          ELSE 'bronze'
        END,
        updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'points_awarded', v_promo.points_value,
    'description', v_promo.description
  );
END;
$$;