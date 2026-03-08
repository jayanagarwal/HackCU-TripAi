import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JoinTripClient from "./JoinTripClient";

interface JoinPageProps {
    params: Promise<{ shareCode: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { shareCode } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Look up the trip
    const { data: trip } = await supabase
        .from("trips")
        .select("*")
        .eq("share_code", shareCode.toUpperCase())
        .single();

    if (!trip) {
        return (
            <div className="min-h-screen pt-24 pb-16 page-transition">
                <div className="mx-auto max-w-lg px-4 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
                        😕
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Trip Not Found</h1>
                    <p className="mt-2 text-muted">
                        The share code <span className="font-mono font-bold">{shareCode}</span> doesn&apos;t match any trip. Check the link and try again.
                    </p>
                </div>
            </div>
        );
    }

    // Check if user is already a member
    if (user) {
        const { data: existingMember } = await supabase
            .from("trip_members")
            .select("id")
            .eq("trip_id", trip.id)
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            redirect(`/trip/${trip.id}/preferences`);
        }
    }

    return <JoinTripClient trip={trip} user={user} shareCode={shareCode} />;
}
