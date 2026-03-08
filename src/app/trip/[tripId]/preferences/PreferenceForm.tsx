"use client";

import { useState, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";

const VoiceConversation = lazy(() => import("@/components/VoiceConversation"));

// ── Vibe config ──
const vibes = [
    { key: "vibe_beach", symbol: "~", label: "Beach & Water" },
    { key: "vibe_city", symbol: "□", label: "City & Urban" },
    { key: "vibe_nature", symbol: "▲", label: "Nature & Outdoors" },
    { key: "vibe_culture", symbol: "✹", label: "Art & Culture" },
    { key: "vibe_relaxation", symbol: "○", label: "Relaxation & Wellness" },
    { key: "vibe_nightlife", symbol: "♪", label: "Nightlife & Entertainment" },
    { key: "vibe_adventure", symbol: "↑", label: "Adventure & Sports" },
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
    const [showVoice, setShowVoice] = useState(false);
    const [voiceCaptured, setVoiceCaptured] = useState(false);

    const handleVoiceComplete = (prefs: any) => {
        // Auto-populate all form fields from extracted voice data
        if (prefs.budget_max != null) setBudget(prefs.budget_max as number);
        if (prefs.activity_level) setActivityLevel(prefs.activity_level as string);
        if (prefs.accommodation_pref) setAccommodationPref(prefs.accommodation_pref as string);
        if (prefs.dietary_restrictions) setDietary(prefs.dietary_restrictions as string[]);
        if (prefs.dietary_notes) setDietaryNotes(prefs.dietary_notes as string);
        if (prefs.must_haves) setMustHaves(prefs.must_haves as string[]);
        if (prefs.dealbreakers) setDealbreakers(prefs.dealbreakers as string[]);
        if (prefs.additional_notes) setAdditionalNotes(prefs.additional_notes as string);

        // Populate vibe ratings
        const newVibes = { ...vibeRatings };
        for (const key of Object.keys(newVibes)) {
            if (prefs[key] != null) {
                newVibes[key] = prefs[key] as number;
            }
        }
        setVibeRatings(newVibes);

        setShowVoice(false);
        setVoiceCaptured(true);
        setStep(steps.length - 1); // Jump to summary
    };

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
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-black uppercase tracking-widest text-foreground">
                            {steps[step]} ({step + 1}/{steps.length})
                        </span>
                        <span className="font-bold text-foreground">{tripName}</span>
                    </div>
                    <div className="h-3 border-2 border-foreground overflow-hidden">
                        <div
                            className="h-full bg-foreground transition-all duration-500 ease-out"
                            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* ── Step 0: Welcome ── */}
                {step === 0 && (
                    <div className="text-center animate-fade-in">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-4 border-foreground text-4xl font-black">
                            ✹
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground">
                            Hey{userName ? `, ${userName.split(" ")[0]}` : ""}
                        </h1>
                        <p className="mt-3 text-lg text-muted max-w-md mx-auto">
                            Let&apos;s figure out your dream trip. This takes about 2 minutes
                            — just tell us what you love.
                        </p>
                        {alreadySubmitted && (
                            <div className="mt-4 border-2 border-foreground px-4 py-3 text-sm font-bold text-foreground">
                                You already submitted — editing your preferences
                            </div>
                        )}

                        {/* Voice option */}
                        <button
                            onClick={() => setShowVoice(true)}
                            className="mt-8 w-full max-w-md mx-auto flex items-center gap-3 border-4 border-dashed border-foreground p-4 text-left transition-all hover:bg-foreground hover:text-background group"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-4 border-foreground text-xl font-black group-hover:bg-background group-hover:text-foreground">
                                ♪
                            </div>
                            <div>
                                <div className="font-black uppercase text-foreground group-hover:text-background">Prefer to talk?</div>
                                <div className="text-xs text-muted group-hover:text-background/70">Tell our AI about your ideal trip — we&apos;ll fill the form for you</div>
                            </div>
                        </button>

                        <div className="mt-4 flex items-center gap-3 max-w-md mx-auto">
                            <div className="flex-1 h-px bg-foreground" />
                            <span className="text-xs font-bold text-foreground uppercase">or fill out the form</span>
                            <div className="flex-1 h-px bg-foreground" />
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            className="mt-4 btn-brutal px-10 py-3.5 text-lg"
                        >
                            Let&apos;s Go ↗
                        </button>
                    </div>
                )}

                {/* Voice captured banner */}
                {voiceCaptured && step === steps.length - 1 && (
                    <div className="mb-4 border-4 border-foreground bg-foreground text-background px-4 py-3 text-sm font-bold animate-fade-in">
                        ♪ Here&apos;s what I captured from our chat — review and submit when you&apos;re ready!
                    </div>
                )}

                {/* ── Step 1: Budget ── */}
                {step === 1 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                                Budget
                            </h2>
                            <p className="mt-2 text-muted">
                                Total spending for the whole trip (not per day)
                            </p>
                        </div>

                        <div className="border-4 border-foreground p-8">
                            <div className="text-center mb-6">
                                <span className="text-5xl font-black text-foreground">
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
                                className="w-full"
                            />
                            <div className="flex justify-between mt-2 text-xs font-bold text-foreground">
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
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                                Rate Your Vibes
                            </h2>
                            <p className="mt-2 text-muted">
                                Drag each slider to show how much you&apos;re into it
                            </p>
                        </div>

                        <div className="space-y-0">
                            {vibes.map(({ key, symbol, label }) => (
                                <div
                                    key={key}
                                    className="border-4 border-foreground p-4 -mt-1 first:mt-0"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="flex items-center gap-2 font-bold text-foreground">
                                            <span className="text-xl font-black">{symbol}</span> {label}
                                        </span>
                                        <span className="flex h-8 w-8 items-center justify-center border-2 border-foreground text-sm font-black">
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
                                        className="w-full"
                                    />
                                    <div className="flex justify-between mt-1 text-[10px] font-bold text-muted uppercase">
                                        <span>Meh</span>
                                        <span>Love it</span>
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
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                                Dietary Needs
                            </h2>
                            <p className="mt-2 text-muted">
                                Select any restrictions — we&apos;ll make sure restaurants accommodate
                                you
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-0">
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
                                    className={`border-4 border-foreground -mt-1 -ml-1 p-3 text-sm font-bold transition-all ${
                                        dietary.includes(option)
                                            ? "bg-foreground text-background"
                                            : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                    }`}
                                >
                                    {dietary.includes(option) ? "✓ " : ""}
                                    {option}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-black uppercase text-foreground mb-2">
                                Anything else about food?
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g., I'm allergic to shellfish, love spicy food..."
                                value={dietaryNotes}
                                onChange={(e) => setDietaryNotes(e.target.value)}
                                className="w-full border-4 border-foreground bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none transition-all resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* ── Step 4: Activity Preferences ── */}
                {step === 4 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                                Activity Style
                            </h2>
                            <p className="mt-2 text-muted">How packed do you want each day?</p>
                        </div>

                        {/* Pace */}
                        <div>
                            <label className="block text-sm font-black uppercase text-foreground mb-3">
                                Ideal pace
                            </label>
                            <div className="grid grid-cols-3 gap-0">
                                {[
                                    {
                                        value: "chill",
                                        symbol: "○",
                                        label: "Chill",
                                        desc: "2-3 activities/day",
                                    },
                                    {
                                        value: "moderate",
                                        symbol: "◑",
                                        label: "Moderate",
                                        desc: "3-4 activities/day",
                                    },
                                    {
                                        value: "packed",
                                        symbol: "●",
                                        label: "Packed",
                                        desc: "5+ activities/day",
                                    },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setActivityLevel(option.value)}
                                        className={`border-4 border-foreground -ml-1 first:ml-0 p-4 text-center transition-all ${
                                            activityLevel === option.value
                                                ? "bg-foreground text-background"
                                                : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                        }`}
                                    >
                                        <div className="text-2xl mb-1 font-black">{option.symbol}</div>
                                        <div className="text-sm font-black uppercase">{option.label}</div>
                                        <div className="text-[11px] opacity-70 mt-0.5">
                                            {option.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accommodation */}
                        <div>
                            <label className="block text-sm font-black uppercase text-foreground mb-3">
                                Accommodation preference
                            </label>
                            <div className="grid grid-cols-3 gap-0">
                                {[
                                    { value: "budget", symbol: "△", label: "Budget" },
                                    { value: "mid-range", symbol: "□", label: "Mid-range" },
                                    { value: "luxury", symbol: "✹", label: "Luxury" },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setAccommodationPref(option.value)}
                                        className={`border-4 border-foreground -ml-1 first:ml-0 p-4 text-center transition-all ${
                                            accommodationPref === option.value
                                                ? "bg-foreground text-background"
                                                : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                        }`}
                                    >
                                        <div className="text-2xl mb-1 font-black">{option.symbol}</div>
                                        <div className="text-sm font-black uppercase">{option.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Must-haves */}
                        <div>
                            <label className="block text-sm font-black uppercase text-foreground mb-3">
                                Must-haves ✓
                            </label>
                            <div className="flex flex-wrap gap-0">
                                {mustHaveOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setMustHaves(toggleArray(mustHaves, option))}
                                        className={`border-4 border-foreground -ml-1 -mt-1 px-3.5 py-1.5 text-sm font-bold transition-all ${
                                            mustHaves.includes(option)
                                                ? "bg-foreground text-background"
                                                : "bg-background text-foreground hover:bg-foreground hover:text-background"
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
                            <label className="block text-sm font-black uppercase text-foreground mb-3">
                                Dealbreakers ✗
                            </label>
                            <div className="flex flex-wrap gap-0">
                                {dealbreakerOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() =>
                                            setDealbreakers(toggleArray(dealbreakers, option))
                                        }
                                        className={`border-4 border-foreground -ml-1 -mt-1 px-3.5 py-1.5 text-sm font-bold transition-all ${
                                            dealbreakers.includes(option)
                                                ? "bg-foreground text-background"
                                                : "bg-background text-foreground hover:bg-foreground hover:text-background"
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
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">
                                Anything Else?
                            </h2>
                            <p className="mt-2 text-muted">
                                Last step. Share anything the group should know.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-black uppercase text-foreground mb-2">
                                Notes for the group
                            </label>
                            <textarea
                                rows={3}
                                placeholder="e.g., I just want to chill on a beach and maybe do some hiking"
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="w-full border-4 border-foreground bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Summary preview */}
                        <div className="border-4 border-foreground p-6">
                            <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-4">
                                Your Preference Summary
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-foreground/20 pb-2">
                                    <span className="font-bold uppercase text-muted">Budget</span>
                                    <span className="font-black">${budget.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-b border-foreground/20 pb-2">
                                    <span className="font-bold uppercase text-muted">Pace</span>
                                    <span className="font-black uppercase">{activityLevel}</span>
                                </div>
                                <div className="flex justify-between border-b border-foreground/20 pb-2">
                                    <span className="font-bold uppercase text-muted">Stay</span>
                                    <span className="font-black uppercase">
                                        {accommodationPref}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-foreground/20 pb-2">
                                    <span className="font-bold uppercase text-muted">Top vibe</span>
                                    <span className="font-black">
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
                                            <span className="font-bold uppercase text-muted">Dietary</span>
                                            <span className="font-black">
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
                    <div className="mt-4 border-4 border-foreground px-4 py-3 text-sm font-bold text-foreground">
                        {error}
                    </div>
                )}

                {/* Navigation buttons */}
                {step > 0 && (
                    <div className="mt-8 flex gap-0">
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="flex-1 btn-brutal-outline py-3.5"
                        >
                            ← Back
                        </button>
                        {step < steps.length - 1 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="flex-1 btn-brutal py-3.5 -ml-1"
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 btn-brutal py-3.5 -ml-1 disabled:opacity-50"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2 animate-pulse">
                                        Saving...
                                    </span>
                                ) : (
                                    "Submit Preferences ↗"
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Voice conversation modal */}
            {showVoice && (
                <Suspense fallback={null}>
                    <VoiceConversation
                        userName={userName}
                        onComplete={handleVoiceComplete}
                        onClose={() => setShowVoice(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}
