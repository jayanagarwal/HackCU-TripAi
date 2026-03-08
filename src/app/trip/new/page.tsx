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
                <div className="mb-10">
                    <span className="text-3xl">⚑</span>
                    <h1 className="mt-2 text-5xl sm:text-6xl font-black uppercase tracking-tighter text-foreground leading-[0.9]">
                        PLAN
                        <br />
                        A TRIP
                    </h1>
                    <p className="mt-4 text-sm font-bold uppercase tracking-wide text-muted">
                        SET UP THE BASICS. WE&apos;LL HANDLE THE REST.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-0">
                    {/* Trip Name */}
                    <div className="border-t-2 border-foreground py-8">
                        <label className="block text-sm font-black uppercase tracking-wide text-foreground mb-3">
                            WHAT SHOULD WE CALL THIS TRIP?
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="E.G., SUMMER ROAD TRIP 2026"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full border-0 border-b-2 border-foreground/30 bg-transparent px-0 py-3 text-base font-bold uppercase text-foreground placeholder:text-muted/50 focus:border-foreground focus:outline-none focus:ring-0 transition-colors"
                        />
                    </div>

                    {/* Origin City */}
                    <div className="border-t-2 border-foreground py-8">
                        <label className="block text-sm font-black uppercase tracking-wide text-foreground mb-1">
                            WHERE ARE YOU TRAVELING FROM?
                        </label>
                        <p className="text-xs font-bold uppercase tracking-wide text-muted mb-3">
                            USED FOR LOGISTICS AND COST ESTIMATES
                        </p>
                        <input
                            type="text"
                            placeholder="E.G., DENVER, CO"
                            value={formData.origin_city}
                            onChange={(e) =>
                                setFormData({ ...formData, origin_city: e.target.value })
                            }
                            className="w-full border-0 border-b-2 border-foreground/30 bg-transparent px-0 py-3 text-base font-bold uppercase text-foreground placeholder:text-muted/50 focus:border-foreground focus:outline-none focus:ring-0 transition-colors"
                        />
                    </div>

                    {/* Group Size */}
                    <div className="border-t-2 border-foreground py-8">
                        <label className="block text-sm font-black uppercase tracking-wide text-foreground mb-4">
                            HOW MANY TRAVELERS?
                        </label>
                        <div className="flex items-center gap-6">
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
                                className="flex-1"
                            />
                            <span className="flex h-14 w-14 items-center justify-center border-4 border-foreground text-xl font-black text-foreground">
                                {formData.group_size}
                            </span>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="border-t-2 border-foreground py-8">
                        <label className="block text-sm font-black uppercase tracking-wide text-foreground mb-4">
                            TRIP DURATION
                        </label>
                        <div className="grid grid-cols-5 gap-0">
                            {[3, 4, 5, 6, 7].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() =>
                                        setFormData({ ...formData, trip_duration_days: days })
                                    }
                                    className={`border-2 border-foreground py-4 text-center font-black uppercase text-sm transition-colors -ml-[2px] first:ml-0 ${formData.trip_duration_days === days
                                        ? "bg-foreground text-background"
                                        : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                        }`}
                                >
                                    {days} DAYS
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Flexibility */}
                    <div className="border-t-2 border-foreground py-8">
                        <label className="block text-sm font-black uppercase tracking-wide text-foreground mb-4">
                            WHEN ARE YOU GOING?
                        </label>
                        <div className="grid grid-cols-2 gap-0">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, dateFlexibility: "flexible" })
                                }
                                className={`border-2 border-foreground p-5 text-center transition-colors ${formData.dateFlexibility === "flexible"
                                    ? "bg-foreground text-background"
                                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                    }`}
                            >
                                <div className="text-sm font-black uppercase">FLEXIBLE</div>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, dateFlexibility: "specific" })
                                }
                                className={`border-2 border-foreground -ml-[2px] p-5 text-center transition-colors ${formData.dateFlexibility === "specific"
                                    ? "bg-foreground text-background"
                                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                    }`}
                            >
                                <div className="text-sm font-black uppercase">SPECIFIC DATES</div>
                            </button>
                        </div>

                        {formData.dateFlexibility === "specific" && (
                            <div className="mt-6 grid grid-cols-2 gap-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-2">
                                        START DATE
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, start_date: e.target.value })
                                        }
                                        className="w-full border-2 border-foreground bg-transparent px-3 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-muted mb-2">
                                        END DATE
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, end_date: e.target.value })
                                        }
                                        className="w-full border-2 border-foreground bg-transparent px-3 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-0"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Destination Toggle */}
                    <div className="border-t-2 border-foreground py-8">
                        <label className="block text-sm font-black uppercase tracking-wide text-foreground mb-4">
                            DESTINATION IN MIND?
                        </label>
                        <div className="grid grid-cols-2 gap-0">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, hasDestination: false })
                                }
                                className={`border-2 border-foreground p-5 text-center transition-colors ${!formData.hasDestination
                                    ? "bg-foreground text-background"
                                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                    }`}
                            >
                                <div className="text-sm font-black uppercase">AI DECIDES</div>
                                <div className="text-xs font-bold text-inherit/60 mt-1 uppercase">
                                    BASED ON GROUP PREFS
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, hasDestination: true })
                                }
                                className={`border-2 border-foreground -ml-[2px] p-5 text-center transition-colors ${formData.hasDestination
                                    ? "bg-foreground text-background"
                                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
                                    }`}
                            >
                                <div className="text-sm font-black uppercase">WE KNOW</div>
                                <div className="text-xs font-bold text-inherit/60 mt-1 uppercase">
                                    ENTER DESTINATION
                                </div>
                            </button>
                        </div>

                        {formData.hasDestination && (
                            <div className="mt-6 animate-fade-in">
                                <input
                                    type="text"
                                    placeholder="E.G., SAVANNAH, GA"
                                    value={formData.destination}
                                    onChange={(e) =>
                                        setFormData({ ...formData, destination: e.target.value })
                                    }
                                    className="w-full border-0 border-b-2 border-foreground/30 bg-transparent px-0 py-3 text-base font-bold uppercase text-foreground placeholder:text-muted/50 focus:border-foreground focus:outline-none focus:ring-0 transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="border-4 border-foreground bg-background px-4 py-3 text-sm font-bold uppercase text-foreground">
                            ✗ {error}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="border-t-2 border-foreground pt-8">
                        <button
                            type="submit"
                            disabled={loading || !formData.name}
                            className="btn-brutal w-full py-5 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="inline-block h-5 w-5 border-3 border-background border-t-transparent animate-spin" style={{ borderRadius: 0 }} />
                                    CREATING TRIP...
                                </span>
                            ) : (
                                "CREATE TRIP & GET SHARE LINK ↗"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
