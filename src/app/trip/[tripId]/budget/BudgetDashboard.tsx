"use client";

import Link from "next/link";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface MyBudget {
    total: number;
    accommodation: number;
    food: number;
    activities: number;
    transportation: number;
    savings_tips: string | null;
}

interface BudgetDashboardProps {
    tripId: string;
    tripName: string;
    destination: string;
    userName: string;
    myBudget: MyBudget | null;
    statedBudget: number | null;
    groupTotal: number | null;
    memberCount: number;
}

const CATEGORIES = [
    { key: "accommodation", label: "Accommodation", symbol: "□", color: "#000000" },
    { key: "food", label: "Food", symbol: "∷", color: "#555555" },
    { key: "activities", label: "Activities", symbol: "✹", color: "#888888" },
    { key: "transportation", label: "Transportation", symbol: "→", color: "#bbbbbb" },
] as const;

export default function BudgetDashboard({
    tripId,
    tripName,
    destination,
    userName,
    myBudget,
    statedBudget,
    groupTotal,
    memberCount,
}: BudgetDashboardProps) {
    if (!myBudget) {
        return (
            <div className="min-h-screen pt-24 pb-16 page-transition">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
                    <div className="text-5xl mb-4 font-black">$</div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground">No Budget Data Yet</h1>
                    <p className="mt-2 text-muted">
                        The itinerary hasn&apos;t generated budget estimates for you yet.
                    </p>
                    <Link
                        href={`/trip/${tripId}/itinerary`}
                        className="mt-6 btn-brutal inline-flex px-6 py-2.5 text-sm"
                    >
                        ← Back to Itinerary
                    </Link>
                </div>
            </div>
        );
    }

    const total = myBudget.total;
    const chartData = CATEGORIES.map((cat) => ({
        name: cat.label,
        value: myBudget[cat.key as keyof MyBudget] as number,
        symbol: cat.symbol,
        color: cat.color,
    })).filter((d) => d.value > 0);

    // Budget status
    let budgetStatus: "under" | "close" | "over" = "under";
    let budgetPercent = 0;
    let statusText = "";

    if (statedBudget != null && statedBudget > 0) {
        budgetPercent = (total / statedBudget) * 100;
        if (total > statedBudget) {
            budgetStatus = "over";
            statusText = `$${(total - statedBudget).toLocaleString()} over budget`;
        } else if (budgetPercent >= 90) {
            budgetStatus = "close";
            statusText = `$${(statedBudget - total).toLocaleString()} remaining — cutting it close`;
        } else {
            statusText = `$${(statedBudget - total).toLocaleString()} under budget`;
        }
    }

    return (
        <div className="min-h-screen pt-16 pb-16 page-transition">
            {/* Header */}
            <div className="sticky top-16 z-30 border-b-4 border-foreground bg-background">
                <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-tight text-foreground">My Budget</h1>
                            <p className="text-xs text-muted font-bold">
                                ⌖ {destination} · {tripName}
                            </p>
                        </div>
                        <Link
                            href={`/trip/${tripId}/itinerary`}
                            className="border-2 border-foreground px-3 py-1.5 text-xs font-black uppercase text-foreground hover:bg-foreground hover:text-background transition-all"
                        >
                            ← Itinerary
                        </Link>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 space-y-6">
                {/* Big total number */}
                <div className="text-center py-4">
                    <p className="text-xs text-muted font-black uppercase tracking-widest">
                        Your Estimated Total
                    </p>
                    <p className="text-5xl font-black text-foreground mt-1">
                        ${total.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted font-bold mt-1">{userName}</p>
                </div>

                {/* Budget progress bar */}
                {statedBudget != null && statedBudget > 0 && (
                    <div className="border-4 border-foreground p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black uppercase text-foreground">
                                Budget Progress
                            </span>
                            <span className="text-sm font-black text-foreground">
                                ${total.toLocaleString()}{" "}
                                <span className="text-muted font-bold">
                                    / ${statedBudget.toLocaleString()}
                                </span>
                            </span>
                        </div>
                        <div className="h-4 border-2 border-foreground overflow-hidden">
                            <div
                                className="h-full bg-foreground transition-all duration-700"
                                style={{
                                    width: `${Math.min(budgetPercent, 100)}%`,
                                }}
                            />
                        </div>
                        <p className="text-sm font-black mt-2 text-foreground">
                            {budgetStatus === "over" && "! "}
                            {statusText}
                        </p>
                    </div>
                )}

                {/* Donut chart */}
                <div className="border-4 border-foreground p-5">
                    <h2 className="text-xs font-black uppercase tracking-widest text-foreground mb-4">
                        Spending Breakdown
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-48 h-48 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [
                                            `$${Number(value).toLocaleString()}`,
                                            "",
                                        ]}
                                        contentStyle={{
                                            backgroundColor: "var(--background)",
                                            border: "4px solid var(--foreground)",
                                            borderRadius: "0",
                                            color: "var(--foreground)",
                                            fontSize: "13px",
                                            fontWeight: 900,
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Legend */}
                        <div className="flex-1 w-full space-y-3">
                            {CATEGORIES.map((cat) => {
                                const value = myBudget[cat.key as keyof MyBudget] as number;
                                const pct = total > 0 ? ((value / total) * 100).toFixed(0) : "0";
                                return (
                                    <div key={cat.key} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 shrink-0"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <span className="text-sm font-bold text-foreground">
                                                {cat.symbol} {cat.label}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-foreground">
                                                ${value.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-muted font-bold ml-1.5">
                                                {pct}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Savings tips */}
                {budgetStatus === "over" && myBudget.savings_tips && (
                    <div className="border-4 border-foreground p-5">
                        <h2 className="text-xs font-black uppercase tracking-widest text-foreground">
                            ? Tips to Save Money
                        </h2>
                        <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                            {myBudget.savings_tips}
                        </p>
                    </div>
                )}

                {/* Group total */}
                {groupTotal != null && (
                    <div className="border-4 border-foreground p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted font-black uppercase">Group Total</p>
                                <p className="text-2xl font-black text-foreground">
                                    ${groupTotal.toLocaleString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted font-black uppercase">Travelers</p>
                                <p className="text-2xl font-black text-foreground">
                                    {memberCount}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t-2 border-foreground flex items-center justify-between text-sm text-muted">
                            <span className="font-bold">Average per person</span>
                            <span className="font-black text-foreground">
                                ${memberCount > 0 ? Math.round(groupTotal / memberCount).toLocaleString() : 0}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
