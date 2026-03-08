"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const supabase = createClient();

        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSignIn = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null);
        setMenuOpen(false);
        window.location.href = "/";
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-2xl">✈️</span>
                        <span className="text-xl font-bold gradient-text group-hover:opacity-80 transition-opacity">
                            TripSync
                        </span>
                    </Link>

                    {/* Right side */}
                    <div className="flex items-center gap-4">
                        {loading ? (
                            <div className="h-8 w-20 bg-border rounded-full animate-pulse" />
                        ) : user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 transition-all hover:border-primary-light hover:shadow-sm"
                                >
                                    {user.user_metadata?.avatar_url ? (
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt=""
                                            className="h-7 w-7 rounded-full"
                                        />
                                    ) : (
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-bg text-white text-xs font-bold">
                                            {(user.user_metadata?.name || user.email || "U")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                    )}
                                    <span className="hidden sm:inline text-sm font-medium text-foreground">
                                        {user.user_metadata?.name || user.email?.split("@")[0]}
                                    </span>
                                    <svg
                                        className={`h-4 w-4 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card shadow-lg animate-fade-in overflow-hidden">
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setMenuOpen(false)}
                                            className="block px-4 py-2.5 text-sm text-foreground hover:bg-card-hover transition-colors"
                                        >
                                            🗺️ My Trips
                                        </Link>
                                        <Link
                                            href="/trip/new"
                                            onClick={() => setMenuOpen(false)}
                                            className="block px-4 py-2.5 text-sm text-foreground hover:bg-card-hover transition-colors"
                                        >
                                            ➕ Plan a Trip
                                        </Link>
                                        <hr className="border-border" />
                                        <button
                                            onClick={handleSignOut}
                                            className="block w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50 transition-colors"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={handleSignIn}
                                className="rounded-full gradient-bg px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                            >
                                Sign in with Google
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
