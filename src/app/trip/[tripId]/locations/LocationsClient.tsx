"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Recommendation {
    id?: string;
    destination: string;
    name?: string;
    score: number;
    pros: string[];
    cons: string[];
    estimated_budget_pp?: number;
    estimatedBudgetPerPerson?: number;
    reasoning: string;
}

interface LocationsClientProps {
    tripId: string;
    tripName: string;
    tripDuration: number;
    isLeader: boolean;
    existingRecommendations: Recommendation[];
}

const loadingMessages = [
    "Analyzing your group's preferences...",
    "Synthesizing vibes, budgets, and dietary needs...",
    "Scoring 20 destinations against your group profile...",
    "Finding the perfect matches...",
    "Ranking destinations by group fit...",
];

export default function LocationsClient({
    tripId,
    tripName,
    tripDuration,
    isLeader,
    existingRecommendations,
}: LocationsClientProps) {
    const router = useRouter();
    const [phase, setPhase] = useState<
        "idle" | "synthesizing" | "recommending" | "generating" | "done" | "error" | "budget_warning"
    >(existingRecommendations.length > 0 ? "done" : "idle");
    const [recommendations, setRecommendations] = useState<Recommendation[]>(
        existingRecommendations
    );
    const [synthesis, setSynthesis] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState("");
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [budgetWarning, setBudgetWarning] = useState<{
        message: string;
        lowest_budget: number;
        lowest_budget_member: string;
        cheapest_destination: string;
        cheapest_estimated_cost: number;
        options: string[];
        all_recommendations: Recommendation[];
    } | null>(null);

    // Cycle through loading messages
    useEffect(() => {
        if (phase !== "synthesizing" && phase !== "recommending" && phase !== "generating") return;
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [phase]);

    const handleAnalyze = async () => {
        setPhase("synthesizing");
        setError("");

        try {
            // Step 1: Synthesize preferences
            const synthRes = await fetch(`/api/trips/${tripId}/synthesize`, {
                method: "POST",
            });
            const synthData = await synthRes.json();
            if (!synthRes.ok) throw new Error(synthData.error);
            setSynthesis(synthData.synthesis);

            // Step 2: Get location recommendations
            setPhase("recommending");
            const recRes = await fetch(`/api/trips/${tripId}/recommend-locations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ synthesis: synthData.synthesis }),
            });
            const recData = await recRes.json();
            if (!recRes.ok) throw new Error(recData.error);

            // Check for budget_insufficient response
            if (recData.status === "budget_insufficient") {
                setBudgetWarning(recData);
                setPhase("budget_warning");
                return;
            }

            setRecommendations(recData.recommendations || []);
            setPhase("done");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setPhase("error");
        }
    };

    const handleChooseDestination = async (destination: string) => {
        setGeneratingFor(destination);
        setPhase("generating");
        setError("");

        try {
            const res = await fetch(`/api/trips/${tripId}/generate-itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destination, synthesis }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            router.push(`/trip/${tripId}/itinerary`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Itinerary generation failed");
            setPhase("done");
            setGeneratingFor(null);
        }
    };

    // Loading state
    if (phase === "synthesizing" || phase === "recommending" || phase === "generating") {
        return (
            <div className="min-h-screen pt-24 pb-16 page-transition">
                <div className="mx-auto max-w-2xl px-4 text-center">
                    <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center animate-pulse">
                        <svg className="w-20 h-20 text-foreground" viewBox="0 0 100 100" fill="currentColor">
                            <g transform="translate(50,50)">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <rect key={i} x="-2" y="-45" width="4" height="45" transform={`rotate(${i * 18})`} />
                                ))}
                            </g>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                        {phase === "generating"
                            ? `Building ${generatingFor} itinerary...`
                            : "AI is working"}
                    </h1>
                    <p className="mt-4 text-lg text-muted animate-fade-in" key={loadingMsgIndex}>
                        {phase === "generating"
                            ? "Creating a personalized day-by-day plan for your group..."
                            : loadingMessages[loadingMsgIndex]}
                    </p>

                    {/* Progress steps */}
                    <div className="mt-8 flex justify-center gap-0">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`h-4 w-16 border-2 border-foreground -ml-0.5 first:ml-0 transition-all duration-500 ${
                                    (phase === "synthesizing" && i === 0) ||
                                    (phase === "recommending" && i <= 1) ||
                                    (phase === "generating" && i <= 2)
                                        ? "bg-foreground"
                                        : "bg-background"
                                }`}
                            />
                        ))}
                    </div>

                    <p className="mt-4 text-xs text-muted font-bold">
                        This may take 2-3 minutes. Good things take time.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground">
                        {recommendations.length > 0
                            ? "AI Recommendations"
                            : `Where should ${tripName} go?`}
                    </h1>
                    <p className="mt-2 text-muted">
                        {recommendations.length > 0
                            ? "Based on your group's combined preferences"
                            : "Let our AI analyze your group's preferences and find the perfect destination"}
                    </p>
                </div>

                {/* Idle state — trigger analysis */}
                {phase === "idle" && (
                    <div className="mt-12 text-center">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                            <svg className="w-16 h-16 text-foreground" viewBox="0 0 100 100" fill="currentColor">
                                <g transform="translate(50,50)">
                                    {Array.from({ length: 20 }).map((_, i) => (
                                        <rect key={i} x="-2" y="-45" width="4" height="45" transform={`rotate(${i * 18})`} />
                                    ))}
                                </g>
                            </svg>
                        </div>
                        <p className="text-muted max-w-md mx-auto mb-6">
                            Our AI will synthesize everyone&apos;s preferences, score 20 US destinations,
                            and recommend the best matches for your group.
                        </p>
                        {isLeader ? (
                            <button
                                onClick={handleAnalyze}
                                className="btn-brutal px-10 py-3.5 text-lg"
                            >
                                Analyze & Recommend ↗
                            </button>
                        ) : (
                            <p className="text-muted font-bold">
                                Waiting for the trip leader to start the analysis...
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-8 border-4 border-foreground px-4 py-3 text-sm font-bold text-foreground text-center">
                        {error}
                        <button
                            onClick={() => {
                                setPhase("idle");
                                setError("");
                            }}
                            className="ml-3 font-black underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Budget warning */}
                {phase === "budget_warning" && budgetWarning && (
                    <div className="mt-8 animate-fade-in">
                        <div className="border-4 border-foreground p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center border-4 border-foreground text-2xl font-black">
                                    !
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                                        Budget Mismatch
                                    </h3>
                                    <p className="mt-1 text-sm text-muted">
                                        {budgetWarning.message}
                                    </p>
                                    <div className="mt-3 space-y-1">
                                        {budgetWarning.options.map((opt, i) => (
                                            <p key={i} className="text-sm text-foreground">
                                                {i + 1}. {opt}
                                            </p>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-0">
                                        <button
                                            onClick={() => router.push(`/trip/${tripId}/preferences`)}
                                            className="btn-brutal-outline px-5 py-2 text-sm"
                                        >
                                            ← Adjust Budgets
                                        </button>
                                        <button
                                            onClick={() => {
                                                setRecommendations(
                                                    budgetWarning.all_recommendations.map((r: any) => ({
                                                        ...r,
                                                        destination: r.name || r.destination,
                                                    }))
                                                );
                                                setBudgetWarning(null);
                                                setPhase("done");
                                            }}
                                            className="btn-brutal px-5 py-2 text-sm -ml-1"
                                        >
                                            Show Plans Anyway →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recommendation cards */}
                {recommendations.length > 0 && phase === "done" && (
                    <div className="mt-8 space-y-0">
                        {recommendations.map((rec, index) => {
                            const name = rec.name || rec.destination;
                            const budget = rec.estimatedBudgetPerPerson || rec.estimated_budget_pp;
                            return (
                                <div
                                    key={index}
                                    className="border-4 border-foreground p-6 -mt-1 first:mt-0 transition-all hover:bg-foreground/5"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                        {/* Score box */}
                                        <div className="shrink-0 flex flex-col items-center">
                                            <div className="flex h-16 w-16 items-center justify-center border-4 border-foreground text-xl font-black bg-foreground text-background">
                                                {rec.score}
                                            </div>
                                            <span className="mt-1 text-[10px] font-black text-muted uppercase tracking-widest">
                                                Score
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tight text-foreground">
                                                        {String(index + 1).padStart(2, "0")}. {name}
                                                    </h3>
                                                    {budget && (
                                                        <p className="text-sm text-muted font-bold mt-0.5">
                                                            ~${budget.toLocaleString()}/person for {tripDuration} days
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="mt-3 text-sm text-foreground/80">
                                                {rec.reasoning}
                                            </p>

                                            {/* Pros & Cons */}
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest mb-2">
                                                        ✓ Pros
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {rec.pros.map((pro, i) => (
                                                            <p key={i} className="text-xs text-foreground/70">
                                                                — {pro}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-foreground uppercase tracking-widest mb-2">
                                                        ✗ Tradeoffs
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {rec.cons.map((con, i) => (
                                                            <p key={i} className="text-xs text-foreground/70">
                                                                — {con}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Choose button */}
                                            {isLeader && (
                                                <button
                                                    onClick={() => handleChooseDestination(name)}
                                                    className={`mt-4 w-full sm:w-auto px-6 py-2.5 text-sm font-black uppercase transition-all border-4 border-foreground ${
                                                        index === 0
                                                            ? "bg-foreground text-background hover:bg-background hover:text-foreground"
                                                            : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                                    }`}
                                                >
                                                    Choose {name} →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
