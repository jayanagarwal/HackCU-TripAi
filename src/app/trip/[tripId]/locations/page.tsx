import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LocationsClient from "./LocationsClient";

interface LocationsPageProps {
    params: Promise<{ tripId: string }>;
}

export default async function LocationsPage({ params }: LocationsPageProps) {
    const { tripId } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    const { data: trip } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

    if (!trip) {
        redirect("/dashboard");
    }

    // Check if itinerary already exists
    const { data: existingItinerary } = await supabase
        .from("itineraries")
        .select("id")
        .eq("trip_id", tripId)
        .limit(1)
        .single();

    if (existingItinerary) {
        redirect(`/trip/${tripId}/itinerary`);
    }

    const isLeader = trip.leader_id === user.id;

    // Check for existing recommendations
    const { data: existingRecs } = await supabase
        .from("location_recommendations")
        .select("*")
        .eq("trip_id", tripId)
        .order("score", { ascending: false });

    return (
        <LocationsClient
            tripId={tripId}
            tripName={trip.name}
            tripDuration={trip.trip_duration_days || 4}
            isLeader={isLeader}
            existingRecommendations={existingRecs || []}
        />
    );
}
