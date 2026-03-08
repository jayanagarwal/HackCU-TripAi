// ============================================================
// Database row types
// ============================================================

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
}

export interface Trip {
    id: string;
    name: string;
    leader_id: string;
    share_code: string;
    status: "collecting" | "ready" | "planning" | "complete";
    destination: string | null;
    start_date: string | null;
    end_date: string | null;
    trip_duration_days: number | null;
    group_size: number | null;
    created_at: string;
}

export interface TripMember {
    id: string;
    trip_id: string;
    user_id: string;
    has_submitted: boolean;
    joined_at: string;
}

export interface Preferences {
    id: string;
    trip_id: string;
    user_id: string;
    budget_min: number | null;
    budget_max: number | null;
    vibe_beach: number | null;
    vibe_city: number | null;
    vibe_nature: number | null;
    vibe_adventure: number | null;
    vibe_culture: number | null;
    vibe_relaxation: number | null;
    vibe_nightlife: number | null;
    dietary_restrictions: string[];
    dietary_notes: string | null;
    activity_level: "chill" | "moderate" | "packed" | null;
    accommodation_pref: "budget" | "mid-range" | "luxury" | null;
    must_haves: string[];
    dealbreakers: string[];
    additional_notes: string | null;
    submitted_at: string;
}

export interface LocationRecommendation {
    id: string;
    trip_id: string;
    destination: string;
    score: number;
    reasoning: string;
    pros: string[];
    cons: string[];
    estimated_budget_pp: number | null;
    created_at: string;
}

// ============================================================
// Itinerary JSON types (stored in itinerary_data JSONB column)
// ============================================================

export interface Activity {
    time: string;
    name: string;
    description: string;
    participants: string[];
    type: "group" | "solo" | "subgroup";
    estimated_cost_pp: number;
    category: "food" | "activity" | "transportation" | "free";
    reasoning: string;
    dietary_notes?: string;
}

export interface DayPlan {
    day_number: number;
    date: string;
    theme: string;
    activities: Activity[];
}

export interface BudgetBreakdown {
    total: number;
    accommodation: number;
    food: number;
    activities: number;
    transportation: number;
}

export interface Itinerary {
    destination: string;
    dates: { start: string; end: string };
    days: DayPlan[];
    budget_summary: {
        per_person: Record<string, BudgetBreakdown>;
        group_total: number;
    };
    accommodation: {
        name: string;
        type: string;
        cost_per_night: number;
        reasoning: string;
    };
}

export interface ItineraryRow {
    id: string;
    trip_id: string;
    destination: string;
    location_score: number | null;
    location_reasoning: string | null;
    itinerary_data: Itinerary;
    budget_breakdown: Record<string, BudgetBreakdown> | null;
    created_at: string;
}

// ============================================================
// Destination dataset type
// ============================================================

export interface Destination {
    name: string;
    vibes: {
        beach: number;
        city: number;
        nature: number;
        culture: number;
        relaxation: number;
        nightlife: number;
        adventure: number;
    };
    budget_level: string;
    avg_daily_cost_pp: number;
    dietary_friendly: string[];
    best_for: string[];
    highlights: string[];
    weather_note: string;
    walkability: string;
    transit: string;
}
