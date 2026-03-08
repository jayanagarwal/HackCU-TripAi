import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { askGeminiJSON } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are TripSync's itinerary planner. Create a day-by-day trip plan as JSON matching this exact schema:

{
  "days": [
    {
      "day_number": 1,
      "date": "Day 1",
      "theme": "Arrival & Exploration",
      "activities": [
        {
          "time": "10:00 AM",
          "name": "Activity Name",
          "description": "Brief description",
          "participants": ["Everyone"] or ["Ron", "Jon"],
          "type": "group" | "solo" | "subgroup",
          "estimated_cost_pp": 25,
          "category": "food" | "activity" | "transportation" | "free",
          "reasoning": "Why this was chosen, which preferences it serves",
          "confidence": "verified" | "suggested",
          "dietary_notes": "optional — which dietary restrictions this accommodates"
        }
      ]
    }
  ],
  "accommodation": {
    "options": [
      {
        "name": "Hotel Name",
        "type": "hotel" | "airbnb" | "hostel" | "lodge",
        "cost_per_night": 120,
        "reasoning": "Why this fits the group",
        "confidence": "verified" | "suggested"
      }
    ],
    "recommended": "Name of the top pick"
  },
  "transportation": {
    "type": "flight" | "drive" | "mixed",
    "estimated_cost_pp": 250,
    "notes": "Flight/driving guidance and estimated costs"
  },
  "budget_summary": {
    "per_person": {
      "MemberName": {
        "total": 650,
        "accommodation": 200,
        "food": 180,
        "activities": 170,
        "transportation": 100
      }
    },
    "group_total": 2600
  }
}

Rules:
- Maximize together-time but include 1-2 solo/subgroup blocks per day where preferences diverge
- Stay within each person's budget
- All restaurant suggestions must accommodate the group's dietary restrictions
- Include realistic timing and logistics between activities
- Every recommendation MUST have a reasoning field explaining why it was chosen
- Use actual member names for participants (use "Everyone" for group activities)
- Include a mix of food, activities, and free time
- First day should account for arrival, last day for departure

Additional requirements:

ACCOMMODATION: Suggest 2-3 real, well-known hotels or lodging options near the destination. Include the actual name, approximate nightly rate, and why it fits this group. Only suggest places you are confident actually exist — major hotel chains (Marriott, Hilton, Holiday Inn, Best Western, Hyatt) or well-known local lodges are preferred over obscure boutique places you might hallucinate.

TRANSPORTATION: Include a travel section with flight or driving guidance. If the destination is a flight destination, suggest looking at flights and provide an estimated round-trip cost range. If it's drivable, estimate drive time and gas costs.

RESTAURANTS & ACTIVITIES: Only recommend restaurants and attractions you are highly confident exist. Prefer well-known, established places over obscure ones. For restaurants, include the cuisine type and price range. If you're not sure a specific place exists, describe the type of place instead (e.g., 'a waterfront seafood restaurant in the $15-25 range' rather than inventing a name).

For every restaurant suggestion, note which dietary restrictions it can accommodate.

Add a confidence field to each activity: 'verified' if you're very confident it exists, 'suggested' if it's a general recommendation.

GROUNDING: You have access to Google Search. USE IT to verify every hotel, restaurant, and attraction you recommend actually exists and is currently open. Search for current prices, hours, and addresses. Do not recommend any place you cannot verify through search. Include the source of your pricing data where possible.

For flight cost estimates, search for typical flight costs to the destination to get realistic fare estimates. Reference the airports by their IATA codes.

BUDGET IS A HARD CONSTRAINT. Always try to keep each person's total cost at or below their stated budget. If it's impossible to stay within everyone's budget for this destination, prioritize keeping costs down and suggest where each person can cut costs. Never silently exceed someone's budget — always flag it explicitly.

