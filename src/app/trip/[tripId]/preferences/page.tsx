import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PreferenceForm from "./PreferenceForm";

interface PreferencesPageProps {
    params: Promise<{ tripId: string }>;
}

export default async function PreferencesPage({
    params,
}: PreferencesPageProps) {
    const { tripId } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    // Verify membership
    const { data: member } = await supabase
        .from("trip_members")
        .select("id, has_submitted")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single();

    if (!member) {
        redirect("/dashboard");
    }

    // Get trip info
    const { data: trip } = await supabase
        .from("trips")
        .select("name")
        .eq("id", tripId)
        .single();

    // Get existing preferences if editing
    const { data: existing } = await supabase
        .from("preferences")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single();

    return (
        <PreferenceForm
            tripId={tripId}
            tripName={trip?.name || "Trip"}
            userName={user.user_metadata?.name || user.email?.split("@")[0] || ""}
            existingPrefs={existing}
            alreadySubmitted={member.has_submitted}
        />
    );
}
