"use client";

import { useState, useRef, useEffect } from "react";

interface NarrationPlayerProps {
    tripId: string;
    itinerary: any;
    destination: string;
    members: { name: string }[];
    onClose: () => void;
}

export default function NarrationPlayer({
    tripId,
    itinerary,
    destination,
    members,
    onClose,
}: NarrationPlayerProps) {
    const [scriptLoading, setScriptLoading] = useState(true);
    const [audioLoading, setAudioLoading] = useState(false);
    const [error, setError] = useState("");
    const [script, setScript] = useState("");
    const [audioReady, setAudioReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        generateNarration();
        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generateNarration = async () => {
        setScriptLoading(true);
        setError("");

        try {
            // Step 1: Get script from Gemini (fast)
            const res = await fetch("/api/voice/narrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itinerary, destination, members }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate narration");
            }

            setScript(data.script);
            setScriptLoading(false);

            // If audio came back in the same response, use it
            if (data.audioUrl) {
                setupAudio(data.audioUrl);
                return;
            }

            // Step 2: Generate audio separately via TTS route
            setAudioLoading(true);
            try {
                const ttsRes = await fetch("/api/voice/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: data.script }),
                });

                if (ttsRes.ok) {
                    const audioBlob = await ttsRes.blob();
                    const blobUrl = URL.createObjectURL(audioBlob);
                    setupAudio(blobUrl);
                } else {
                    console.warn("[Narration] TTS failed, script-only mode");
                }
            } catch (err) {
                console.warn("[Narration] TTS failed, script-only mode");
            } finally {
                setAudioLoading(false);
            }
        } catch (err) {
            console.error("Narration error:", err);
            setError(err instanceof Error ? err.message : "Failed to generate narration");
            setScriptLoading(false);
        }
    };

    const generateAudio = async () => {
        if (!script) return;
        setAudioLoading(true);
        try {
            const ttsRes = await fetch("/api/voice/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: script }),
            });

            if (ttsRes.ok) {
                const audioBlob = await ttsRes.blob();
                const blobUrl = URL.createObjectURL(audioBlob);
                setupAudio(blobUrl);
            } else {
                console.warn("[Narration] TTS retry failed");
            }
        } catch (err) {
            console.error("[Narration] TTS retry error:", err);
        } finally {
            setAudioLoading(false);
        }
    };

    const setupAudio = (url: string) => {
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onloadedmetadata = () => {
            setDuration(audio.duration);
            setAudioReady(true);
            // Auto-play when ready
            audio.play().then(() => {
                setPlaying(true);
                progressInterval.current = setInterval(() => {
                    if (audioRef.current) {
                        setProgress(audioRef.current.currentTime);
                    }
                }, 100);
            }).catch(() => {
                // Autoplay blocked — user can click play
                setAudioReady(true);
            });
        };

        audio.onended = () => {
            setPlaying(false);
            setProgress(0);
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    };

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (playing) {
            audioRef.current.pause();
            if (progressInterval.current) clearInterval(progressInterval.current);
            setPlaying(false);
        } else {
            audioRef.current.play();
            progressInterval.current = setInterval(() => {
                if (audioRef.current) {
                    setProgress(audioRef.current.currentTime);
                }
            }, 100);
            setPlaying(true);
        }
    };

    const restart = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        setProgress(0);
        audioRef.current.play();
        progressInterval.current = setInterval(() => {
            if (audioRef.current) {
                setProgress(audioRef.current.currentTime);
            }
        }, 100);
        setPlaying(true);
    };

    const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = ratio * duration;
        setProgress(ratio * duration);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-lg">
            <div className="mx-auto w-full max-w-2xl border-4 border-foreground bg-card p-8 mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-foreground text-background text-lg">
                            ♬
                        </div>
                        <div>
                            <h2 className="font-black uppercase tracking-tight text-foreground">TRIP NARRATION</h2>
                            <p className="text-xs text-muted">📍 {destination}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="border-2 border-foreground px-3 py-1.5 text-sm font-black uppercase text-foreground hover:bg-foreground hover:text-background transition-colors"
                    >
                        ✕ CLOSE
                    </button>
                </div>

                {/* Loading script */}
                {scriptLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                        <div className="relative">
                            <div className="relative flex h-16 w-16 items-center justify-center border-4 border-foreground bg-foreground text-background text-2xl animate-pulse">
                                ✹
                            </div>
                        </div>
                        <p className="text-sm font-bold uppercase text-muted">
                            WRITING YOUR TRIP NARRATION...
                        </p>
                        <p className="text-xs font-bold uppercase text-muted/60">THIS MAY TAKE 2-3 MINUTES. GOOD THINGS TAKE TIME.</p>
                    </div>
                )}

                {/* Error state */}
                {error && !scriptLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                        <div className="text-4xl">😕</div>
                        <p className="text-sm text-danger text-center">{error}</p>
                        <button
                            onClick={generateNarration}
                            className="btn-brutal text-sm px-4 py-2"
                        >
                            TRY AGAIN
                        </button>
                    </div>
                )}

                {/* Script loaded — show player */}
                {!scriptLoading && !error && script && (
                    <>
                        {/* Audio player or loading indicator */}
                        {audioReady ? (
                            <div className="border-2 border-foreground bg-card-hover p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={togglePlay}
                                        className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-foreground bg-foreground text-background text-lg hover:bg-background hover:text-foreground transition-colors"
                                    >
                                        {playing ? "⏸" : "▶️"}
                                    </button>

                                    <div className="flex-1">
                                        <div
                                            className="h-2 bg-border cursor-pointer overflow-hidden"
                                            onClick={seekTo}
                                        >
                                            <div
                                                className="h-full bg-foreground transition-all duration-100"
                                                style={{
                                                    width: `${duration ? (progress / duration) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1 text-[10px] text-muted">
                                            <span>{formatTime(progress)}</span>
                                            <span>{formatTime(duration)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={restart}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-card-hover transition-all text-sm"
                                        title="Restart"
                                    >
                                        🔄
                                    </button>
                                </div>
                            </div>
                        ) : audioLoading ? (
                            <div className="rounded-xl border border-border bg-card-hover p-4 mb-4 flex items-center gap-3">
                                <svg
                                    className="h-5 w-5 animate-spin text-primary shrink-0"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-sm text-muted">Generating audio... read the script while you wait</span>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-xl">⚠️</div>
                                    <div className="text-sm text-amber-900">
                                        <p className="font-semibold">Audio generation unavailable</p>
                                        <p className="text-amber-800/80">You can still read the itinerary below.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={generateAudio}
                                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-all shadow-sm"
                                >
                                    Retry Audio
                                </button>
                            </div>
                        )}

                        {/* Script display */}
                        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card-hover p-6">
                            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                                📝 Narration Script
                            </h3>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                {script}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
