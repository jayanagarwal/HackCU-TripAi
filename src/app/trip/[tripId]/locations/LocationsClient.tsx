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
    "🔍 Analyzing your group's preferences...",
    "🧠 Synthesizing vibes, budgets, and dietary needs...",
    "🗺️ Scoring 20 destinations against your group profile...",
    "✨ Finding the perfect matches...",
    "📊 Ranking destinations by group fit...",
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
        "idle" | "synthesizing" | "recommending" | "generating" | "done" | "error"
    >(existingRecommendations.length > 0 ? "done" : "idle");
    const [recommendations, setRecommendations] = useState<Recommendation[]>(
        existingRecommendations
    );
    const [synthesis, setSynthesis] = useState<Record<string, unknown> | null>(null);
    const [error, setError] = useState("");
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);

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
                    <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl gradient-bg-animated text-5xl text-white shadow-xl animate-pulse-glow">
                        🤖
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {phase === "generating"
                            ? `Building your ${generatingFor} itinerary...`
                            : "AI is working its magic"}
                    </h1>
                    <p className="mt-4 text-lg text-muted animate-fade-in" key={loadingMsgIndex}>
                        {phase === "generating"
                            ? "Creating a personalized day-by-day plan for your group..."
                            : loadingMessages[loadingMsgIndex]}
                    </p>

                    {/* Progress dots */}
                    <div className="mt-8 flex justify-center gap-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`h-3 w-3 rounded-full transition-all duration-500 ${(phase === "synthesizing" && i === 0) ||
                                        (phase === "recommending" && i <= 1) ||
                                        (phase === "generating" && i <= 2)
                                        ? "gradient-bg scale-110"
                                        : "bg-border"
                                    }`}
                            />
                        ))}
                    </div>

                    <p className="mt-4 text-xs text-muted">
                        This may take 10-20 seconds — hang tight!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-4xl px-4 sm:px-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-foreground">
                        {recommendations.length > 0
                            ? "✨ AI Recommendations"
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
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-4xl">
                            🧠
                        </div>
                        <p className="text-muted max-w-md mx-auto mb-6">
                            Our AI will synthesize everyone&apos;s preferences, score 20 US destinations,
                            and recommend the best matches for your group.
                        </p>
                        {isLeader ? (
                            <button
                                onClick={handleAnalyze}
                                className="inline-flex items-center gap-2 rounded-full gradient-bg px-8 py-3.5 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
                            >
                                Analyze & Recommend 🚀
                            </button>
                        ) : (
                            <p className="text-muted">
                                Waiting for the trip leader to start the analysis...
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
                        {error}
                        <button
                            onClick={() => {
                                setPhase("idle");
                                setError("");
                            }}
                            className="ml-3 font-medium underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Recommendation cards */}
                {recommendations.length > 0 && phase === "done" && (
                    <div className="mt-8 space-y-6">
                        {recommendations.map((rec, index) => {
                            const name = rec.name || rec.destination;
                            const budget = rec.estimatedBudgetPerPerson || rec.estimated_budget_pp;
                            return (
                                <div
                                    key={index}
                                    className="rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary-light"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                        {/* Score ring */}
                                        <div className="shrink-0 flex flex-col items-center">
                                            <div
                                                className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white ${rec.score >= 80
                                                        ? "bg-emerald-500"
                                                        : rec.score >= 60
                                                            ? "bg-amber-500"
                                                            : "bg-red-400"
                                                    }`}
                                            >
                                                {rec.score}
                                            </div>
                                            <span className="mt-1 text-[10px] text-muted uppercase tracking-wider">
                                                Score
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold text-foreground">
                                                        {index === 0 && "🥇 "}
                                                        {index === 1 && "🥈 "}
                                                        {index === 2 && "🥉 "}
                                                        {name}
                                                    </h3>
                                                    {budget && (
                                                        <p className="text-sm text-muted mt-0.5">
                                                            ~${budget.toLocaleString()}/person for {tripDuration} days
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="mt-3 text-sm text-foreground/80">
                                                {rec.reasoning}
                                            </p>

                                            {/* Pros & Cons */}
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
                                                        ✅ Pros
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {rec.pros.map((pro, i) => (
                                                            <p key={i} className="text-xs text-foreground/70">
                                                                • {pro}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                                                        ⚠️ Tradeoffs
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {rec.cons.map((con, i) => (
                                                            <p key={i} className="text-xs text-foreground/70">
                                                                • {con}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Choose button */}
                                            {isLeader && (
                                                <button
                                                    onClick={() => handleChooseDestination(name)}
                                                    className={`mt-4 w-full sm:w-auto rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${index === 0
                                                            ? "gradient-bg text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                                                            : "border border-border bg-card text-foreground hover:border-primary-light hover:bg-indigo-50"
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
