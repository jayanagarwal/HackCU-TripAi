"use client";

import { useState, lazy, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const NarrationPlayer = lazy(() => import("@/components/NarrationPlayer"));
const DayMap = dynamic(() => import("@/components/DayMap"), { ssr: false });

interface Activity {
    time: string;
    name: string;
    description: string;
    participants: string[];
    type: "group" | "solo" | "subgroup";
    estimated_cost_pp: number;
    category: "food" | "activity" | "transportation" | "free";
    reasoning: string;
    confidence?: "verified" | "suggested";
    dietary_notes?: string;
    lat?: number;
    lng?: number;
    mapQuery?: string;
    place?: string;
}

interface Day {
    day_number: number;
    date: string;
    theme: string;
    activities: Activity[];
}

interface AccommodationOption {
    name: string;
    type: string;
    cost_per_night: number;
    reasoning: string;
    confidence?: "verified" | "suggested";
}

interface Transportation {
    type: "flight" | "drive" | "mixed";
    estimated_cost_pp: number;
    notes: string;
}

interface ItineraryData {
    days: Day[];
    accommodation?: {
        // New format with options
        options?: AccommodationOption[];
        recommended?: string;
        // Legacy single format
        name?: string;
        type?: string;
        cost_per_night?: number;
        reasoning?: string;
    };
    transportation?: Transportation;
    budget_summary?: {
        per_person: Record<string, { total: number; accommodation: number; food: number; activities: number; transportation: number }>;
        group_total: number;
    };
}

interface Member {
    id: string;
    name: string;
    avatar_url: string | null;
    email: string;
}

interface ItineraryViewProps {
    trip: {
        id: string;
        name: string;
        trip_duration_days: number | null;
        start_date: string | null;
        share_code: string;
    };
    itinerary: ItineraryData;
    destination: string;
    members: Member[];
    memberBudgets?: Record<string, number>;
    currentUserName?: string;
}

const typeColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    group: { bg: "bg-background", border: "border-foreground", text: "text-foreground", label: "■ Group" },
    solo: { bg: "bg-background", border: "border-foreground", text: "text-foreground", label: "○ Solo" },
    subgroup: { bg: "bg-background", border: "border-foreground", text: "text-foreground", label: "◑ Subgroup" },
};

const categoryIcons: Record<string, string> = {
    food: "∷",
    activity: "✹",
    transportation: "→",
    free: "○",
};

