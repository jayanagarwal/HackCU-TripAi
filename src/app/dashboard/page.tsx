import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    // Fetch trips the user is a member of
    const { data: memberships } = await supabase
        .from("trip_members")
        .select("trip_id, has_submitted")
        .eq("user_id", user.id);

    let trips: Array<{
        id: string;
        name: string;
        leader_id: string;
        share_code: string;
        status: string;
        destination: string | null;
        start_date: string | null;
        end_date: string | null;
        trip_duration_days: number | null;
        group_size: number | null;
        created_at: string;
        is_leader: boolean;
        has_submitted: boolean;
        member_count: number;
    }> = [];

    if (memberships && memberships.length > 0) {
        const tripIds = memberships.map((m) => m.trip_id);
        const { data: tripData } = await supabase
            .from("trips")
            .select("*")
            .in("id", tripIds)
            .order("created_at", { ascending: false });

        if (tripData) {
            // Get member counts for each trip
            const { data: allMembers } = await supabase
                .from("trip_members")
                .select("trip_id")
                .in("trip_id", tripIds);

            const memberCounts: Record<string, number> = {};
            allMembers?.forEach((m) => {
                memberCounts[m.trip_id] = (memberCounts[m.trip_id] || 0) + 1;
            });

            trips = tripData.map((trip) => ({
                ...trip,
                is_leader: trip.leader_id === user.id,
                has_submitted:
                    memberships.find((m) => m.trip_id === trip.id)?.has_submitted ?? false,
                member_count: memberCounts[trip.id] || 0,
            }));
        }
    }

    const statusColors: Record<string, string> = {
        collecting:
            "bg-amber-50 text-amber-700 border-amber-200",
        ready:
            "bg-blue-50 text-blue-700 border-blue-200",
        planning:
            "bg-violet-50 text-violet-700 border-violet-200",
        complete:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
    };

    const statusLabels: Record<string, string> = {
        collecting: "Collecting Preferences",
        ready: "Ready to Plan",
        planning: "AI Planning",
        complete: "Trip Planned!",
    };

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">My Trips</h1>
                        <p className="mt-1 text-muted">
                            Plan, join, and manage your group adventures
                        </p>
                    </div>
                    <Link
                        href="/trip/new"
                        className="inline-flex items-center gap-2 rounded-full gradient-bg px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                    >
                        <span className="text-lg">+</span> Plan a Trip
                    </Link>
                </div>

                {trips.length === 0 ? (
                    /* Empty state */
                    <div className="mt-16 flex flex-col items-center justify-center text-center">
                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-indigo-50 text-5xl">
                            ✈️
                        </div>
                        <h2 className="mt-6 text-xl font-semibold text-foreground">
                            No trips yet
                        </h2>
                        <p className="mt-2 max-w-sm text-muted">
                            Start planning your first group trip or join one using a share code
                            from a friend.
                        </p>
                        <Link
                            href="/trip/new"
                            className="mt-6 inline-flex items-center gap-2 rounded-full gradient-bg px-8 py-3 text-base font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                        >
                            Plan Your First Trip 🚀
                        </Link>
                    </div>
                ) : (
                    /* Trip cards */
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        {trips.map((trip) => (
                            <Link
                                key={trip.id}
                                href={
                                    trip.status === "complete"
                                        ? `/trip/${trip.id}/itinerary`
                                        : trip.is_leader
                                            ? `/trip/${trip.id}/status`
                                            : trip.has_submitted
                                                ? `/trip/${trip.id}/status`
                                                : `/trip/${trip.id}/preferences`
                                }
                                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary-light hover:-translate-y-1"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                            {trip.name}
                                        </h3>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[trip.status] || statusColors.collecting
                                                    }`}
                                            >
                                                {statusLabels[trip.status] || trip.status}
                                            </span>
                                            {trip.is_leader && (
                                                <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                                    👑 Leader
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <svg
                                        className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </div>

                                <div className="mt-4 flex items-center gap-4 text-sm text-muted">
                                    <span className="flex items-center gap-1">
                                        👥 {trip.member_count}
                                        {trip.group_size ? ` / ${trip.group_size}` : ""} members
                                    </span>
                                    {trip.trip_duration_days && (
                                        <span className="flex items-center gap-1">
                                            📅 {trip.trip_duration_days} days
                                        </span>
                                    )}
                                </div>

                                {trip.destination && (
                                    <div className="mt-2 text-sm text-muted">
                                        📍 {trip.destination}
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
