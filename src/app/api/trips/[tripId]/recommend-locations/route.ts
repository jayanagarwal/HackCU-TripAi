import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { askGeminiJSON } from "@/lib/gemini";
import { destinations as US_DESTINATIONS } from "@/lib/destinations";

const SYSTEM_PROMPT = `You are TripSync's destination matcher. Given a group travel profile and a dataset of US destinations, score each destination and return the top 3-4 as JSON.

Return this exact schema:
{
  "recommendations": [
    {
      "name": "City, State",
      "score": 85,
      "pros": ["specific pro referencing group members by name"],
      "cons": ["honest tradeoff"],
      "estimatedBudgetPerPerson": 650,
      "reasoning": "2-3 sentence friendly explanation of why this works for this specific group"
    }
  ]
}

Rules:
- Score 0-100 based on fit with group preferences
- Reference specific group members by name in pros/cons
- Be honest about tradeoffs — don't oversell
- If a destination doesn't accommodate someone's dealbreaker, exclude it
- estimatedBudgetPerPerson should match the trip duration
- Sort by score descending`;

interface Recommendation {
    name: string;
    score: number;
    pros: string[];
    cons: string[];
    estimatedBudgetPerPerson: number;
    reasoning: string;
}

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
        return NextResponse.json({ error: "Only the leader can generate recommendations" }, { status: 403 });
    }

    const body = await request.json();
    const { synthesis } = body;

    if (!synthesis) {
        return NextResponse.json({ error: "Synthesis data required" }, { status: 400 });
    }

    // If trip already has a destination, only recommend that one
    const destinationDataset = trip.destination
        ? US_DESTINATIONS.filter(
            (d) => d.name.toLowerCase().includes(trip.destination!.toLowerCase()) ||
                trip.destination!.toLowerCase().includes(d.name.toLowerCase())
        )
        : US_DESTINATIONS;

    const userMessage = `Group Travel Profile:
${JSON.stringify(synthesis, null, 2)}

Trip Duration: ${trip.trip_duration_days || 4} days
Group Size: ${trip.group_size || 4}

Available Destinations Dataset:
${JSON.stringify(
        (destinationDataset.length > 0 ? destinationDataset : US_DESTINATIONS).map((d) => ({
            name: d.name,
            vibes: d.vibes,
            budget_level: d.budget_level,
            avg_daily_cost_pp: d.avg_daily_cost_pp,
            dietary_friendly: d.dietary_friendly,
            highlights: d.highlights,
        })),
        null,
        2
    )}`;

    try {
        const result = await askGeminiJSON<{ recommendations: Recommendation[] }>(
            SYSTEM_PROMPT,
            userMessage,
            2,
            true // Enable Google Search grounding
        );

        // Save recommendations to DB
        if (result.recommendations) {
            const inserts = result.recommendations.map((rec) => ({
                trip_id: tripId,
                destination: rec.name,
                score: rec.score,
                reasoning: rec.reasoning,
                pros: rec.pros,
                cons: rec.cons,
                estimated_budget_pp: rec.estimatedBudgetPerPerson,
            }));

            await supabase.from("location_recommendations").insert(inserts);
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error("Recommendation error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "AI recommendation failed" },
            { status: 500 }
        );
    }
}
