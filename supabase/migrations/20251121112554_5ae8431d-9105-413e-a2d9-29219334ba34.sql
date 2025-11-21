-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('client', 'staff', 'admin');

-- Create enum for booking status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Create enum for booking stages
CREATE TYPE stage_type AS ENUM ('received', 'inspection', 'quoted', 'in_progress', 'quality_check', 'complete');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  vin TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL,
  price_from DECIMAL(10,2) NOT NULL,
  features TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  booking_date DATE NOT NULL,
  booking_time TEXT,
  status booking_status DEFAULT 'pending',
  current_stage stage_type DEFAULT 'received',
  estimated_completion DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create booking_stages table (tracks progress)
CREATE TABLE booking_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  stage stage_type NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create merchandise table
CREATE TABLE merchandise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability table (for booking calendar)
CREATE TABLE service_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) NOT NULL,
  date DATE NOT NULL,
  available_slots INTEGER DEFAULT 4,
  booked_slots INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, date)
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchandise ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_availability ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default client role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchandise_updated_at
  BEFORE UPDATE ON merchandise
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles (read-only for users, admins can manage)
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for vehicles
CREATE POLICY "Users can view their own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for services (public read, staff/admin can manage)
CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "Staff and admins can manage services"
  ON services FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can manage all bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for booking_stages
CREATE POLICY "Users can view stages for their bookings"
  ON booking_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_stages.booking_id
      AND (bookings.user_id = auth.uid() OR has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Staff can manage booking stages"
  ON booking_stages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for merchandise (public read, admins manage)
CREATE POLICY "Anyone can view active merchandise"
  ON merchandise FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage merchandise"
  ON merchandise FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for service_availability (public read, staff manage)
CREATE POLICY "Anyone can view service availability"
  ON service_availability FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Staff can manage availability"
  ON service_availability FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Insert default services
INSERT INTO services (title, category, description, duration, price_from, features) VALUES
('Paint Protection Film', 'Protection', 'Premium self-healing PPF for complete front-end or full vehicle coverage', '3-5 days', 2500.00, ARRAY['Self-healing technology', '10-year warranty', 'UV protection', 'Hydrophobic coating']),
('Ceramic Coating', 'Protection', 'Professional-grade nano-ceramic coating with superior gloss and protection', '2-3 days', 1200.00, ARRAY['9H hardness', '5-year durability', 'Enhanced gloss', 'Easy maintenance']),
('Full Detail', 'Detailing', 'Complete interior and exterior restoration for showroom finish', '1-2 days', 800.00, ARRAY['Paint correction', 'Interior deep clean', 'Engine bay detail', 'Wheel & tire treatment']),
('Paint Correction', 'Enhancement', 'Multi-stage machine polishing to remove swirls and scratches', '1-2 days', 600.00, ARRAY['Swirl removal', 'Scratch correction', 'High-gloss finish', 'Paint depth restoration']);

-- Insert sample merchandise
INSERT INTO merchandise (name, category, description, price, stock_quantity) VALUES
('Premium Microfiber Towels', 'Accessories', 'Professional-grade microfiber towels for scratch-free detailing', 49.99, 50),
('Ceramic Spray Coating', 'Products', 'Easy-apply ceramic spray for lasting protection and shine', 89.99, 30),
('Wheel Cleaner Pro', 'Products', 'pH-neutral wheel cleaner safe for all finishes', 34.99, 40),
('Detailing Brush Set', 'Accessories', 'Complete brush set for interior and exterior detailing', 59.99, 25);