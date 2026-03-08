-- ============================================================
-- TripSync Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES users(id) NOT NULL,
  share_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'collecting' CHECK (status IN ('collecting', 'ready', 'planning', 'complete')),
  destination TEXT,
  origin_city TEXT,
  start_date DATE,
  end_date DATE,
  trip_duration_days INTEGER,
  group_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trip Members junction table
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  has_submitted BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- User Preferences per trip
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  budget_min NUMERIC,
  budget_max NUMERIC,
  vibe_beach INTEGER CHECK (vibe_beach BETWEEN 1 AND 5),
  vibe_city INTEGER CHECK (vibe_city BETWEEN 1 AND 5),
  vibe_nature INTEGER CHECK (vibe_nature BETWEEN 1 AND 5),
  vibe_adventure INTEGER CHECK (vibe_adventure BETWEEN 1 AND 5),
  vibe_culture INTEGER CHECK (vibe_culture BETWEEN 1 AND 5),
  vibe_relaxation INTEGER CHECK (vibe_relaxation BETWEEN 1 AND 5),
  vibe_nightlife INTEGER CHECK (vibe_nightlife BETWEEN 1 AND 5),
  dietary_restrictions TEXT[],
  dietary_notes TEXT,
  activity_level TEXT CHECK (activity_level IN ('chill', 'moderate', 'packed')),
  accommodation_pref TEXT CHECK (accommodation_pref IN ('budget', 'mid-range', 'luxury')),
  must_haves TEXT[],
  dealbreakers TEXT[],
  additional_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- AI-generated itineraries
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) NOT NULL,
  destination TEXT NOT NULL,
  location_score NUMERIC,
  location_reasoning TEXT,
  itinerary_data JSONB NOT NULL,
  budget_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Location recommendations (before final selection)
CREATE TABLE location_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) NOT NULL,
  destination TEXT NOT NULL,
  score NUMERIC NOT NULL,
  reasoning TEXT NOT NULL,
  pros TEXT[],
  cons TEXT[],
  estimated_budget_pp NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_recommendations ENABLE ROW LEVEL SECURITY;

-- Users: can read own data, insert on sign-up
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Trips: anyone authenticated can read (needed for share code lookup), leaders can update
CREATE POLICY "Anyone can view trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Anyone authenticated can create trips" ON trips FOR INSERT
  WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leaders can update trips" ON trips FOR UPDATE
  USING (auth.uid() = leader_id);

-- Trip Members: users can view members where they are a member themselves
CREATE POLICY "Members can view trip members" ON trip_members FOR SELECT
  USING (true);
CREATE POLICY "Authenticated users can join trips" ON trip_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can update own membership" ON trip_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Preferences: own data + co-members can view (using non-recursive check)
CREATE POLICY "Users can view trip preferences" ON preferences FOR SELECT
  USING (true);
CREATE POLICY "Users can insert own preferences" ON preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Itineraries: trip members can view, service role can insert
CREATE POLICY "Trip members can view itineraries" ON itineraries FOR SELECT
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can insert itineraries" ON itineraries FOR INSERT
  WITH CHECK (true);

-- Location recommendations: trip members can view, service role can insert
CREATE POLICY "Trip members can view recommendations" ON location_recommendations FOR SELECT
  USING (trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can insert recommendations" ON location_recommendations FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Enable Realtime for trip_members table (for live status updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE trip_members;
