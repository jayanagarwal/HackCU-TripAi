"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const features = [
  {
    emoji: "🧠",
    title: "AI-Powered Matching",
    description:
      "Our AI analyzes everyone's vibes, budgets, and dietary needs to find destinations the whole group will love.",
  },
  {
    emoji: "🎤",
    title: "Voice Preferences",
    description:
      "Don't like forms? Just talk to our AI assistant and it'll capture your perfect trip preferences.",
  },
  {
    emoji: "📊",
    title: "Smart Itineraries",
    description:
      "Get day-by-day plans with group time, solo adventures, and per-person budget breakdowns.",
  },
  {
    emoji: "🤝",
    title: "Group Sync",
    description:
      "Share a link, collect preferences in real-time, and see exactly when everyone's submitted.",
  },
  {
    emoji: "🍽️",
    title: "Dietary Aware",
    description:
      "Vegetarian? Gluten-free? Halal? Every restaurant suggestion respects everyone's needs.",
  },
  {
    emoji: "💡",
    title: "Explainable AI",
    description:
      "Every recommendation comes with a clear reason — no black-box magic here.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a Trip",
    description: "Set your dates, group size, and share a link with your crew.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    number: "02",
    title: "Everyone Shares Preferences",
    description:
      "Each person fills in their vibes, budget, and dietary needs — or just talks to our AI.",
    color: "from-violet-500 to-purple-500",
  },
  {
    number: "03",
    title: "AI Finds the Perfect Match",
    description:
      "Gemini analyzes all preferences and recommends destinations with scores and reasoning.",
    color: "from-purple-500 to-cyan-500",
  },
  {
    number: "04",
    title: "Get Your Smart Itinerary",
    description:
      "A day-by-day plan maximizing group fun while giving everyone the solo time they need.",
    color: "from-cyan-500 to-teal-500",
  },
];

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl animate-float" />
          <div className="absolute top-20 right-1/4 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl animate-float-delayed" />
          <div className="absolute bottom-0 left-1/2 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl animate-float-slow" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              Powered by Gemini AI
            </div>

            {/* Headline */}
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl">
              Plan trips your whole{" "}
              <span className="gradient-text">crew will love</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
              Stop the endless group chat debates. TripSync collects everyone&apos;s
              preferences, synthesizes them with AI, and generates smart
              itineraries that maximize fun for the whole group.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {user ? (
                <Link
                  href="/trip/new"
                  className="group relative inline-flex items-center gap-2 rounded-full gradient-bg px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
                >
                  Plan a Trip
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="group relative inline-flex items-center gap-2 rounded-full gradient-bg px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95"
                >
                  Get Started — It&apos;s Free
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              )}
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-lg font-medium text-foreground transition-all hover:border-primary-light hover:bg-indigo-50"
              >
                See How It Works
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span> Built for HackCU 2026
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span> Gemini API
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-lg">🗣️</span> ElevenLabs Voice
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-lg">☁️</span> Vultr Cloud
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              From chaos to consensus in four easy steps
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white text-lg font-bold shadow-md`}
                >
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-transparent to-indigo-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything your group needs
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Smart features that make group trip planning actually enjoyable
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary-light hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl transition-transform group-hover:scale-110">
                  {feature.emoji}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="gradient-bg-animated rounded-3xl p-10 text-center text-white sm:p-16 shadow-2xl">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Ready to sync your next trip?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/80">
              Stop the group chat madness. Let AI handle the planning so you can
              focus on having fun.
            </p>
            {user ? (
              <Link
                href="/trip/new"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-lg font-semibold text-indigo-600 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Plan a Trip Now ✈️
              </Link>
            ) : (
              <button
                onClick={handleSignIn}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-lg font-semibold text-indigo-600 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Get Started Free ✈️
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xl">✈️</span>
              <span className="font-bold gradient-text">TripSync</span>
            </div>
            <p className="text-sm text-muted">
              Built with ❤️ at HackCU 2026 — Powered by Gemini AI, ElevenLabs &
              Vultr
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
