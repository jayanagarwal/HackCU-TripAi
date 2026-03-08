import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    return (
        <div className="min-h-screen pt-24 pb-16 page-transition">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">My Trips</h1>
                        <p className="mt-1 text-muted">
                            Plan, join, and manage your group adventures
                        </p>
                    </div>
                    <Link
                        href="/trip/new"
                        className="inline-flex items-center gap-2 rounded-full gradient-bg px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                    >
                        <span className="text-lg">+</span> Plan a Trip
                    </Link>
                </div>

                {/* Empty state */}
                <div className="mt-16 flex flex-col items-center justify-center text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-indigo-50 text-5xl">
                        ✈️
                    </div>
                    <h2 className="mt-6 text-xl font-semibold text-foreground">
                        No trips yet
                    </h2>
                    <p className="mt-2 max-w-sm text-muted">
                        Start planning your first group trip or join one using a share code
                        from a friend.
                    </p>
                    <Link
                        href="/trip/new"
                        className="mt-6 inline-flex items-center gap-2 rounded-full gradient-bg px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                    >
                        Plan Your First Trip 🚀
                    </Link>
                </div>
            </div>
        </div>
    );
}
