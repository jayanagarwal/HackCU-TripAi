import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

function generateShareCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous characters
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, start_date, end_date, trip_duration_days, group_size, destination, origin_city } = body;

    if (!name) {
        return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
    }

    // Ensure user exists in our users table
    const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!existingUser) {
        await supabase.from("users").insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email!.split("@")[0],
            avatar_url: user.user_metadata?.avatar_url || null,
        });
    }

    // Generate unique share code
    let shareCode = generateShareCode();
    let attempts = 0;
    while (attempts < 10) {
        const { data: existing } = await supabase
            .from("trips")
            .select("id")
            .eq("share_code", shareCode)
            .single();
        if (!existing) break;
        shareCode = generateShareCode();
        attempts++;
    }

    // Create the trip
    const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
            name,
            leader_id: user.id,
            share_code: shareCode,
            status: "collecting",
            destination: destination || null,
            origin_city: origin_city || null,
            start_date: start_date || null,
            end_date: end_date || null,
            trip_duration_days: trip_duration_days || null,
            group_size: group_size || null,
        })
        .select()
        .single();

    if (tripError) {
        return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    // Add leader as trip member
    await supabase.from("trip_members").insert({
        trip_id: trip.id,
        user_id: user.id,
        has_submitted: false,
    });

    return NextResponse.json({ trip });
}
