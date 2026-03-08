"use client";

import { useState } from "react";
import Link from "next/link";

interface Activity {
    time: string;
    name: string;
    description: string;
    participants: string[];
    type: "group" | "solo" | "subgroup";
    estimated_cost_pp: number;
    category: "food" | "activity" | "transportation" | "free";
    reasoning: string;
}

interface Day {
    day_number: number;
    date: string;
    theme: string;
    activities: Activity[];
}

interface Accommodation {
    name: string;
    type: string;
    cost_per_night: number;
    reasoning: string;
}

interface ItineraryData {
    days: Day[];
    accommodation?: Accommodation;
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
}

const typeColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    group: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", label: "👥 Group" },
    solo: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", label: "🧍 Solo" },
    subgroup: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", label: "👫 Subgroup" },
};

const categoryIcons: Record<string, string> = {
    food: "🍽️",
    activity: "🎯",
    transportation: "🚗",
    free: "🌟",
};

export default function ItineraryView({
    trip,
    itinerary,
    destination,
    members,
}: ItineraryViewProps) {
    const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
    const [activeDay, setActiveDay] = useState(0);

    const days = itinerary?.days || [];
    const accommodation = itinerary?.accommodation;
    const budgetSummary = itinerary?.budget_summary;

    return (
        <div className="min-h-screen pb-16 page-transition">
            {/* Sticky header */}
            <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
                <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-foreground">{trip.name}</h1>
                            <p className="text-xs text-muted">
                                📍 {destination} · {trip.trip_duration_days || days.length} days
                            </p>
                        </div>
                        <Link
                            href={`/trip/${trip.id}/status`}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card-hover transition-all"
                        >
                            ← Back
                        </Link>
                    </div>

                    {/* Day tabs */}
                    <div className="mt-2 flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                        {days.map((day, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveDay(i)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeDay === i
                                        ? "gradient-bg text-white shadow-sm"
                                        : "text-muted hover:bg-card-hover"
                                    }`}
                            >
                                Day {day.day_number}
                            </button>
                        ))}
                        {accommodation && (
                            <button
                                onClick={() => setActiveDay(-1)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeDay === -1
                                        ? "gradient-bg text-white shadow-sm"
                                        : "text-muted hover:bg-card-hover"
                                    }`}
                            >
                                🏨 Stay
                            </button>
                        )}
                        {budgetSummary && (
                            <button
                                onClick={() => setActiveDay(-2)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeDay === -2
                                        ? "gradient-bg text-white shadow-sm"
                                        : "text-muted hover:bg-card-hover"
                                    }`}
                            >
                                💰 Budget
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
                {/* Day view */}
                {activeDay >= 0 && days[activeDay] && (
                    <div className="animate-fade-in">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-foreground">
                                Day {days[activeDay].day_number}: {days[activeDay].theme}
                            </h2>
                            <p className="text-sm text-muted mt-1">{days[activeDay].date}</p>
                        </div>

                        {/* Timeline */}
                        <div className="relative">
                            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                            <div className="space-y-4">
                                {days[activeDay].activities.map((activity, i) => {
                                    const typeStyle = typeColors[activity.type] || typeColors.group;
                                    const reasoningKey = `${activeDay}-${i}`;
                                    const isExpanded = expandedReasoning === reasoningKey;

                                    return (
                                        <div key={i} className="relative flex gap-4">
                                            {/* Timeline dot */}
                                            <div
                                                className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${typeStyle.bg} ${typeStyle.border} border`}
                                            >
                                                {categoryIcons[activity.category] || "📌"}
                                            </div>

                                            {/* Card */}
                                            <div
                                                className={`flex-1 rounded-xl border ${typeStyle.border} ${typeStyle.bg} p-4 transition-all hover:shadow-sm`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-muted">
                                                                {activity.time}
                                                            </span>
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeStyle.text} ${typeStyle.bg} border ${typeStyle.border}`}
                                                            >
                                                                {typeStyle.label}
                                                            </span>
                                                        </div>
                                                        <h3 className="mt-1 font-semibold text-foreground">
                                                            {activity.name}
                                                        </h3>
                                                        <p className="mt-0.5 text-sm text-foreground/70">
                                                            {activity.description}
                                                        </p>
                                                    </div>
                                                    {activity.estimated_cost_pp > 0 && (
                                                        <span className="shrink-0 rounded-lg bg-white/80 border border-border px-2 py-1 text-xs font-medium text-foreground">
                                                            ${activity.estimated_cost_pp}/pp
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Participants */}
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {activity.participants.map((p, j) => (
                                                        <span
                                                            key={j}
                                                            className="rounded-full bg-white/80 border border-border px-2 py-0.5 text-[11px] font-medium text-foreground"
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
                                                        className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                                    >
                                                        💡 {isExpanded ? "Hide reasoning" : "Why this?"}
                                                    </button>
                                                )}
                                                {isExpanded && activity.reasoning && (
                                                    <p className="mt-2 rounded-lg bg-white/60 border border-border p-3 text-xs text-foreground/70 animate-fade-in">
                                                        {activity.reasoning}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Accommodation view */}
                {activeDay === -1 && accommodation && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold text-foreground mb-6">
                            🏨 Accommodation
                        </h2>
                        <div className="rounded-2xl border border-border bg-card p-6">
                            <h3 className="text-xl font-bold text-foreground">
                                {accommodation.name}
                            </h3>
                            <div className="mt-2 flex gap-3">
                                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 capitalize">
                                    {accommodation.type}
                                </span>
                                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                                    ${accommodation.cost_per_night}/night
                                </span>
                            </div>
                            <p className="mt-4 text-sm text-foreground/70">
                                {accommodation.reasoning}
                            </p>
                        </div>
                    </div>
                )}

                {/* Budget view */}
                {activeDay === -2 && budgetSummary && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            💰 Budget Breakdown
                        </h2>
                        <p className="text-sm text-muted mb-6">
                            Group total: <span className="font-semibold text-foreground">${budgetSummary.group_total?.toLocaleString()}</span>
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {Object.entries(budgetSummary.per_person || {}).map(
                                ([name, budget]) => (
                                    <div
                                        key={name}
                                        className="rounded-xl border border-border bg-card p-4"
                                    >
                                        <h3 className="font-semibold text-foreground">{name}</h3>
                                        <p className="text-xl font-bold gradient-text mt-1">
                                            ${budget.total?.toLocaleString()}
                                        </p>
                                        <div className="mt-3 space-y-2">
                                            {[
                                                { label: "🏨 Accommodation", value: budget.accommodation },
                                                { label: "🍽️ Food", value: budget.food },
                                                { label: "🎯 Activities", value: budget.activities },
                                                { label: "🚗 Transportation", value: budget.transportation },
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="flex justify-between text-xs text-muted"
                                                >
                                                    <span>{item.label}</span>
                                                    <span className="font-medium text-foreground">
                                                        ${item.value?.toLocaleString() || 0}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
