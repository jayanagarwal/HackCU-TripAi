"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface MemberWithInfo {
    id: string;
    trip_id: string;
    user_id: string;
    has_submitted: boolean;
    joined_at: string;
    user: {
        id: string;
        name: string;
        avatar_url: string | null;
        email: string;
    };
}

interface StatusDashboardProps {
    trip: {
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
    };
    initialMembers: MemberWithInfo[];
    isLeader: boolean;
    currentUserId: string;
}

export default function StatusDashboard({
    trip,
    initialMembers,
    isLeader,
    currentUserId,
}: StatusDashboardProps) {
    const router = useRouter();
    const [members, setMembers] = useState<MemberWithInfo[]>(initialMembers);
    const [copied, setCopied] = useState(false);

    const shareUrl = typeof window !== "undefined"
        ? `${window.location.origin}/join/${trip.share_code}`
        : `/join/${trip.share_code}`;

    const submittedCount = members.filter((m) => m.has_submitted).length;
    const allSubmitted = members.length > 0 && submittedCount === members.length;

    // Realtime subscription for trip_members changes
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`trip-status-${trip.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "trip_members",
                    filter: `trip_id=eq.${trip.id}`,
                },
                async () => {
                    // Re-fetch all members when anything changes
                    const { data: updatedMembers } = await supabase
                        .from("trip_members")
                        .select("*")
                        .eq("trip_id", trip.id);

                    if (updatedMembers) {
                        const memberIds = updatedMembers.map((m) => m.user_id);
                        const { data: users } = await supabase
                            .from("users")
                            .select("id, name, avatar_url, email")
                            .in("id", memberIds);

                        const withInfo = updatedMembers.map((m) => ({
                            ...m,
                            user: users?.find((u) => u.id === m.user_id) || {
                                id: m.user_id,
                                name: "Unknown",
                                avatar_url: null,
                                email: "",
                            },
                        }));

                        setMembers(withInfo);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [trip.id]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const currentMember = members.find((m) => m.user_id === currentUserId);

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-foreground">{trip.name}</h1>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {trip.trip_duration_days && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-sm font-medium text-indigo-700">
                                📅 {trip.trip_duration_days} days
                            </span>
                        )}
                        {trip.group_size && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-sm font-medium text-cyan-700">
                                👥 {trip.group_size} travelers
                            </span>
                        )}
                        {trip.destination && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-sm font-medium text-emerald-700">
                                📍 {trip.destination}
                            </span>
                        )}
                    </div>
                </div>

                {/* Share Link Card */}
                <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">
                    <div className="text-center">
                        <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">
                            Share this link with your crew
                        </h3>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-3 font-mono text-sm text-foreground select-all overflow-x-auto">
                                {shareUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${copied
                                        ? "bg-emerald-500 text-white"
                                        : "gradient-bg text-white hover:shadow-md hover:scale-105 active:scale-95"
                                    }`}
                            >
                                {copied ? "✓ Copied!" : "Copy"}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-indigo-600/70">
                            Code: <span className="font-mono font-bold">{trip.share_code}</span>
                        </p>
                    </div>
                </div>

                {/* Progress */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-foreground">
                            Team Progress
                        </h2>
                        <span className="text-sm text-muted">
                            {submittedCount}/{members.length} submitted
                        </span>
                    </div>
                    <div className="h-3 rounded-full bg-border overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${allSubmitted ? "bg-emerald-500" : "gradient-bg"
                                }`}
                            style={{
                                width: `${members.length > 0 ? (submittedCount / members.length) * 100 : 0}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Members List */}
                <div className="mt-6 space-y-3">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm"
                        >
                            {/* Avatar */}
                            {member.user.avatar_url ? (
                                <img
                                    src={member.user.avatar_url}
                                    alt=""
                                    className="h-10 w-10 rounded-full"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg text-white font-bold">
                                    {member.user.name.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground truncate">
                                        {member.user.name}
                                    </span>
                                    {member.user_id === trip.leader_id && (
                                        <span className="shrink-0 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                            👑 Leader
                                        </span>
                                    )}
                                    {member.user_id === currentUserId && (
                                        <span className="shrink-0 text-xs text-muted">(You)</span>
                                    )}
                                </div>
                                <p className="text-xs text-muted truncate">
                                    {member.user.email}
                                </p>
                            </div>

                            {/* Status */}
                            <div className="shrink-0">
                                {member.has_submitted ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                                        ✓ Submitted
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
                                        ⏳ Pending
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Empty slots */}
                    {trip.group_size &&
                        members.length < trip.group_size &&
                        Array.from({ length: trip.group_size - members.length }).map(
                            (_, i) => (
                                <div
                                    key={`empty-${i}`}
                                    className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-4"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border text-muted">
                                        ?
                                    </div>
                                    <span className="text-sm text-muted">
                                        Waiting for someone to join...
                                    </span>
                                </div>
                            )
                        )}
                </div>

                {/* Your action */}
                {currentMember && !currentMember.has_submitted && (
                    <div className="mt-8">
                        <Link
                            href={`/trip/${trip.id}/preferences`}
                            className="block w-full rounded-xl gradient-bg py-4 text-center text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Fill In Your Preferences ✏️
                        </Link>
                    </div>
                )}

                {/* All submitted — Generate Plan */}
                {allSubmitted && (
                    <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center animate-fade-in">
                        <div className="text-3xl mb-2">🎉</div>
                        <h3 className="text-lg font-bold text-emerald-800">
                            All preferences collected!
                        </h3>
                        <p className="mt-1 text-sm text-emerald-700/80">
                            Everyone&apos;s submitted. Time to let the AI work its magic.
                        </p>
                        {isLeader ? (
                            <Link
                                href={`/trip/${trip.id}/locations`}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                                Generate Plan 🤖
                            </Link>
                        ) : (
                            <p className="mt-3 text-sm text-emerald-600">
                                The trip leader will generate the plan soon!
                            </p>
                        )}
                    </div>
                )}

                {/* Not all submitted yet */}
                {!allSubmitted && members.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted">
                            ⏳ Waiting for{" "}
                            <span className="font-medium text-foreground">
                                {members.length - submittedCount} more
                            </span>{" "}
                            {members.length - submittedCount === 1 ? "person" : "people"} to
                            submit preferences
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
