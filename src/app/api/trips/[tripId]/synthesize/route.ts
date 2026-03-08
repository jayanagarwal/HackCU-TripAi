import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { askGeminiJSON } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are TripSync's preference analyst. Given individual travel preferences from a group of friends, analyze and output JSON with this exact schema:

{
  "commonGround": ["list of things most members agree on"],
  "conflicts": ["list of specific disagreements — name who disagrees on what"],
  "budgetAnalysis": {
    "min": number,
    "max": number,
    "overlapMin": number,
    "overlapMax": number,
    "constrainingMember": "name of the person with the tightest budget"
  },
  "dietaryUnion": ["all dietary restrictions that must be accommodated"],
  "groupVibeProfile": {
    "beach": number,
    "city": number,
    "nature": number,
    "adventure": number,
    "culture": number,
    "relaxation": number,
    "nightlife": number,
    "notes": "brief note on outliers or strong preferences"
  },
  "humanSummary": "2-3 sentence friendly summary of the group dynamic"
}

Use the actual member names in your analysis. Be honest about conflicts.`;

export async function POST(
    request: Request,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify leader
    const { data: trip } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

    if (!trip || trip.leader_id !== user.id) {
        return NextResponse.json({ error: "Only the leader can synthesize" }, { status: 403 });
    }

    // Fetch all preferences with user info
    const { data: preferences } = await supabase
        .from("preferences")
        .select("*")
        .eq("trip_id", tripId);

    if (!preferences || preferences.length === 0) {
        return NextResponse.json({ error: "No preferences submitted yet" }, { status: 400 });
    }

    // Get user names for each preference
    const userIds = preferences.map((p) => p.user_id);
    const { data: users } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", userIds);

    const prefsWithNames = preferences.map((p) => {
        const u = users?.find((u) => u.id === p.user_id);
        return {
            name: u?.name || u?.email?.split("@")[0] || "Unknown",
            budget_range: `$${p.budget_min}-$${p.budget_max}`,
            vibes: {
                beach: p.vibe_beach,
                city: p.vibe_city,
                nature: p.vibe_nature,
                adventure: p.vibe_adventure,
                culture: p.vibe_culture,
                relaxation: p.vibe_relaxation,
                nightlife: p.vibe_nightlife,
            },
            dietary_restrictions: p.dietary_restrictions,
            dietary_notes: p.dietary_notes,
            activity_level: p.activity_level,
            accommodation_pref: p.accommodation_pref,
            must_haves: p.must_haves,
            dealbreakers: p.dealbreakers,
            additional_notes: p.additional_notes,
        };
    });

    const userMessage = `Here are the individual travel preferences for a group of ${preferences.length} friends planning a ${trip.trip_duration_days || 4}-day trip:\n\n${JSON.stringify(prefsWithNames, null, 2)}`;

    try {
        const synthesis = await askGeminiJSON(SYSTEM_PROMPT, userMessage);
        return NextResponse.json({ synthesis });
    } catch (err) {
        console.error("Synthesis error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "AI synthesis failed" },
            { status: 500 }
        );
    }
}
