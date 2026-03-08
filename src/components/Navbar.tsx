"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./ThemeProvider";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

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
        <nav className="fixed top-0 left-0 right-0 z-50 border-b-4 border-foreground bg-background">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-xl font-black uppercase tracking-tighter text-foreground group-hover:text-inverted transition-colors">
                            ✹ TRIPSYNC
                        </span>
                    </Link>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex h-9 w-9 items-center justify-center border-2 border-foreground bg-background text-foreground transition-all hover:bg-foreground hover:text-background"
                            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {theme === "dark" ? "☀" : "●"}
                        </button>
                        {loading ? (
                            <div className="h-9 w-20 border-2 border-foreground animate-pulse" />
                        ) : user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className="flex items-center gap-2 border-2 border-foreground px-3 py-1.5 transition-all hover:bg-foreground hover:text-background"
                                >
                                    {user.user_metadata?.avatar_url ? (
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt=""
                                            width={28}
                                            height={28}
                                            className="h-7 w-7 object-cover border-2 border-foreground"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="flex h-7 w-7 items-center justify-center bg-foreground text-background text-xs font-black">
                                            {(user.user_metadata?.name || user.email || "U")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                    )}
                                    <span className="hidden sm:inline text-sm font-bold text-inherit uppercase">
                                        {user.user_metadata?.name || user.email?.split("@")[0]}
                                    </span>
                                    <span className={`text-xs transition-transform ${menuOpen ? "rotate-180" : ""}`}>
                                        ▼
                                    </span>
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 mt-1 w-48 border-4 border-foreground bg-background animate-fade-in">
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setMenuOpen(false)}
                                            className="block px-4 py-2.5 text-sm font-bold text-foreground uppercase hover:bg-foreground hover:text-background transition-colors"
                                        >
                                            ↗ My Trips
                                        </Link>
                                        <Link
                                            href="/trip/new"
                                            onClick={() => setMenuOpen(false)}
                                            className="block px-4 py-2.5 text-sm font-bold text-foreground uppercase hover:bg-foreground hover:text-background transition-colors"
                                        >
                                            + Plan a Trip
                                        </Link>
                                        <div className="border-t-2 border-foreground" />
                                        <button
                                            onClick={handleSignOut}
                                            className="block w-full px-4 py-2.5 text-left text-sm font-bold text-foreground uppercase hover:bg-foreground hover:text-background transition-colors"
                                        >
                                            ✗ Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={handleSignIn}
                                className="btn-brutal text-sm px-4 py-2"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
