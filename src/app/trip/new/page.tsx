"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTripPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        origin_city: "",
        hasDestination: false,
        destination: "",
        dateFlexibility: "flexible" as "flexible" | "specific",
        start_date: "",
        end_date: "",
        trip_duration_days: 4,
        group_size: 4,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/trips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    origin_city: formData.origin_city || null,
                    destination: formData.hasDestination ? formData.destination : null,
                    start_date:
                        formData.dateFlexibility === "specific"
                            ? formData.start_date
                            : null,
                    end_date:
                        formData.dateFlexibility === "specific" ? formData.end_date : null,
                    trip_duration_days: formData.trip_duration_days,
                    group_size: formData.group_size,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create trip");
            }

            router.push(`/trip/${data.trip.id}/status`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-2xl px-4 sm:px-6">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
                        🗺️
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Plan a Trip</h1>
                    <p className="mt-2 text-muted">
                        Set up the basics and share with your crew
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-10 space-y-8">
                    {/* Trip Name */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            What should we call this trip? ✏️
                        </label>
                        <input
                            type="text"
                            required
                            placeholder='e.g., "Summer Road Trip 2026"'
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Origin City */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            Where are you traveling from? 🏠
                        </label>
                        <input
                            type="text"
                            placeholder='e.g., "Denver, CO" or "New York, NY"'
                            value={formData.origin_city}
                            onChange={(e) =>
                                setFormData({ ...formData, origin_city: e.target.value })
                            }
                            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        <p className="mt-1 text-xs text-muted">Used for flight/drive cost estimates</p>
                    </div>

                    {/* Group Size */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            How many travelers? 👥
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="2"
                                max="12"
                                value={formData.group_size}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        group_size: parseInt(e.target.value),
                                    })
                                }
                                className="flex-1 accent-[var(--primary)]"
                            />
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-lg font-bold text-foreground">
                                {formData.group_size}
                            </span>
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            Trip duration 📅
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {[3, 4, 5, 6, 7].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() =>
                                        setFormData({ ...formData, trip_duration_days: days })
                                    }
                                    className={`rounded-xl border py-3 text-center font-medium transition-all ${formData.trip_duration_days === days
                                        ? "border-primary bg-primary text-white shadow-md"
                                        : "border-border bg-card text-foreground hover:border-primary-light"
                                        }`}
                                >
                                    {days} days
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Flexibility */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            When are you going? 🗓️
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, dateFlexibility: "flexible" })
                                }
                                className={`rounded-xl border p-4 text-center transition-all ${formData.dateFlexibility === "flexible"
                                    ? "border-primary bg-indigo-50 text-primary shadow-sm"
                                    : "border-border bg-card text-foreground hover:border-primary-light"
                                    }`}
                            >
                                <div className="text-2xl mb-1">🤷</div>
                                <div className="font-medium text-sm">We&apos;re Flexible</div>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, dateFlexibility: "specific" })
                                }
                                className={`rounded-xl border p-4 text-center transition-all ${formData.dateFlexibility === "specific"
                                    ? "border-primary bg-indigo-50 text-primary shadow-sm"
                                    : "border-border bg-card text-foreground hover:border-primary-light"
                                    }`}
                            >
                                <div className="text-2xl mb-1">📆</div>
                                <div className="font-medium text-sm">Specific Dates</div>
                            </button>
                        </div>

                        {formData.dateFlexibility === "specific" && (
                            <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-in">
                                <div>
                                    <label className="block text-xs text-muted mb-1">
                                        Start date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, start_date: e.target.value })
                                        }
                                        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-muted mb-1">
                                        End date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, end_date: e.target.value })
                                        }
                                        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Destination Toggle */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                            Do you already have a destination in mind? 📍
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, hasDestination: false })
                                }
                                className={`rounded-xl border p-4 text-center transition-all ${!formData.hasDestination
                                    ? "border-primary bg-indigo-50 text-primary shadow-sm"
                                    : "border-border bg-card text-foreground hover:border-primary-light"
                                    }`}
                            >
                                <div className="text-2xl mb-1">🤖</div>
                                <div className="font-medium text-sm">AI will suggest</div>
                                <div className="text-xs text-muted mt-1">
                                    Based on group preferences
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, hasDestination: true })
                                }
                                className={`rounded-xl border p-4 text-center transition-all ${formData.hasDestination
                                    ? "border-primary bg-indigo-50 text-primary shadow-sm"
                                    : "border-border bg-card text-foreground hover:border-primary-light"
                                    }`}
                            >
                                <div className="text-2xl mb-1">✅</div>
                                <div className="font-medium text-sm">We know where</div>
                                <div className="text-xs text-muted mt-1">
                                    Enter your destination
                                </div>
                            </button>
                        </div>

                        {formData.hasDestination && (
                            <div className="mt-4 animate-fade-in">
                                <input
                                    type="text"
                                    placeholder="e.g., Savannah, GA"
                                    value={formData.destination}
                                    onChange={(e) =>
                                        setFormData({ ...formData, destination: e.target.value })
                                    }
                                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !formData.name}
                        className="w-full rounded-xl gradient-bg py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                                Creating trip...
                            </span>
                        ) : (
                            "Create Trip & Get Share Link 🔗"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