If any member's total estimated cost exceeds their stated budget, suggest specific cost-saving alternatives for that person. For example: a cheaper hotel option, free activities that replace paid ones, or budget meal alternatives. Include these as a "savings_tips" field for the affected members in the budget_summary.per_person object.`;

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
    return NextResponse.json(
      { error: "Only the leader can generate itinerary" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { destination, synthesis } = body;

  if (!destination) {
    return NextResponse.json(
      { error: "Destination required" },
      { status: 400 }
    );
  }

  // Fetch all preferences with user names
  const { data: preferences } = await supabase
    .from("preferences")
    .select("*")
    .eq("trip_id", tripId);

  const userIds = preferences?.map((p) => p.user_id) || [];
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", userIds);

  const prefsWithNames = preferences?.map((p) => {
    const u = users?.find((u) => u.id === p.user_id);
    return {
      name: u?.name || u?.email?.split("@")[0] || "Unknown",
      budget_range: `$${p.budget_min}-$${p.budget_max}`,
      dietary_restrictions: p.dietary_restrictions,
      activity_level: p.activity_level,
      accommodation_pref: p.accommodation_pref,
      must_haves: p.must_haves,
      dealbreakers: p.dealbreakers,
      additional_notes: p.additional_notes,
    };
  });

  const exactNamesStr = prefsWithNames?.map(p => p.name).join(", ") || "Unknown";

  const userMessage = `Create a ${trip.trip_duration_days || 4}-day itinerary for ${destination}.

Group Size: ${preferences?.length || trip.group_size || 4} people
${trip.origin_city ? `Origin City: ${trip.origin_city} (where the group is traveling from — use this for flight/drive cost estimates)` : ""}

CRITICAL: Use these EXACT names in the budget_summary.per_person keys — do not use nicknames, truncations, or variations: ${exactNamesStr}

Group Synthesis:
${JSON.stringify(synthesis, null, 2)}

Individual Preferences:
${JSON.stringify(prefsWithNames, null, 2)}

${trip.start_date ? `Start Date: ${trip.start_date}` : ""}
${trip.end_date ? `End Date: ${trip.end_date}` : ""}`;

  try {
    const itinerary = await askGeminiJSON(SYSTEM_PROMPT, userMessage, 2, true);

    // ── Budget warnings: compare each member's total to their stated budget ──
    const budgetWarnings: {
      user: string;
      budget: number;
      estimated_total: number;
      over_by: number;
      suggestion: string;
    }[] = [];

    const budgetSummary = (itinerary as any)?.budget_summary;
    if (budgetSummary?.per_person && preferences) {
      for (const pref of preferences) {
        const u = users?.find((u) => u.id === pref.user_id);
        const memberName = u?.name || u?.email?.split("@")[0] || "Unknown";
        const memberBudget = pref.budget_max;

        if (memberBudget == null) continue;

        // Find this member in the budget summary (match by name, fallback to case-insensitive)
        let memberSummary = budgetSummary.per_person[memberName];
        if (!memberSummary) {
          const key = Object.keys(budgetSummary.per_person).find(
            (k) => k.toLowerCase() === memberName.toLowerCase()
          );
          if (key) {
            memberSummary = budgetSummary.per_person[key];
          }
        }
        if (!memberSummary) continue;

        const estimatedTotal = memberSummary.total;
        if (estimatedTotal > memberBudget) {
          const overBy = estimatedTotal - memberBudget;
          const savingsTips = memberSummary.savings_tips;
          budgetWarnings.push({
            user: memberName,
            budget: memberBudget,
            estimated_total: estimatedTotal,
            over_by: overBy,
            suggestion: savingsTips ||
              `${memberName} could save ~$${overBy} by choosing budget-friendly options for accommodation and meals.`,
          });
        }
      }
    }

    // Save to DB
    const { error: saveError } = await supabase.from("itineraries").insert({
      trip_id: tripId,
      destination,
      itinerary_data: itinerary,
      location_score: null,
      location_reasoning: null,
      budget_breakdown: budgetSummary || null,
    });

    if (saveError) {
      console.error("Save itinerary error:", saveError);
    }

    // Update trip status
    await supabase
      .from("trips")
      .update({ status: "complete", destination })
      .eq("id", tripId);

    return NextResponse.json({
      itinerary,
      ...(budgetWarnings.length > 0 ? { budget_warnings: budgetWarnings } : {}),
    });
  } catch (err) {
    console.error("Itinerary error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI itinerary failed" },
      { status: 500 }
    );
  }
}
