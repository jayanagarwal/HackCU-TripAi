import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

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

    // Verify user is a trip member
    const { data: member } = await supabase
        .from("trip_members")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single();

    if (!member) {
        return NextResponse.json(
            { error: "Not a member of this trip" },
            { status: 403 }
        );
    }

    const body = await request.json();

    // Upsert preferences
    const { error: prefError } = await supabase
        .from("preferences")
        .upsert(
            {
                trip_id: tripId,
                user_id: user.id,
                budget_min: body.budget_min,
                budget_max: body.budget_max,
                vibe_beach: body.vibe_beach,
                vibe_city: body.vibe_city,
                vibe_nature: body.vibe_nature,
                vibe_adventure: body.vibe_adventure,
                vibe_culture: body.vibe_culture,
                vibe_relaxation: body.vibe_relaxation,
                vibe_nightlife: body.vibe_nightlife,
                dietary_restrictions: body.dietary_restrictions || [],
                dietary_notes: body.dietary_notes || null,
                activity_level: body.activity_level,
                accommodation_pref: body.accommodation_pref,
                must_haves: body.must_haves || [],
                dealbreakers: body.dealbreakers || [],
                additional_notes: body.additional_notes || null,
            },
            { onConflict: "trip_id,user_id" }
        );

    if (prefError) {
        return NextResponse.json({ error: prefError.message }, { status: 500 });
    }

    // Mark member as submitted
    await supabase
        .from("trip_members")
        .update({ has_submitted: true })
        .eq("trip_id", tripId)
        .eq("user_id", user.id);

    // Check if all members have submitted
    const { data: allMembers } = await supabase
        .from("trip_members")
        .select("has_submitted")
        .eq("trip_id", tripId);

    const allSubmitted = allMembers?.every((m) => m.has_submitted) ?? false;

    if (allSubmitted) {
        await supabase
            .from("trips")
            .update({ status: "ready" })
            .eq("id", tripId);
    }

    return NextResponse.json({ success: true, allSubmitted });
}
