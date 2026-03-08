"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Vibe config ──
const vibes = [
    { key: "vibe_beach", emoji: "🏖️", label: "Beach & Water" },
    { key: "vibe_city", emoji: "🏙️", label: "City & Urban" },
    { key: "vibe_nature", emoji: "🌲", label: "Nature & Outdoors" },
    { key: "vibe_culture", emoji: "🎨", label: "Art & Culture" },
    { key: "vibe_relaxation", emoji: "🧘", label: "Relaxation & Wellness" },
    { key: "vibe_nightlife", emoji: "🎉", label: "Nightlife & Entertainment" },
    { key: "vibe_adventure", emoji: "🏔️", label: "Adventure & Sports" },
] as const;

const dietaryOptions = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Halal",
    "Kosher",
    "Nut Allergy",
    "Dairy-Free",
    "None",
];

const mustHaveOptions = [
    "Good WiFi",
    "Pool",
    "Near beach",
    "Pet-friendly",
    "Walkable area",
    "Public transit",
    "Free parking",
];

const dealbreakerOptions = [
    "Long drives (3+ hrs)",
    "Extreme heat",
    "Extreme cold",
    "Crowds",
    "Remote areas",
    "No nightlife",
];

interface PreferenceFormProps {
    tripId: string;
    tripName: string;
    userName: string;
    existingPrefs: Record<string, unknown> | null;
    alreadySubmitted: boolean;
}

