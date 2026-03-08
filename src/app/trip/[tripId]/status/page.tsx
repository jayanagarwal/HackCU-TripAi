import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StatusDashboard from "./StatusDashboard";

interface StatusPageProps {
    params: Promise<{ tripId: string }>;
}

export default async function StatusPage({ params }: StatusPageProps) {
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
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .single();

    if (!member) {
        redirect("/dashboard");
    }

    // Get trip
    const { data: trip } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

    if (!trip) {
        redirect("/dashboard");
    }

    // Get members with user info
    const { data: members } = await supabase
        .from("trip_members")
        .select("*")
        .eq("trip_id", tripId);

    // Get user info for each member
    const memberIds = members?.map((m) => m.user_id) || [];
    const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_url, email")
        .in("id", memberIds);

    const membersWithInfo = members?.map((m) => ({
        ...m,
        user: users?.find((u) => u.id === m.user_id) || {
            id: m.user_id,
            name: "Unknown",
            avatar_url: null,
            email: "",
        },
    })) || [];

    const isLeader = trip.leader_id === user.id;

    return (
        <StatusDashboard
            trip={trip}
            initialMembers={membersWithInfo}
            isLeader={isLeader}
            currentUserId={user.id}
        />
    );
}
