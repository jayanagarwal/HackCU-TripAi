"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const features = [
  {
    number: "01",
    title: "AI MATCHING",
    description:
      "WE ANALYZE VIBES, BUDGETS, AND DIETS. NO DEBATES.",
  },
  {
    number: "02",
    title: "VOICE INPUT",
    description:
      "TALK TO OUR AI. IT CAPTURES YOUR PREFERENCES INSTANTLY.",
  },
  {
    number: "03",
    title: "SMART PLANS",
    description:
      "DAY-BY-DAY ITINERARIES. SOLO TIME INCLUDED. BUDGETS BROKEN DOWN.",
  },
  {
    number: "04",
    title: "GROUP SYNC",
    description:
      "SHARE A LINK. COLLECT PREFS. SEE WHO'S IN, REAL-TIME.",
  },
];

const featureIcons = [
  /* Starburst */
  <svg key="0" className="w-28 h-28 sm:w-36 sm:h-36 text-foreground" viewBox="0 0 100 100" fill="currentColor">
    <g transform="translate(50,50)">
      {Array.from({ length: 20 }).map((_, i) => (
        <rect key={i} x="-2" y="-45" width="4" height="45" transform={`rotate(${i * 18})`} />
      ))}
    </g>
  </svg>,
  /* Microphone */
  <svg key="1" className="w-28 h-28 sm:w-36 sm:h-36 text-foreground" viewBox="0 0 100 100" fill="currentColor">
    <rect x="38" y="15" width="24" height="40" rx="12" />
    <rect x="28" y="45" width="44" height="4" />
    <rect x="48" y="49" width="4" height="20" />
    <rect x="35" y="69" width="30" height="4" />
  </svg>,
  /* Grid */
  <svg key="2" className="w-28 h-28 sm:w-36 sm:h-36 text-foreground" viewBox="0 0 100 100" fill="currentColor">
    <rect x="10" y="10" width="35" height="35" />
    <rect x="55" y="10" width="35" height="35" />
    <rect x="10" y="55" width="35" height="35" />
    <rect x="55" y="55" width="35" height="35" />
  </svg>,
  /* Chain */
  <svg key="3" className="w-28 h-28 sm:w-36 sm:h-36 text-foreground" viewBox="0 0 100 100" fill="currentColor">
    <circle cx="35" cy="35" r="15" fill="none" stroke="currentColor" strokeWidth="6" />
    <circle cx="65" cy="65" r="15" fill="none" stroke="currentColor" strokeWidth="6" />
    <rect x="44" y="44" width="14" height="5" transform="rotate(-45 50 46)" />
  </svg>,
];

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  /* Auto-rotate carousel every 3s */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
  }, []);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const pickFeature = (idx: number) => {
    setActiveFeature(idx);
    resetTimer();
  };

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="snap-container">
      {/* ── HERO ── */}
      <section className="snap-section border-b-4 border-foreground bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Left — headline */}
            <div className="flex items-end pb-12 lg:pb-20 pr-8">
              <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] font-black uppercase leading-[0.9] tracking-tighter text-foreground">
                TRIPS
                <br />
                YOUR
                <br />
                CREW
                <br />
                WILL LOVE.
              </h1>
            </div>

            {/* Right — CTA + powered by */}
            <div className="flex flex-col border-t-4 lg:border-t-0 lg:border-l-4 border-foreground">
              {/* CTA block */}
              <div className="flex-1 flex items-center justify-center bg-foreground p-10 lg:p-16">
                {user ? (
                  <Link href="/trip/new" className="group text-center">
                    <span className="block text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter text-background leading-tight">
                      PLAN
                      <br />
                      TRIP <span className="inline-block transition-transform group-hover:translate-x-2 group-hover:-translate-y-1">↗</span>
                    </span>
                  </Link>
                ) : (
                  <button onClick={handleSignIn} className="group text-center cursor-pointer">
                    <span className="block text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter text-background leading-tight">
                      GET STARTED
                      <br />
                      IT&apos;S FREE <span className="inline-block transition-transform group-hover:translate-x-2 group-hover:-translate-y-1">↗</span>
                    </span>
                  </button>
                )}
              </div>

              {/* Powered by */}
              <div className="border-t-4 border-foreground p-8 lg:p-10">
                <p className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
                  POWERED BY
                </p>
                <div className="space-y-2">
                  <p className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                    <span className="text-xl">✹</span> GEMINI AI
                  </p>
                  <p className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                    <span className="text-xl">∿</span> ELEVENLABS
                  </p>
                  <p className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                    <span className="text-xl">◧</span> VULTR CLOUD
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE ARSENAL ── */}
      <section id="how-it-works" className="snap-section bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex flex-col">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-foreground pt-8 pb-6 sm:pt-12 sm:pb-8 shrink-0">
            [ THE ARSENAL ]
          </h2>

          <div className="border-t-4 border-foreground flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
              {/* Left — active feature detail */}
              <div className="lg:col-span-2 p-8 sm:p-12 lg:p-16 border-b-4 lg:border-b-0 lg:border-r-4 border-foreground flex flex-col justify-center">
                <div className="mb-6 transition-opacity duration-300" key={activeFeature}>
                  {featureIcons[activeFeature]}
                </div>

                <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-foreground leading-none mb-4 transition-opacity duration-300" key={`t-${activeFeature}`}>
                  {features[activeFeature].title}
                </h3>
                <p className="text-sm sm:text-base font-bold uppercase tracking-wide text-muted max-w-lg transition-opacity duration-300" key={`d-${activeFeature}`}>
                  {features[activeFeature].description}
                </p>
              </div>

              {/* Right — numbered tabs (carousel) */}
              <div className="flex flex-row lg:flex-col">
                {features.map((feature, idx) => (
                  <button
                    key={feature.number}
                    onClick={() => pickFeature(idx)}
                    className={`flex-1 flex items-center justify-center p-6 sm:p-8 text-2xl sm:text-3xl font-black uppercase tracking-tighter transition-colors duration-300 border-b-4 last:border-b-0 lg:border-b-4 border-foreground cursor-pointer relative overflow-hidden ${
                      activeFeature === idx
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-foreground hover:text-background"
                    }`}
                  >
                    {feature.number}
                    {/* Progress bar on active tile */}
                    {activeFeature === idx && (
                      <span className="absolute bottom-0 left-0 h-1 bg-background/40 carousel-progress" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="snap-section border-t-4 border-foreground bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            <div className="flex items-center py-12 lg:py-20">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-foreground leading-[0.9]">
                READY TO
                <br />
                SYNC YOUR
                <br />
                NEXT TRIP?
              </h2>
            </div>
            <div className="flex items-center justify-center bg-foreground p-10 lg:p-16 border-t-4 lg:border-t-0 lg:border-l-4 border-foreground">
              {user ? (
                <Link href="/trip/new" className="btn-brutal-outline text-background border-background text-xl sm:text-2xl px-10 py-5 hover:bg-background hover:text-foreground">
                  PLAN A TRIP NOW ↗
                </Link>
              ) : (
                <button onClick={handleSignIn} className="btn-brutal-outline text-background border-background text-xl sm:text-2xl px-10 py-5 hover:bg-background hover:text-foreground">
                  GET STARTED FREE ↗
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER (inside last snap section) ── */}
      <section className="snap-section-footer border-t-4 border-foreground bg-background flex items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm font-black uppercase tracking-tighter text-foreground">
              ✹ TRIPSYNC
            </span>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              BUILT AT HACKCU 2026 — GEMINI AI / ELEVENLABS / VULTR
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
