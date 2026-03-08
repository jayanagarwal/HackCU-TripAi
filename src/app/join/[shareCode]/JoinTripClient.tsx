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

            // Ensure user exists in users table
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

            // Join the trip
            const { error: joinError } = await supabase
                .from("trip_members")
                .insert({
                    trip_id: trip.id,
                    user_id: user.id,
                    has_submitted: false,
                });

            if (joinError) {
                if (joinError.code === "23505") {
                    // Already a member
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
                <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
                    {/* Trip invite header */}
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl gradient-bg-animated text-4xl text-white shadow-lg">
                        ✈️
                    </div>

                    <p className="text-sm font-medium text-muted uppercase tracking-wider">
                        You&apos;re invited to
                    </p>
                    <h1 className="mt-2 text-3xl font-bold text-foreground">
                        {trip.name}
                    </h1>

                    {/* Trip details */}
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {trip.trip_duration_days && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-700">
                                📅 {trip.trip_duration_days} days
                            </span>
                        )}
                        {trip.group_size && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1.5 text-sm font-medium text-cyan-700">
                                👥 {trip.group_size} travelers
                            </span>
                        )}
                        {trip.destination && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700">
                                📍 {trip.destination}
                            </span>
                        )}
                        {trip.start_date && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700">
                                🗓️ {new Date(trip.start_date).toLocaleDateString()}
                            </span>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Action */}
                    <div className="mt-8">
                        {user ? (
                            <button
                                onClick={handleJoin}
                                disabled={loading}
                                className="w-full rounded-xl gradient-bg py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg
                                            className="h-5 w-5 animate-spin"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Joining...
                                    </span>
                                ) : (
                                    "Join This Trip 🎉"
                                )}
                            </button>
                        ) : (
                            <div>
                                <p className="mb-4 text-sm text-muted">
                                    Sign in to join this trip and share your preferences
                                </p>
                                <button
                                    onClick={handleSignIn}
                                    className="w-full rounded-xl gradient-bg py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Sign in with Google to Join
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
