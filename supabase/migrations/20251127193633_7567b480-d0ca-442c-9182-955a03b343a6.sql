-- Step 1: Create new stage type enum with all 10 Race Technik stages
CREATE TYPE stage_type_new AS ENUM (
  'vehicle_checkin',
  'stripping', 
  'surface_prep',
  'paint_correction',
  'ppf_installation',
  'reassembly',
  'qc1',
  'final_detail',
  'qc2',
  'delivery_prep'
);

-- Step 2: Add new columns to booking_stages
ALTER TABLE booking_stages 
ADD COLUMN started_at timestamp with time zone,
ADD COLUMN stage_order integer;

-- Step 3: Migrate existing data in booking_stages
ALTER TABLE booking_stages 
ALTER COLUMN stage TYPE stage_type_new 
USING (
  CASE stage::text
    WHEN 'received' THEN 'vehicle_checkin'
    WHEN 'in_progress' THEN 'surface_prep'
    WHEN 'quality_check' THEN 'qc1'
    WHEN 'completed' THEN 'delivery_prep'
    ELSE 'vehicle_checkin'
  END
)::stage_type_new;

-- Step 4: Drop default on bookings.current_stage before type change
ALTER TABLE bookings ALTER COLUMN current_stage DROP DEFAULT;

-- Step 5: Update bookings table current_stage type
ALTER TABLE bookings 
ALTER COLUMN current_stage TYPE stage_type_new
USING (
  CASE current_stage::text
    WHEN 'received' THEN 'vehicle_checkin'
    WHEN 'in_progress' THEN 'surface_prep'
    WHEN 'quality_check' THEN 'qc1'
    WHEN 'completed' THEN 'delivery_prep'
    ELSE 'vehicle_checkin'
  END
)::stage_type_new;

-- Step 6: Set new default for current_stage
ALTER TABLE bookings ALTER COLUMN current_stage SET DEFAULT 'vehicle_checkin'::stage_type_new;

-- Step 7: Drop old enum type
DROP TYPE stage_type;

-- Step 8: Rename new enum type
ALTER TYPE stage_type_new RENAME TO stage_type;

-- Step 9: Add RLS policy for staff to view all profiles
CREATE POLICY "Staff can view all profiles"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin')
);

-- Step 10: Add RLS policy for staff to view all vehicles
CREATE POLICY "Staff can view all vehicles"
ON vehicles FOR SELECT
USING (
  has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin')
);

-- Step 11: Enable realtime for booking_stages
ALTER PUBLICATION supabase_realtime ADD TABLE booking_stages;

-- Step 12: Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Step 13: Create function to auto-generate stages when booking is created
CREATE OR REPLACE FUNCTION create_booking_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO booking_stages (booking_id, stage, stage_order, completed)
  VALUES
    (NEW.id, 'vehicle_checkin', 1, false),
    (NEW.id, 'stripping', 2, false),
    (NEW.id, 'surface_prep', 3, false),
    (NEW.id, 'paint_correction', 4, false),
    (NEW.id, 'ppf_installation', 5, false),
    (NEW.id, 'reassembly', 6, false),
    (NEW.id, 'qc1', 7, false),
    (NEW.id, 'final_detail', 8, false),
    (NEW.id, 'qc2', 9, false),
    (NEW.id, 'delivery_prep', 10, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 14: Create trigger to auto-generate stages
CREATE TRIGGER on_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_stages();

-- Step 15: Create storage bucket for vehicle photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Step 16: RLS policy for vehicle photos - clients can upload their own
CREATE POLICY "Users can upload vehicle photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vehicle-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 17: RLS policy for vehicle photos - staff can view all
CREATE POLICY "Staff can view all vehicle photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vehicle-photos' AND
  (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
);

-- Step 18: RLS policy for vehicle photos - users can view their own
CREATE POLICY "Users can view their vehicle photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vehicle-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);