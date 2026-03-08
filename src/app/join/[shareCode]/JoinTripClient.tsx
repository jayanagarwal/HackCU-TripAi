"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface JoinTripClientProps {
    trip: {
        id: string;
        name: string;
        leader_id: string;
        trip_duration_days: number | null;
        group_size: number | null;
        destination: string | null;
        start_date: string | null;
        end_date: string | null;
    };
    user: User | null;
    shareCode: string;
}

export default function JoinTripClient({
    trip,
    user,
    shareCode,
}: JoinTripClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignIn = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/join/${shareCode}`,
            },
        });
    };

    const handleJoin = async () => {
        if (!user) return;
        setLoading(true);
        setError("");

        try {
            const supabase = createClient();

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

            const { error: joinError } = await supabase
                .from("trip_members")
                .insert({
                    trip_id: trip.id,
                    user_id: user.id,
                    has_submitted: false,
                });

            if (joinError) {
                if (joinError.code === "23505") {
                    router.push(`/trip/${trip.id}/preferences`);
                    return;
                }
                throw joinError;
            }

            router.push(`/trip/${trip.id}/preferences`);
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : "Failed to join trip"
            );
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-lg px-4">
                <div className="border-4 border-foreground p-8 text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-4 border-foreground text-4xl font-black">
                        ↗
                    </div>

                    <p className="text-xs font-black text-muted uppercase tracking-widest">
                        You&apos;re invited to
                    </p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tighter text-foreground">
                        {trip.name}
                    </h1>

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {trip.trip_duration_days && (
                            <span className="inline-flex items-center border-2 border-foreground px-3 py-1.5 text-sm font-bold text-foreground">
                                {trip.trip_duration_days} days
                            </span>
                        )}
                        {trip.group_size && (
                            <span className="inline-flex items-center border-2 border-foreground px-3 py-1.5 text-sm font-bold text-foreground">
                                {trip.group_size} travelers
                            </span>
                        )}
                        {trip.destination && (
                            <span className="inline-flex items-center border-2 border-foreground px-3 py-1.5 text-sm font-bold text-foreground">
                                ⌖ {trip.destination}
                            </span>
                        )}
                        {trip.start_date && (
                            <span className="inline-flex items-center border-2 border-foreground px-3 py-1.5 text-sm font-bold text-foreground">
                                {new Date(trip.start_date).toLocaleDateString()}
                            </span>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 border-4 border-foreground px-4 py-3 text-sm text-foreground font-bold">
                            ✗ {error}
                        </div>
                    )}

                    <div className="mt-8">
                        {user ? (
                            <button
                                onClick={handleJoin}
                                disabled={loading}
                                className="w-full btn-brutal py-4 text-lg"
                            >
                                {loading ? "Joining..." : "Join This Trip ↗"}
                            </button>
                        ) : (
                            <div>
                                <p className="mb-4 text-sm text-muted font-medium">
                                    Sign in to join this trip and share your preferences
                                </p>
                                <button
                                    onClick={handleSignIn}
                                    className="w-full btn-brutal py-4 text-lg"
                                >
                                    Sign In to Join
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
