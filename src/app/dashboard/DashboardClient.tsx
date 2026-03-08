"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TripData {
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
    submitted_count: number;
    my_estimated_cost: number | null;
}

interface DashboardClientProps {
    trips: TripData[];
}

const statusColors: Record<string, string> = {
    collecting: "bg-foreground text-background",
    ready: "bg-foreground text-background",
    planning: "bg-foreground text-background",
    complete: "bg-foreground text-background",
};

const statusLabels: Record<string, string> = {
    collecting: "Collecting Preferences",
    ready: "Ready to Plan",
    planning: "AI Planning",
    complete: "Trip Planned!",
};

export default function DashboardClient({ trips: initialTrips }: DashboardClientProps) {
    const router = useRouter();
    const [trips, setTrips] = useState(initialTrips);
    const [deleteTarget, setDeleteTarget] = useState<TripData | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);

        try {
            const res = await fetch(`/api/trips/${deleteTarget.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                // Optimistic removal
                setTrips((prev) => prev.filter((t) => t.id !== deleteTarget.id));
                setDeleteTarget(null);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete trip");
            }
        } catch {
            alert("Network error — please try again");
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (d: string | null) => {
        if (!d) return null;
        return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <>
            <div className="min-h-screen pt-24 pb-16 page-transition">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-foreground">MY TRIPS</h1>
                            <p className="mt-1 text-sm font-bold uppercase tracking-wide text-muted">
                                PLAN, JOIN, AND MANAGE YOUR GROUP ADVENTURES
                            </p>
                        </div>
                        <Link
                            href="/trip/new"
                            className="btn-brutal text-sm px-5 py-2.5"
                        >
                            + PLAN A TRIP
                        </Link>
                    </div>

                    {trips.length === 0 ? (
                        /* Empty state */
                        <div className="mt-16 flex flex-col items-center justify-center text-center">
                            <div className="flex h-24 w-24 items-center justify-center border-4 border-foreground text-5xl">
                                ✈
                            </div>
                            <h2 className="mt-6 text-xl font-black uppercase tracking-tighter text-foreground">
                                NO TRIPS YET
                            </h2>
                            <p className="mt-2 max-w-sm text-sm font-bold uppercase tracking-wide text-muted">
                                START PLANNING YOUR FIRST GROUP TRIP OR JOIN ONE WITH A SHARE CODE.
                            </p>
                            <Link
                                href="/trip/new"
                                className="mt-6 btn-brutal text-base px-8 py-3"
                            >
                                PLAN YOUR FIRST TRIP ↗
                            </Link>
                        </div>
                    ) : (
                        /* Trip cards */
                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            {trips.map((trip) => {
                                const isComplete = trip.status === "complete";
                                const isCollecting = trip.status === "collecting";

                                const cardHref = isComplete
                                    ? `/trip/${trip.id}/itinerary`
                                    : trip.is_leader
                                        ? `/trip/${trip.id}/status`
                                        : trip.has_submitted
                                            ? `/trip/${trip.id}/status`
                                            : `/trip/${trip.id}/preferences`;

                                return (
                                    <div
                                        key={trip.id}
                                        className="group border-4 border-foreground bg-card p-6 transition-all hover:bg-card-hover"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <Link
                                                    href={cardHref}
                                                    className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors"
                                                >
                                                    {trip.name}
                                                </Link>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-black uppercase ${statusColors[trip.status] || statusColors.collecting}`}
                                                    >
                                                        {statusLabels[trip.status] || trip.status}
                                                    </span>
                                                    {trip.is_leader && (
                                                        <span className="inline-flex items-center bg-foreground text-background px-2.5 py-0.5 text-xs font-black uppercase">
                                                            ★ LEADER
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Delete button — leader only */}
                                                {trip.is_leader && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setDeleteTarget(trip);
                                                        }}
                                                        className="p-1.5 text-muted hover:text-foreground transition-all"
                                                        title="Delete trip"
                                                    >
                                                        <svg
                                                            className="h-4 w-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={1.5}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                                <Link href={cardHref}>
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
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Info row */}
                                        <div className="mt-4 flex items-center gap-4 text-sm text-muted">
                                            <span className="flex items-center gap-1">
                                                👥 {trip.member_count}
                                                {trip.group_size ? ` / ${trip.group_size}` : ""} travelers
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

                                        {/* Complete trip summary */}
                                        {isComplete && (
                                            <div className="mt-4 pt-4 border-t border-border">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        {trip.start_date && trip.end_date && (
                                                            <p className="text-xs text-muted">
                                                                🗓️ {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                                                            </p>
                                                        )}
                                                        {trip.my_estimated_cost != null && (
                                                            <p className="text-lg font-black text-foreground mt-1">
                                                                ${trip.my_estimated_cost.toLocaleString()}
                                                                <span className="text-xs font-normal text-muted ml-1">
                                                                    your est. cost
                                                                </span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Link
                                                        href={`/trip/${trip.id}/itinerary`}
                                                        className="btn-brutal text-xs px-4 py-2"
                                                    >
                                                        VIEW ITINERARY ↗
                                                    </Link>
                                                </div>
                                            </div>
                                        )}

                                        {/* Collecting status: show submission progress */}
                                        {isCollecting && (
                                            <div className="mt-4 pt-4 border-t border-border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-muted">Preferences submitted</span>
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {trip.submitted_count} / {trip.member_count}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-border overflow-hidden">
                                                    <div
                                                        className="h-full bg-foreground transition-all duration-500"
                                                        style={{
                                                            width: `${trip.member_count > 0 ? (trip.submitted_count / trip.member_count) * 100 : 0}%`,
                                                        }}
                                                    />
                                                </div>
                                                {trip.submitted_count === trip.member_count && trip.member_count > 0 && (
                                                    <p className="text-xs text-foreground mt-1.5 font-black uppercase">
                                                        ✓ EVERYONE&apos;S IN — READY TO PLAN
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => !deleting && setDeleteTarget(null)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-md border-4 border-foreground bg-card p-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground">
                                <svg
                                    className="h-5 w-5 text-foreground"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-tight text-foreground">
                                DELETE TRIP
                            </h2>
                        </div>

                        <p className="text-sm text-foreground/80 leading-relaxed">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-foreground">
                                {deleteTarget.name}
                            </span>
                            ? This will remove the trip and all associated data for all
                            members. This cannot be undone.
                        </p>

                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="btn-brutal-outline text-sm px-4 py-2 disabled:opacity-50"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="btn-brutal text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        DELETING…
                                    </>
                                ) : (
                                    "DELETE TRIP"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
