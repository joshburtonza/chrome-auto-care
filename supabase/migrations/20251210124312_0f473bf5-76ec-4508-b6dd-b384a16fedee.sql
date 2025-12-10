-- Reviews table for client feedback after service completion
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Users can view public reviews" ON public.reviews
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own reviews" ON public.reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews for their bookings" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.user_id = auth.uid())
  );

CREATE POLICY "Staff can view all reviews" ON public.reviews
  FOR SELECT USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage reviews" ON public.reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Loyalty points table
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_points
CREATE POLICY "Users can view their own points" ON public.loyalty_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all points" ON public.loyalty_points
  FOR SELECT USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage points" ON public.loyalty_points
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Loyalty transactions table
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'adjustment')),
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_transactions
CREATE POLICY "Users can view their own transactions" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all transactions" ON public.loyalty_transactions
  FOR SELECT USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage transactions" ON public.loyalty_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_email TEXT NOT NULL,
  referred_user_id UUID,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'completed', 'rewarded')),
  reward_points INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Staff can view all referrals" ON public.referrals
  FOR SELECT USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage referrals" ON public.referrals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Gallery items table (for showcase)
CREATE TABLE public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  before_image_url TEXT,
  vehicle_info TEXT,
  service_id UUID REFERENCES public.services(id),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for gallery_items
CREATE POLICY "Anyone can view active gallery items" ON public.gallery_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage gallery items" ON public.gallery_items
  FOR ALL USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Function to initialize loyalty points for new users
CREATE OR REPLACE FUNCTION public.initialize_loyalty_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO loyalty_points (user_id, points, lifetime_points, tier)
  VALUES (NEW.id, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create loyalty points on user creation
CREATE TRIGGER on_user_created_loyalty
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_loyalty_points();

-- Function to award points after completed booking
CREATE OR REPLACE FUNCTION public.award_booking_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_earned INTEGER;
BEGIN
  -- Award 1 point per R10 spent, only when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.payment_amount IS NOT NULL THEN
    points_earned := FLOOR(NEW.payment_amount / 10);
    
    IF points_earned > 0 THEN
      -- Add transaction
      INSERT INTO loyalty_transactions (user_id, points, type, description, booking_id)
      VALUES (NEW.user_id, points_earned, 'earn', 'Points earned from booking', NEW.id);
      
      -- Update user points
      INSERT INTO loyalty_points (user_id, points, lifetime_points, tier)
      VALUES (NEW.user_id, points_earned, points_earned, 'bronze')
      ON CONFLICT (user_id) DO UPDATE
      SET 
        points = loyalty_points.points + points_earned,
        lifetime_points = loyalty_points.lifetime_points + points_earned,
        tier = CASE 
          WHEN loyalty_points.lifetime_points + points_earned >= 10000 THEN 'platinum'
          WHEN loyalty_points.lifetime_points + points_earned >= 5000 THEN 'gold'
          WHEN loyalty_points.lifetime_points + points_earned >= 2000 THEN 'silver'
          ELSE 'bronze'
        END,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for booking completion points
CREATE TRIGGER on_booking_completed_points
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_booking_points();

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;