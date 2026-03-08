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

                        const withInfo = updatedMembers.map((m) => {
                            const u = users?.find((u) => u.id === m.user_id);
                            return {
                                ...m,
                                user: u
                                    ? { ...u, name: u.name || u.email?.split("@")[0] || "Member" }
                                    : {
                                        id: m.user_id,
                                        name: "Member",
                                        avatar_url: null,
                                        email: "",
                                    },
                            };
                        });

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
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            const textarea = document.createElement("textarea");
            textarea.value = shareUrl;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const currentMember = members.find((m) => m.user_id === currentUserId);

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground">
                        {trip.name}
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {trip.trip_duration_days && (
                            <span className="inline-flex items-center border-2 border-foreground px-3 py-1 text-sm font-bold text-foreground">
                                {trip.trip_duration_days} days
                            </span>
                        )}
                        {trip.group_size && (
                            <span className="inline-flex items-center border-2 border-foreground px-3 py-1 text-sm font-bold text-foreground">
                                {trip.group_size} travelers
                            </span>
                        )}
                        {trip.destination && (
                            <span className="inline-flex items-center border-2 border-foreground px-3 py-1 text-sm font-bold text-foreground">
                                ⌖ {trip.destination}
                            </span>
                        )}
                    </div>
                </div>

                {/* Share Link Card */}
                <div className="mt-8 border-4 border-foreground p-6">
                    <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
                        Share This Link
                    </h3>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 border-2 border-foreground bg-background px-4 py-3 font-mono text-sm text-foreground select-all overflow-x-auto">
                            {shareUrl}
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`shrink-0 px-4 py-3 text-sm font-black uppercase transition-all border-4 border-foreground ${
                                copied
                                    ? "bg-foreground text-background"
                                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
                            }`}
                        >
                            {copied ? "✓ Copied" : "Copy"}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-muted font-medium">
                        Code: <span className="font-mono font-black text-foreground">{trip.share_code}</span>
                    </p>
                </div>

                {/* Progress */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                            Team Progress
                        </h2>
                        <span className="text-sm font-bold text-foreground">
                            {submittedCount}/{members.length}
                        </span>
                    </div>
                    <div className="h-4 border-2 border-foreground overflow-hidden">
                        <div
                            className="h-full bg-foreground transition-all duration-700 ease-out"
                            style={{
                                width: `${members.length > 0 ? (submittedCount / members.length) * 100 : 0}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Members List */}
                <div className="mt-6 space-y-0">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center gap-4 border-4 border-foreground p-4 -mt-1 first:mt-0"
                        >
                            {member.user.avatar_url ? (
                                <img
                                    src={member.user.avatar_url}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 object-cover border-2 border-foreground"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center bg-foreground text-background font-black text-sm">
                                    {member.user.name.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground truncate">
                                        {member.user.name}
                                    </span>
                                    {member.user_id === trip.leader_id && (
                                        <span className="shrink-0 text-xs border-2 border-foreground px-2 py-0.5 font-black uppercase">
                                            ⚑ Leader
                                        </span>
                                    )}
                                    {member.user_id === currentUserId && (
                                        <span className="shrink-0 text-xs text-muted font-bold">(You)</span>
                                    )}
                                </div>
                                <p className="text-xs text-muted truncate">{member.user.email}</p>
                            </div>

                            <div className="shrink-0">
                                {member.has_submitted ? (
                                    <span className="inline-flex items-center border-2 border-foreground bg-foreground text-background px-3 py-1 text-xs font-black uppercase">
                                        ✓ Done
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center border-2 border-foreground px-3 py-1 text-xs font-black uppercase text-foreground">
                                        Pending
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {trip.group_size &&
                        members.length < trip.group_size &&
                        Array.from({ length: trip.group_size - members.length }).map(
                            (_, i) => (
                                <div
                                    key={`empty-${i}`}
                                    className="flex items-center gap-4 border-4 border-dashed border-foreground p-4 -mt-1 opacity-40"
                                >
                                    <div className="flex h-10 w-10 items-center justify-center border-2 border-dashed border-foreground text-foreground font-black">
                                        ?
                                    </div>
                                    <span className="text-sm text-foreground font-medium">
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
                            className="block w-full btn-brutal py-4 text-center text-lg"
                        >
                            Fill In Your Preferences ↗
                        </Link>
                    </div>
                )}

                {/* All submitted */}
                {allSubmitted && (
                    <div className="mt-8 border-4 border-foreground bg-foreground text-background p-6 text-center animate-fade-in">
                        <h3 className="text-lg font-black uppercase tracking-tight">
                            ✓ All Preferences Collected
                        </h3>
                        <p className="mt-1 text-sm opacity-80">
                            Everyone&apos;s submitted. Time to let the AI work.
                        </p>
                        {isLeader ? (
                            trip.destination ? (
                                <GenerateDirectButton tripId={trip.id} destination={trip.destination} />
                            ) : (
                                <Link
                                    href={`/trip/${trip.id}/locations`}
                                    className="mt-4 inline-flex items-center gap-2 border-4 border-background bg-background text-foreground px-8 py-3 text-base font-black uppercase tracking-tight transition-all hover:bg-transparent hover:text-background"
                                >
                                    Generate Plan ↗
                                </Link>
                            )
                        ) : (
                            <p className="mt-3 text-sm opacity-80">
                                The trip leader will generate the plan soon.
                            </p>
                        )}
                    </div>
                )}

                {/* Not all submitted yet */}
                {!allSubmitted && members.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted font-medium">
                            Waiting for{" "}
                            <span className="font-black text-foreground">
                                {members.length - submittedCount} more
                            </span>{" "}
                            {members.length - submittedCount === 1 ? "person" : "people"} to
                            submit
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function GenerateDirectButton({ tripId, destination }: { tripId: string; destination: string }) {
    const router = useRouter();
    const [phase, setPhase] = useState<"idle" | "synthesizing" | "generating" | "error">("idle");
    const [error, setError] = useState("");

    const handleGenerate = async () => {
        setPhase("synthesizing");
        setError("");

        try {
            const synthRes = await fetch(`/api/trips/${tripId}/synthesize`, { method: "POST" });
            const synthData = await synthRes.json();
            if (!synthRes.ok) throw new Error(synthData.error);

            setPhase("generating");
            const itinRes = await fetch(`/api/trips/${tripId}/generate-itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destination, synthesis: synthData.synthesis }),
            });
            const itinData = await itinRes.json();
            if (!itinRes.ok) throw new Error(itinData.error);

            router.push(`/trip/${tripId}/itinerary`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setPhase("error");
        }
    };

    if (phase === "synthesizing" || phase === "generating") {
        return (
            <div className="mt-4">
                <div className="inline-flex items-center gap-2 border-4 border-background bg-background text-foreground px-8 py-3 text-base font-black uppercase animate-pulse">
                    {phase === "synthesizing" ? "Analyzing..." : `Building ${destination}...`}
                </div>
                <p className="mt-2 text-xs opacity-60">This may take 2-3 minutes. Good things take time.</p>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="mt-4">
                <p className="text-sm mb-2 opacity-80">{error}</p>
                <button
                    onClick={handleGenerate}
                    className="inline-flex items-center gap-2 border-4 border-background bg-background text-foreground px-8 py-3 text-base font-black uppercase transition-all hover:bg-transparent hover:text-background"
                >
                    Try Again ↗
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleGenerate}
            className="mt-4 inline-flex items-center gap-2 border-4 border-background bg-background text-foreground px-8 py-3 text-base font-black uppercase tracking-tight transition-all hover:bg-transparent hover:text-background"
        >
            Generate for {destination} ↗
        </button>
    );
}