export default function ItineraryView({
    trip,
    itinerary,
    destination,
    memberBudgets = {},
    currentUserName,
}: ItineraryViewProps) {
    const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
    const [activeDay, setActiveDay] = useState(-3); // Start on overview
    const [showNarration, setShowNarration] = useState(false);
    const [viewMode, setViewMode] = useState<"group" | "my">("group");
    const [hoveredStop, setHoveredStop] = useState<number | null>(null);

    // Filter activities for "My Schedule" mode
    const isMyActivity = (activity: Activity) => {
        if (viewMode === "group" || !currentUserName) return true;
        return activity.participants.some(
            (p) =>
                p.toLowerCase() === "everyone" ||
                p.toLowerCase() === currentUserName.toLowerCase()
        );
    };

    const days = itinerary?.days || [];
    const accommodation = itinerary?.accommodation;
    const transportation = itinerary?.transportation;
    const budgetSummary = itinerary?.budget_summary;

    // Normalize accommodation to options format
    const accommodationOptions: AccommodationOption[] = accommodation?.options
        ? accommodation.options
        : accommodation?.name
            ? [{ name: accommodation.name, type: accommodation.type || "hotel", cost_per_night: accommodation.cost_per_night || 0, reasoning: accommodation.reasoning || "", confidence: "suggested" as const }]
            : [];

    return (
        <div className="min-h-screen pt-16 pb-16 page-transition">
            {/* Sticky header — below navbar */}
            <div className="sticky top-16 z-30 border-b-4 border-foreground bg-background">
                <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-tight text-foreground">{trip.name}</h1>
                            <p className="text-xs text-muted font-bold">
                                ⌖ {destination} · {trip.trip_duration_days || days.length} days
                            </p>
                        </div>
                        <Link
                            href={`/trip/${trip.id}/status`}
                            className="border-2 border-foreground px-3 py-1.5 text-xs font-black uppercase text-foreground hover:bg-foreground hover:text-background transition-all"
                        >
                            ← Back
                        </Link>
                        <button
                            onClick={() => setShowNarration(true)}
                            className="border-2 border-foreground bg-foreground text-background px-3 py-1.5 text-xs font-black uppercase hover:bg-background hover:text-foreground transition-all"
                        >
                            ♪ Listen
                        </button>
                    </div>

                    {/* Group / My Schedule toggle */}
                    {currentUserName && (
                        <div className="mt-2 flex items-center gap-0">
                            <div className="inline-flex border-2 border-foreground">
                                <button
                                    onClick={() => setViewMode("group")}
                                    className={`px-3 py-1 text-xs font-black uppercase transition-all ${
                                        viewMode === "group"
                                            ? "bg-foreground text-background"
                                            : "text-foreground hover:bg-foreground hover:text-background"
                                    }`}
                                >
                                    ■ Group
                                </button>
                                <button
                                    onClick={() => setViewMode("my")}
                                    className={`px-3 py-1 text-xs font-black uppercase border-l-2 border-foreground transition-all ${
                                        viewMode === "my"
                                            ? "bg-foreground text-background"
                                            : "text-foreground hover:bg-foreground hover:text-background"
                                    }`}
                                >
                                    ○ My Schedule
                                </button>
                            </div>
                            <Link
                                href={`/trip/${trip.id}/budget`}
                                className="ml-auto border-2 border-foreground px-3 py-1.5 text-xs font-black uppercase text-foreground hover:bg-foreground hover:text-background transition-all"
                            >
                                $ Budget
                            </Link>
                        </div>
                    )}

                    {/* Day tabs */}
                    <div className="mt-2 flex gap-0 overflow-x-auto pb-1 -mx-1 px-1">
                        <button
                            onClick={() => setActiveDay(-3)}
                            className={`shrink-0 px-3 py-1.5 text-xs font-black uppercase border-2 border-foreground transition-all ${activeDay === -3 ? "bg-foreground text-background" : "text-foreground hover:bg-foreground hover:text-background"}`}
                        >
                            Overview
                        </button>
                        {days.map((day, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveDay(i)}
                                className={`shrink-0 px-3 py-1.5 text-xs font-black uppercase border-2 border-foreground -ml-0.5 transition-all ${activeDay === i ? "bg-foreground text-background" : "text-foreground hover:bg-foreground hover:text-background"}`}
                            >
                                Day {day.day_number}
                            </button>
                        ))}
                        {budgetSummary && (
                            <button
                                onClick={() => setActiveDay(-2)}
                                className={`shrink-0 px-3 py-1.5 text-xs font-black uppercase border-2 border-foreground -ml-0.5 transition-all ${activeDay === -2 ? "bg-foreground text-background" : "text-foreground hover:bg-foreground hover:text-background"}`}
                            >
                                $ Budget
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
                {/* Overview tab — Transportation + Accommodation */}
                {activeDay === -3 && (
                    <div className="animate-fade-in space-y-6">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">Trip Overview</h2>

                        {/* Transportation */}
                        {transportation && (
                            <div className="border-4 border-foreground p-6">
                                <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                                    {transportation.type === "flight" ? "↑" : transportation.type === "drive" ? "→" : "→↑"} Getting There
                                </h3>
                                <div className="mt-3 flex gap-0">
                                    <span className="border-2 border-foreground px-3 py-1 text-xs font-black uppercase">
                                        {transportation.type}
                                    </span>
                                    <span className="border-2 border-foreground -ml-0.5 px-3 py-1 text-xs font-black bg-foreground text-background">
                                        ~${transportation.estimated_cost_pp}/person
                                    </span>
                                </div>
                                <p className="mt-3 text-sm text-foreground/70">{transportation.notes}</p>
                            </div>
                        )}

                        {/* Accommodation Options */}
                        {accommodationOptions.length > 0 && (
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-foreground mb-3">□ Where to Stay</h3>
                                <div className="space-y-0">
                                    {accommodationOptions.map((option, i) => (
                                        <div
                                            key={i}
                                            className={`border-4 border-foreground p-4 -mt-1 first:mt-0 ${
                                                accommodation?.recommended === option.name
                                                    ? "bg-foreground text-background"
                                                    : ""
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black">{option.name}</h4>
                                                        {accommodation?.recommended === option.name && (
                                                            <span className="border-2 border-current px-2 py-0.5 text-[10px] font-black uppercase">
                                                                ✹ Top Pick
                                                            </span>
                                                        )}
                                                        {option.confidence && (
                                                            <span className="border px-2 py-0.5 text-[10px] font-bold border-current">
                                                                {option.confidence === "verified" ? "✓ Verified" : "? Suggested"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs opacity-70 uppercase font-bold">{option.type}</span>
                                                </div>
                                                <span className="shrink-0 text-base font-black">
                                                    ${option.cost_per_night}/night
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm opacity-70">{option.reasoning}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Day view */}
                {activeDay >= 0 && days[activeDay] && (() => {
                    const dayActivities = days[activeDay].activities.filter(isMyActivity);
                    const mapStops = dayActivities
                        .map((a, i) => (a.lat != null && a.lng != null ? {
                            index: i,
                            name: a.name,
                            time: a.time,
                            description: a.description,
                            lat: a.lat,
                            lng: a.lng,
                            mapQuery: a.mapQuery,
                            place: a.place,
                            category: a.category,
                        } : null))
                        .filter(Boolean) as { index: number; name: string; time: string; description: string; lat: number; lng: number; mapQuery?: string; place?: string; category: string }[];

                    // Build Google Maps multi-stop directions URL
                    const stopsWithPlace = dayActivities.filter((a) => a.place);
                    const fullRouteUrl = stopsWithPlace.length >= 2
                        ? `https://www.google.com/maps/dir/${stopsWithPlace.map((a) => encodeURIComponent(a.place!)).join("/")}`
                        : null;

                    const MARKER_COLORS = [
                        "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
                        "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#3b82f6",
                    ];

                    return (
                    <div className="animate-fade-in">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                                Day {days[activeDay].day_number}: {days[activeDay].theme}
                            </h2>
                            <p className="text-sm text-muted font-bold mt-1">{days[activeDay].date}</p>
                        </div>

                        {/* Leaflet Map */}
                        {mapStops.length > 0 && (
                            <div className="mb-6 space-y-3">
                                <DayMap stops={mapStops} highlightedIndex={hoveredStop} />

                                {/* Legend chips */}
                                <div className="flex flex-wrap gap-0">
                                    {mapStops.map((stop, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1.5 border-2 border-foreground -ml-0.5 first:ml-0 -mt-0.5 first:mt-0 px-2.5 py-1 text-xs font-bold text-foreground"
                                        >
                                            <span
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: "50%",
                                                    background: MARKER_COLORS[i % MARKER_COLORS.length],
                                                    color: "white",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {i + 1}
                                            </span>
                                            {stop.name}
                                        </span>
                                    ))}
                                </div>

                                {/* Open Full Route button */}
                                {fullRouteUrl && (
                                    <a
                                        href={fullRouteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 border-4 border-foreground px-4 py-2 text-sm font-black uppercase text-foreground hover:bg-foreground hover:text-background transition-all"
                                    >
                                        ↗ Open Full Route in Google Maps
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="relative">
                            <div className="absolute left-5 top-0 bottom-0 w-1 bg-foreground" />

                            <div className="space-y-4">
                                {days[activeDay].activities.filter(isMyActivity).map((activity, i) => {
                                    // In "My Schedule" mode, use violet accent for personal activities
                                    const isPersonalActivity =
                                        viewMode === "my" &&
                                        (activity.type === "solo" || activity.type === "subgroup");
                                    const typeStyle = isPersonalActivity
                                        ? {
                                              bg: "bg-foreground/5",
                                              border: "border-foreground",
                                              text: "text-foreground",
                                              label: activity.type === "solo" ? "○ Just You" : "◑ Subgroup",
                                          }
                                        : typeColors[activity.type] || typeColors.group;
                                    const reasoningKey = `${activeDay}-${i}`;
                                    const isExpanded = expandedReasoning === reasoningKey;

                                    return (
                                        <div
                                            key={i}
                                            className="relative flex gap-4"
                                            onMouseEnter={() => setHoveredStop(i)}
                                            onMouseLeave={() => setHoveredStop(null)}
                                        >
                                            {/* Timeline dot */}
                                            <div
                                                className="relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center border-4 border-foreground bg-background text-lg font-black"
                                            >
                                                {categoryIcons[activity.category] || "●"}
                                            </div>

                                            {/* Card */}
                                            <div
                                                className="flex-1 border-4 border-foreground p-4 transition-all hover:bg-foreground/5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-xs font-black text-foreground">
                                                                {activity.time}
                                                            </span>
                                                            <span
                                                                className="border-2 border-foreground px-2 py-0.5 text-[10px] font-black uppercase"
                                                            >
                                                                {typeStyle.label}
                                                            </span>
                                                            {activity.confidence && (
                                                                <span className="border border-foreground px-2 py-0.5 text-[10px] font-bold">
                                                                    {activity.confidence === "verified" ? "✓" : "?"}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="mt-1 font-black text-foreground">
                                                            {activity.name}
                                                        </h3>
                                                        <p className="mt-0.5 text-sm text-foreground/70">
                                                            {activity.description}
                                                        </p>
                                                        {activity.dietary_notes && (
                                                            <p className="mt-1 text-xs font-bold text-foreground">
                                                                ∷ {activity.dietary_notes}
                                                            </p>
                                                        )}
                                                        {activity.mapQuery && (
                                                            <a
                                                                href={`https://www.google.com/maps/search/?api=1&query=${activity.mapQuery}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="mt-1 inline-flex items-center gap-1 text-xs font-black text-foreground underline"
                                                            >
                                                                ⌖ View on Maps
                                                            </a>
                                                        )}
                                                    </div>
                                                    {activity.estimated_cost_pp > 0 && (
                                                        <span className="shrink-0 border-2 border-foreground px-2 py-1 text-xs font-black">
                                                            ${activity.estimated_cost_pp}/pp
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Participants */}
                                                <div className="mt-3 flex flex-wrap gap-0">
                                                    {activity.participants.map((p, j) => (
                                                        <span
                                                            key={j}
                                                            className="border-2 border-foreground -ml-0.5 first:ml-0 px-2 py-0.5 text-[11px] font-bold text-foreground"
                                                        >
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Reasoning toggle */}
                                                {activity.reasoning && (
                                                    <button
                                                        onClick={() =>
                                                            setExpandedReasoning(isExpanded ? null : reasoningKey)
                                                        }
                                                        className="mt-2 flex items-center gap-1 text-[11px] font-black text-foreground underline uppercase"
                                                    >
                                                        {isExpanded ? "Hide reasoning" : "Why this?"}
                                                    </button>
                                                )}
                                                {isExpanded && activity.reasoning && (
                                                    <p className="mt-2 border-2 border-foreground p-3 text-xs text-foreground/70 animate-fade-in">
                                                        {activity.reasoning}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Empty state for My Schedule */}
                        {viewMode === "my" &&
                            days[activeDay].activities.filter(isMyActivity).length === 0 && (
                                <div className="text-center py-12 text-muted">
                                    <p className="text-3xl mb-2 font-black">○</p>
                                    <p className="text-sm font-bold">No scheduled activities for you this day — free time!</p>
                                </div>
                            )}
                    </div>
                    );
                })()}

                {/* Budget view */}
                {activeDay === -2 && budgetSummary && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-2">
                            Budget Breakdown
                        </h2>
                        <p className="text-sm text-muted mb-6">
                            Group total: <span className="font-black text-foreground">${budgetSummary.group_total?.toLocaleString()}</span>
                        </p>

                        {/* Budget warning banner */}
                        {(() => {
                            const overBudgetMembers = Object.entries(budgetSummary.per_person || {}).filter(
                                ([name, b]) => memberBudgets[name] != null && b.total > memberBudgets[name]
                            );
                            if (overBudgetMembers.length === 0) return null;
                            return (
                                <div className="mb-6 border-4 border-foreground px-4 py-3">
                                    <p className="text-sm font-black uppercase text-foreground">
                                        ! Heads up — this plan may exceed some budgets
                                    </p>
                                    <div className="mt-2 space-y-1">
                                        {overBudgetMembers.map(([name, b]) => {
                                            const overBy = b.total - memberBudgets[name];
                                            return (
                                                <p key={name} className="text-xs text-foreground/70">
                                                    {name}'s estimate (${b.total.toLocaleString()}) is ${overBy.toLocaleString()} over their ${memberBudgets[name].toLocaleString()} budget
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid gap-0 sm:grid-cols-2">
                            {Object.entries(budgetSummary.per_person || {}).map(
                                ([name, budget]) => {
                                    const stated = memberBudgets[name];
                                    let borderStyle = "";
                                    let barColor = "bg-foreground";
                                    let statusLabel = "";

                                    if (stated != null) {
                                        const ratio = budget.total / stated;
                                        if (ratio > 1) {
                                            borderStyle = "border-4";
                                            barColor = "bg-foreground";
                                            statusLabel = `$${(budget.total - stated).toLocaleString()} over budget`;
                                        } else if (ratio > 0.9) {
                                            borderStyle = "border-4";
                                            barColor = "bg-foreground";
                                            statusLabel = "Within 10% of budget";
                                        } else {
                                            borderStyle = "border-4";
                                            barColor = "bg-foreground";
                                            statusLabel = `$${(stated - budget.total).toLocaleString()} under budget`;
                                        }
                                    }

                                    return (
                                        <div
                                            key={name}
                                            className={`border-4 border-foreground p-4 -mt-1 -ml-1`}
                                        >
                                            <h3 className="font-black uppercase text-foreground">{name}</h3>
                                            <p className="text-xl font-black text-foreground mt-1">
                                                ${budget.total?.toLocaleString()}
                                            </p>

                                            {/* Budget bar */}
                                            {stated != null && (
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-[10px] font-bold text-muted uppercase mb-1">
                                                        <span>Estimated</span>
                                                        <span>Budget: ${stated.toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-3 border-2 border-foreground overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${barColor}`}
                                                            style={{ width: `${Math.min((budget.total / stated) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-black mt-1 text-foreground">
                                                        {statusLabel}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mt-3 space-y-2">
                                                {[
                                                    { label: "□ Accommodation", value: budget.accommodation },
                                                    { label: "∷ Food", value: budget.food },
                                                    { label: "✹ Activities", value: budget.activities },
                                                    { label: "→ Transportation", value: budget.transportation },
                                                ].map((item) => (
                                                    <div
                                                        key={item.label}
                                                        className="flex justify-between text-xs text-muted"
                                                    >
                                                        <span className="font-bold">{item.label}</span>
                                                        <span className="font-black text-foreground">
                                                            ${item.value?.toLocaleString() || 0}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Narration player modal */}
            {showNarration && (
                <Suspense fallback={null}>
                    <NarrationPlayer
                        tripId={trip.id}
                        itinerary={itinerary}
                        destination={destination}
                        members={[]}
                        onClose={() => setShowNarration(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}
