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

        let recommendations = result.recommendations || [];

        // ── Budget feasibility check ──
        // Fetch all member budgets to find the lowest
        const { data: preferences } = await supabase
            .from("preferences")
            .select("user_id, budget_max")
            .eq("trip_id", tripId);

        const { data: users } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", preferences?.map((p) => p.user_id) || []);

        const memberBudgets = preferences
            ?.filter((p) => p.budget_max != null)
            .map((p) => {
                const u = users?.find((u) => u.id === p.user_id);
                return {
                    name: u?.name || u?.email?.split("@")[0] || "Someone",
                    budget: p.budget_max as number,
                };
            }) || [];

        if (memberBudgets.length > 0) {
            const lowestBudgetMember = memberBudgets.reduce((min, m) =>
                m.budget < min.budget ? m : min
            );
            const lowestBudget = lowestBudgetMember.budget;

            // Filter out destinations over the lowest budget
            const affordable = recommendations.filter(
                (rec) => rec.estimatedBudgetPerPerson <= lowestBudget
            );

            if (affordable.length === 0 && recommendations.length > 0) {
                // All destinations exceed the lowest budget
                const cheapest = recommendations.reduce((min, rec) =>
                    rec.estimatedBudgetPerPerson < min.estimatedBudgetPerPerson ? rec : min
                );

                return NextResponse.json({
                    status: "budget_insufficient",
                    lowest_budget: lowestBudget,
                    lowest_budget_member: lowestBudgetMember.name,
                    cheapest_destination: cheapest.name,
                    cheapest_estimated_cost: cheapest.estimatedBudgetPerPerson,
                    message: `The most affordable matching destination (${cheapest.name}) would cost ~$${cheapest.estimatedBudgetPerPerson}/person, but ${lowestBudgetMember.name}'s budget is $${lowestBudget}.`,
                    options: [
                        `Increase the minimum budget to $${cheapest.estimatedBudgetPerPerson}`,
                        "Adjust preferences to unlock cheaper destinations",
                    ],
                    all_recommendations: recommendations, // Include for "Show Plans Anyway"
                });
            }

            // Use only affordable destinations (or all if no budgets set)
            if (affordable.length > 0) {
                recommendations = affordable;
            }
        }

        // Save recommendations to DB
        if (recommendations.length > 0) {
            // Prevent duplicates on re-run
            await supabase.from("location_recommendations").delete().eq("trip_id", tripId);

            const inserts = recommendations.map((rec) => ({
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

        return NextResponse.json({ recommendations });
    } catch (err) {
        console.error("Recommendation error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "AI recommendation failed" },
            { status: 500 }
        );
    }
}
