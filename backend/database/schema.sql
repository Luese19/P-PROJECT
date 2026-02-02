-- Supabase Database Schema for Jeep-Track
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('driver', 'commuter')),
  avatar_url TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT false,
  current_route_id UUID,
  current_jeepney_id UUID,
  favorite_routes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes table
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  fare_base DECIMAL(10, 2) DEFAULT 13.00,
  fare_student DECIMAL(10, 2) DEFAULT 10.00,
  fare_senior DECIMAL(10, 2) DEFAULT 10.00,
  fare_pwd DECIMAL(10, 2) DEFAULT 10.00,
  fare_per_km DECIMAL(10, 2),
  waypoints JSONB DEFAULT '[]'::jsonb,
  start_point JSONB NOT NULL,
  end_point JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jeepneys table
CREATE TABLE IF NOT EXISTS public.jeepneys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate_number TEXT NOT NULL UNIQUE,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  capacity INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations table (for storing location history)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jeepney_id UUID NOT NULL REFERENCES public.jeepneys(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed DECIMAL(6, 2),
  accuracy DECIMAL(6, 2),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED
);

-- Ensure geom column exists if table was created previously without it (for existing projects)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='geom') THEN
    ALTER TABLE public.locations ADD COLUMN geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;
  END IF;
END $$;

-- Add fare columns for discounted passengers (migration for existing databases)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='fare_student') THEN
    ALTER TABLE public.routes ADD COLUMN fare_student DECIMAL(10, 2) DEFAULT 10.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='fare_senior') THEN
    ALTER TABLE public.routes ADD COLUMN fare_senior DECIMAL(10, 2) DEFAULT 10.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='fare_pwd') THEN
    ALTER TABLE public.routes ADD COLUMN fare_pwd DECIMAL(10, 2) DEFAULT 10.00;
  END IF;
END $$;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_locations_geom ON public.locations USING GIST (geom);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_jeepneys_route_id ON public.jeepneys(route_id);
CREATE INDEX IF NOT EXISTS idx_jeepneys_driver_id ON public.jeepneys(driver_id);
CREATE INDEX IF NOT EXISTS idx_locations_jeepney_id ON public.locations(jeepney_id);
CREATE INDEX IF NOT EXISTS idx_locations_route_id ON public.locations(route_id);
CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON public.locations(timestamp DESC);

-- Add foreign key constraints for users table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_current_route' AND table_name='users') THEN
    ALTER TABLE public.users ADD CONSTRAINT fk_current_route FOREIGN KEY (current_route_id) REFERENCES public.routes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_current_jeepney' AND table_name='users') THEN
    ALTER TABLE public.users ADD CONSTRAINT fk_current_jeepney FOREIGN KEY (current_jeepney_id) REFERENCES public.jeepneys(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON public.routes;
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to find nearby jeepneys
CREATE OR REPLACE FUNCTION get_nearby_jeepneys(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 1000,
  target_route_id UUID DEFAULT NULL
)
RETURNS TABLE (
  jeepney_id UUID,
  plate_number TEXT,
  route_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters FLOAT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id as jeepney_id,
    j.plate_number,
    r.name as route_name,
    l.latitude::DOUBLE PRECISION,
    l.longitude::DOUBLE PRECISION,
    ST_Distance(
      l.geom, 
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) as distance_meters
  FROM 
    public.locations l
  JOIN 
    public.jeepneys j ON l.jeepney_id = j.id
  JOIN 
    public.routes r ON l.route_id = r.id
  WHERE 
    l.timestamp > NOW() - INTERVAL '1 minute'
    AND (target_route_id IS NULL OR l.route_id = target_route_id)
    AND ST_DWithin(
      l.geom, 
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography, 
      radius_meters
    )
  ORDER BY 
    distance_meters ASC;
END;
$$;

DROP TRIGGER IF EXISTS update_jeepneys_updated_at ON public.jeepneys;
CREATE TRIGGER update_jeepneys_updated_at
  BEFORE UPDATE ON public.jeepneys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jeepneys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public can view driver profiles when active" ON public.users;
CREATE POLICY "Public can view driver profiles when active"
  ON public.users FOR SELECT
  USING (role = 'driver' AND is_active = true);

-- Trigger to automatically create a profile in public.users when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'commuter'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Routes policies (public read)
DROP POLICY IF EXISTS "Anyone can view active routes" ON public.routes;
CREATE POLICY "Anyone can view active routes"
  ON public.routes FOR SELECT
  USING (is_active = true);

-- Jeepneys policies (public read)
DROP POLICY IF EXISTS "Anyone can view active jeepneys" ON public.jeepneys;
CREATE POLICY "Anyone can view active jeepneys"
  ON public.jeepneys FOR SELECT
  USING (is_active = true);

-- Locations policies
DROP POLICY IF EXISTS "Drivers can insert their own locations" ON public.locations;
CREATE POLICY "Drivers can insert their own locations"
  ON public.locations FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Anyone can view recent locations" ON public.locations;
CREATE POLICY "Anyone can view recent locations"
  ON public.locations FOR SELECT
  USING (timestamp > NOW() - INTERVAL '1 hour');

-- Seed sample jeepneys
INSERT INTO public.jeepneys (plate_number, route_id, capacity)
SELECT 
  'ABC-' || generate_series,
  (SELECT id FROM public.routes WHERE code = 'PASIG-CUBAO' LIMIT 1),
  20
FROM generate_series(101, 105)
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO public.jeepneys (plate_number, route_id, capacity)
SELECT 
  'XYZ-' || generate_series,
  (SELECT id FROM public.routes WHERE code = 'CUBAO-PASIG' LIMIT 1),
  20
FROM generate_series(201, 205)
ON CONFLICT (plate_number) DO NOTHING;