export default function PreferenceForm({
    tripId,
    tripName,
    userName,
    existingPrefs,
    alreadySubmitted,
}: PreferenceFormProps) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ── Form state ──
    const [budget, setBudget] = useState(
        (existingPrefs?.budget_max as number) || 800
    );
    const [vibeRatings, setVibeRatings] = useState<Record<string, number>>({
        vibe_beach: (existingPrefs?.vibe_beach as number) || 3,
        vibe_city: (existingPrefs?.vibe_city as number) || 3,
        vibe_nature: (existingPrefs?.vibe_nature as number) || 3,
        vibe_culture: (existingPrefs?.vibe_culture as number) || 3,
        vibe_relaxation: (existingPrefs?.vibe_relaxation as number) || 3,
        vibe_nightlife: (existingPrefs?.vibe_nightlife as number) || 3,
        vibe_adventure: (existingPrefs?.vibe_adventure as number) || 3,
    });
    const [dietary, setDietary] = useState<string[]>(
        (existingPrefs?.dietary_restrictions as string[]) || []
    );
    const [dietaryNotes, setDietaryNotes] = useState(
        (existingPrefs?.dietary_notes as string) || ""
    );
    const [activityLevel, setActivityLevel] = useState<string>(
        (existingPrefs?.activity_level as string) || "moderate"
    );
    const [accommodationPref, setAccommodationPref] = useState<string>(
        (existingPrefs?.accommodation_pref as string) || "mid-range"
    );
    const [mustHaves, setMustHaves] = useState<string[]>(
        (existingPrefs?.must_haves as string[]) || []
    );
    const [dealbreakers, setDealbreakers] = useState<string[]>(
        (existingPrefs?.dealbreakers as string[]) || []
    );
    const [additionalNotes, setAdditionalNotes] = useState(
        (existingPrefs?.additional_notes as string) || ""
    );

    const steps = [
        "Welcome",
        "Budget",
        "Vibes",
        "Dietary",
        "Activities",
        "Open-ended",
    ];

    const toggleArray = (arr: string[], item: string) =>
        arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/trips/${tripId}/preferences`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    budget_min: Math.max(200, budget - 200),
                    budget_max: budget,
                    ...vibeRatings,
                    dietary_restrictions: dietary.filter((d) => d !== "None"),
                    dietary_notes: dietaryNotes || null,
                    activity_level: activityLevel,
                    accommodation_pref: accommodationPref,
                    must_haves: mustHaves,
                    dealbreakers: dealbreakers,
                    additional_notes: additionalNotes || null,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            router.push(`/trip/${tripId}/status`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 pb-16 page-transition">
            <div className="mx-auto max-w-2xl px-4 sm:px-6">
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between text-xs text-muted mb-2">
                        <span>
                            {steps[step]} ({step + 1}/{steps.length})
                        </span>
                        <span className="font-medium text-foreground">{tripName}</span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                        <div
                            className="h-full rounded-full gradient-bg transition-all duration-500 ease-out"
                            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* ── Step 0: Welcome ── */}
                {step === 0 && (
                    <div className="text-center animate-fade-in">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-4xl">
                            👋
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Hey{userName ? `, ${userName.split(" ")[0]}` : ""}!
                        </h1>
                        <p className="mt-3 text-lg text-muted max-w-md mx-auto">
                            Let&apos;s figure out your dream trip. This takes about 2 minutes
                            — just tell us what you love.
                        </p>
                        {alreadySubmitted && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                ✏️ You already submitted — editing your preferences
                            </div>
                        )}
                        <button
                            onClick={() => setStep(1)}
                            className="mt-8 inline-flex items-center gap-2 rounded-full gradient-bg px-8 py-3.5 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                            Let&apos;s Go! 🚀
                        </button>
                    </div>
                )}

                {/* ── Step 1: Budget ── */}
                {step === 1 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-foreground">
                                💰 What&apos;s your budget?
                            </h2>
                            <p className="mt-2 text-muted">
                                Total spending for the whole trip (not per day)
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-card p-8">
                            <div className="text-center mb-6">
                                <span className="text-5xl font-bold gradient-text">
                                    ${budget.toLocaleString()}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="200"
                                max="3000"
                                step="50"
                                value={budget}
                                onChange={(e) => setBudget(parseInt(e.target.value))}
                                className="w-full accent-[var(--primary)]"
                            />
                            <div className="flex justify-between mt-2 text-xs text-muted">
                                <span>$200</span>
                                <span>$1500</span>
                                <span>$3000</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Vibes ── */}
                {step === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-foreground">
                                ✨ Rate your vibes
                            </h2>
                            <p className="mt-2 text-muted">
                                Drag each slider to show how much you&apos;re into it
                            </p>
                        </div>

                        <div className="space-y-4">
                            {vibes.map(({ key, emoji, label }) => (
                                <div
                                    key={key}
                                    className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary-light"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="flex items-center gap-2 font-medium text-foreground">
                                            <span className="text-xl">{emoji}</span> {label}
                                        </span>
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-primary">
                                            {vibeRatings[key]}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={vibeRatings[key]}
                                        onChange={(e) =>
                                            setVibeRatings({
                                                ...vibeRatings,
                                                [key]: parseInt(e.target.value),
                                            })
                                        }
                                        className="w-full accent-[var(--primary)]"
                                    />
                                    <div className="flex justify-between mt-1 text-[10px] text-muted">
                                        <span>Meh</span>
                                        <span>Love it!</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 3: Dietary ── */}
                {step === 3 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-foreground">
                                🍽️ Dietary needs
                            </h2>
                            <p className="mt-2 text-muted">
                                Select any restrictions — we&apos;ll make sure restaurants accommodate
                                you
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {dietaryOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        if (option === "None") {
                                            setDietary(["None"]);
                                        } else {
                                            setDietary(
                                                toggleArray(
                                                    dietary.filter((d) => d !== "None"),
                                                    option
                                                )
                                            );
                                        }
                                    }}
                                    className={`rounded-xl border p-3 text-sm font-medium transition-all ${dietary.includes(option)
                                            ? "border-primary bg-indigo-50 text-primary shadow-sm"
                                            : "border-border bg-card text-foreground hover:border-primary-light"
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                Anything else about food? (optional)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g., I'm allergic to shellfish, love spicy food..."
                                value={dietaryNotes}
                                onChange={(e) => setDietaryNotes(e.target.value)}
                                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* ── Step 4: Activity Preferences ── */}
                {step === 4 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-foreground">
                                🏃 Activity style
                            </h2>
                            <p className="mt-2 text-muted">How packed do you want each day?</p>
                        </div>

                        {/* Pace */}
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-3">
                                Ideal pace
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    {
                                        value: "chill",
                                        emoji: "😌",
                                        label: "Chill",
                                        desc: "2-3 activities/day",
                                    },
                                    {
                                        value: "moderate",
                                        emoji: "😊",
                                        label: "Moderate",
                                        desc: "3-4 activities/day",
                                    },
                                    {
                                        value: "packed",
                                        emoji: "🤩",
                                        label: "Packed",
                                        desc: "5+ activities/day",
                                    },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setActivityLevel(option.value)}
                                        className={`rounded-xl border p-4 text-center transition-all ${activityLevel === option.value
                                                ? "border-primary bg-indigo-50 text-primary shadow-sm"
                                                : "border-border bg-card text-foreground hover:border-primary-light"
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{option.emoji}</div>
                                        <div className="text-sm font-semibold">{option.label}</div>
                                        <div className="text-[11px] text-muted mt-0.5">
                                            {option.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accommodation */}
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-3">
                                Accommodation preference
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: "budget", emoji: "🏕️", label: "Budget" },
                                    { value: "mid-range", emoji: "🏨", label: "Mid-range" },
                                    { value: "luxury", emoji: "✨", label: "Luxury" },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setAccommodationPref(option.value)}
                                        className={`rounded-xl border p-4 text-center transition-all ${accommodationPref === option.value
                                                ? "border-primary bg-indigo-50 text-primary shadow-sm"
                                                : "border-border bg-card text-foreground hover:border-primary-light"
                                            }`}
                                    >
                                        <div className="text-2xl mb-1">{option.emoji}</div>
                                        <div className="text-sm font-semibold">{option.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Must-haves */}
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-3">
                                Must-haves ✅
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {mustHaveOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setMustHaves(toggleArray(mustHaves, option))}
                                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${mustHaves.includes(option)
                                                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                                : "border-border bg-card text-foreground hover:border-emerald-300"
                                            }`}
                                    >
                                        {mustHaves.includes(option) ? "✓ " : ""}
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dealbreakers */}
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-3">
                                Dealbreakers 🚫
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {dealbreakerOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() =>
                                            setDealbreakers(toggleArray(dealbreakers, option))
                                        }
                                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${dealbreakers.includes(option)
                                                ? "border-red-400 bg-red-50 text-red-700"
                                                : "border-border bg-card text-foreground hover:border-red-300"
                                            }`}
                                    >
                                        {dealbreakers.includes(option) ? "✗ " : ""}
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 5: Open-ended ── */}
                {step === 5 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-foreground">
                                💬 Anything else?
                            </h2>
                            <p className="mt-2 text-muted">
                                Last step! Share anything the group should know.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                Anything the group should know?
                            </label>
                            <textarea
                                rows={3}
                                placeholder="e.g., I just want to chill on a beach and maybe do some hiking"
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                        </div>

                        {/* Summary preview */}
                        <div className="rounded-2xl border border-border bg-card p-6">
                            <h3 className="text-sm font-semibold text-foreground mb-4">
                                📋 Your preference summary
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted">Budget</span>
                                    <span className="font-medium">${budget.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Pace</span>
                                    <span className="font-medium capitalize">{activityLevel}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Stay</span>
                                    <span className="font-medium capitalize">
                                        {accommodationPref}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted">Top vibe</span>
                                    <span className="font-medium">
                                        {
                                            vibes.find(
                                                (v) =>
                                                    vibeRatings[v.key] ===
                                                    Math.max(...Object.values(vibeRatings))
                                            )?.label
                                        }
                                    </span>
                                </div>
                                {dietary.length > 0 &&
                                    !dietary.includes("None") && (
                                        <div className="flex justify-between">
                                            <span className="text-muted">Dietary</span>
                                            <span className="font-medium">
                                                {dietary.join(", ")}
                                            </span>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Navigation buttons */}
                {step > 0 && (
                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="flex-1 rounded-xl border border-border bg-card py-3.5 font-medium text-foreground transition-all hover:bg-card-hover"
                        >
                            ← Back
                        </button>
                        {step < steps.length - 1 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="flex-1 rounded-xl gradient-bg py-3.5 font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 rounded-xl gradient-bg py-3.5 font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
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
                                        Saving...
                                    </span>
                                ) : (
                                    "Submit Preferences ✨"
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
