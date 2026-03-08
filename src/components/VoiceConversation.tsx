"use client";

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";

const VoiceOrb = lazy(() => import("@/components/VoiceOrb"));

interface Message {
    role: "assistant" | "user";
    text: string;
}

interface ExtractedPreferences {
    budget_max?: number | null;
    vibe_beach?: number | null;
    vibe_city?: number | null;
    vibe_nature?: number | null;
    vibe_culture?: number | null;
    vibe_relaxation?: number | null;
    vibe_nightlife?: number | null;
    vibe_adventure?: number | null;
    dietary_restrictions?: string[];
    dietary_notes?: string | null;
    activity_level?: string | null;
    accommodation_pref?: string | null;
    must_haves?: string[];
    dealbreakers?: string[];
    additional_notes?: string | null;
}

interface VoiceConversationProps {
    onComplete: (prefs: ExtractedPreferences) => void;
    onClose: () => void;
    userName: string;
}

type Phase = "idle" | "speaking" | "listening" | "processing" | "done";

const QUESTIONS = [
    (name: string) =>
        `Hey${name ? `, ${name}` : ""}! I'm your TripSync assistant. Instead of filling out a form, just tell me about your dream trip and I'll take care of the rest. So first off — what's your budget looking like for this trip?`,
    () =>
        `Awesome! Now picture your perfect vacation — are you more of a beach person, city explorer, nature lover, or something else? Feel free to mention multiple things you're into.`,
    () =>
        `Got it! Any dietary restrictions I should know about? Vegetarian, gluten-free, allergies, anything like that?`,
    () =>
        `Do you want a chill trip with lots of downtime, a moderately packed schedule, or do you want to see and do as much as possible?`,
    () =>
        `For places to stay — are you thinking budget-friendly, mid-range comfortable, or go all out luxury?`,
    () =>
        `Anything you absolutely must have on this trip? And anything that would be a dealbreaker for you?`,
    () =>
        `Last thing — is there one thing you absolutely MUST do on this trip? Any final thoughts?`,
];

export default function VoiceConversation({
    onComplete,
    onClose,
    userName,
}: VoiceConversationProps) {
    const [phase, setPhase] = useState<Phase>("idle");
    const [messages, setMessages] = useState<Message[]>([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [error, setError] = useState("");
    const [supported, setSupported] = useState(true);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasStarted = useRef(false); // Bug 2 fix: prevent double-mount in Strict Mode

    // Check browser support
    useEffect(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSupported(false);
        }
    }, []);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, liveTranscript]);

    // Bug 2 fix: Only start once (React Strict Mode mounts twice in dev)
    useEffect(() => {
        if (supported && !hasStarted.current) {
            hasStarted.current = true;
            console.log("[Voice] Starting greeting...");
            const greeting = QUESTIONS[0](userName.split(" ")[0]);
            speakAndListen(greeting, 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supported]);

    // Browser speechSynthesis as TTS fallback
    const speakWithBrowser = useCallback((text: string): Promise<void> => {
        return new Promise((resolve) => {
            console.log("[Voice] Using browser TTS fallback");
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve(); // resolve anyway
            window.speechSynthesis.speak(utterance);
        });
    }, []);

    const speakAndListen = useCallback(
        async (text: string, nextQuestionIdx: number) => {
            setPhase("speaking");

            // Add message to log
            const aiMsg: Message = { role: "assistant", text };
            setMessages((prev) => [...prev, aiMsg]);

            let audioPlayed = false;

            try {
                console.log(`[Voice] Calling TTS for question ${nextQuestionIdx}...`);
                const res = await fetch("/api/voice/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                });

                if (!res.ok) {
                    const errBody = await res.text();
                    console.error(`[Voice] TTS API error (${res.status}):`, errBody);
                    throw new Error(`TTS failed: ${res.status}`);
                }

                console.log("[Voice] TTS response OK, creating audio blob...");
                const audioBlob = await res.blob();
                console.log(`[Voice] Audio blob size: ${audioBlob.size} bytes`);
                const audioUrl = URL.createObjectURL(audioBlob);

                const audio = new Audio(audioUrl);
                audioRef.current = audio;
                setCurrentAudio(audio);

                await new Promise<void>((resolve, reject) => {
                    audio.onended = () => {
                        console.log("[Voice] Audio playback ended");
                        URL.revokeObjectURL(audioUrl);
                        audioPlayed = true;
                        resolve();
                    };

                    audio.onerror = (e) => {
                        console.error("[Voice] Audio playback error:", e);
                        URL.revokeObjectURL(audioUrl);
                        reject(new Error("Audio playback failed"));
                    };

                    console.log("[Voice] Starting audio playback...");
                    audio.play().catch((e) => {
                        console.error("[Voice] audio.play() rejected:", e);
                        reject(e);
                    });
                });
            } catch (err) {
                console.warn("[Voice] ElevenLabs TTS failed, falling back to browser TTS:", err);
                // Fallback to browser speechSynthesis
                try {
                    await speakWithBrowser(text);
                    audioPlayed = true;
                } catch {
                    console.warn("[Voice] Browser TTS also failed");
                }
            }

            // Bug 3 fix: 500ms delay between TTS ending and mic starting
            // This prevents the mic from picking up the AI's own voice tail
            console.log("[Voice] Waiting 500ms before activating mic...");
            await new Promise((r) => setTimeout(r, 500));

            // Start listening
            if (nextQuestionIdx < QUESTIONS.length) {
                startListening(nextQuestionIdx);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const startListening = useCallback((currentQIdx: number) => {
        console.log(`[Voice] Starting mic for question ${currentQIdx}...`);
        setPhase("listening");
        setLiveTranscript("");

        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error("[Voice] SpeechRecognition not supported");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        let finalTranscript = "";
        let silenceTimer: ReturnType<typeof setTimeout> | null = null;

        recognition.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + " ";
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            setLiveTranscript(finalTranscript + interim);

            // Bug 3 fix: 2-second silence auto-stop (per tested demo)
            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                console.log("[Voice] 2s silence detected, stopping mic");
                if (finalTranscript.trim()) {
                    recognition.stop();
                }
            }, 2000);
        };

        recognition.onend = () => {
            if (silenceTimer) clearTimeout(silenceTimer);
            const userText = finalTranscript.trim();
            console.log(`[Voice] Mic stopped, transcript: "${userText}"`);

            if (userText) {
                const userMsg: Message = { role: "user", text: userText };
                setMessages((prev) => [...prev, userMsg]);
                setLiveTranscript("");
                handleUserResponse(userText, currentQIdx);
            } else {
                // No speech detected, restart mic
                console.log("[Voice] No speech detected, restarting mic...");
                try {
                    recognition.start();
                } catch {
                    // ignore
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.warn("[Voice] Speech recognition error:", event.error);
            if (event.error === "no-speech") {
                try { recognition.start(); } catch { /* ignore */ }
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
            console.log("[Voice] Mic activated successfully");
        } catch (e) {
            console.error("[Voice] Failed to start recognition:", e);
        }
    }, []);

    const handleUserResponse = useCallback(
        async (userText: string, currentQIdx: number) => {
            const nextIdx = currentQIdx + 1;
            console.log(`[Voice] User responded to Q${currentQIdx}, next: Q${nextIdx}`);

            if (nextIdx < QUESTIONS.length) {
                setQuestionIndex(nextIdx);
                const nextQuestion = QUESTIONS[nextIdx]("");
                speakAndListen(nextQuestion, nextIdx);
            } else {
                // All questions done — extract preferences
                extractPreferences();
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const extractPreferences = useCallback(async () => {
        console.log("[Voice] Extracting preferences from conversation...");
        setPhase("processing");

        // Get current messages for transcript
        setMessages((prev) => {
            const transcript = prev.map((m) => ({
                role: m.role === "assistant" ? "Assistant" : "User",
                text: m.text,
            }));

            fetch("/api/voice/extract-preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.preferences) {
                        console.log("[Voice] Preferences extracted:", data.preferences);
                        setPhase("done");
                        // Wait 2s then call onComplete
                        setTimeout(() => onComplete(data.preferences), 2000);
                    } else {
                        throw new Error("No preferences returned");
                    }
                })
                .catch((err) => {
                    console.error("[Voice] Extract error:", err);
                    setError("Failed to extract preferences. You can fill the form manually.");
                    setPhase("idle");
                });

            return prev;
        });
    }, [onComplete]);

    const stopConversation = () => {
        console.log("[Voice] Stopping conversation");
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        window.speechSynthesis?.cancel();
        onClose();
    };

    if (!supported) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-lg">
                <div className="mx-auto max-w-md border-4 border-foreground bg-card p-8 text-center">
                    <div className="text-5xl mb-4">🎙️</div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        Voice Input Requires Chrome
                    </h2>
                    <p className="text-muted mb-6">
                        Voice conversations use the Web Speech API, which is currently
                        supported in Chrome and Edge browsers. Please switch to Chrome or
                        use the form instead.
                    </p>
                    <button
                        onClick={onClose}
                        className="btn-brutal px-6 py-3"
                    >
                        USE FORM INSTEAD
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0c0a09" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-white bg-white text-black text-lg">
                        ♬
                    </div>
                    <div>
                        <h2 className="font-black uppercase tracking-tight text-white">
                            VOICE ASSISTANT
                        </h2>
                        <p className="text-xs text-white/50">
                            {phase === "speaking" && "AI is speaking..."}
                            {phase === "listening" && "Listening to you..."}
                            {phase === "processing" && "Organizing your preferences..."}
                            {phase === "done" && "✅ Conversation complete!"}
                            {phase === "idle" && "Starting up..."}
                        </p>
                    </div>
                </div>
                <button
                    onClick={stopConversation}
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:border-white/40 transition-all"
                >
                    ✕ Stop & use form
                </button>
            </div>

            {/* Main area: Orb and Scrollable conversation log */}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="flex flex-col min-h-full pb-36">
                    {/* Orb section */}
                    <div className="shrink-0 flex flex-col items-center justify-center py-6">
                        <Suspense fallback={<div className="w-[200px] h-[200px]" />}>
                            <VoiceOrb
                                phase={phase}
                                audioElement={currentAudio}
                            />
                        </Suspense>

                        {/* Phase label */}
                        <p className="mt-3 text-sm text-white/50">
                            {phase === "speaking" && "AI is speaking..."}
                            {phase === "listening" && "Listening... speak naturally"}
                            {phase === "processing" && "Processing your preferences..."}
                            {phase === "done" && "All done! Redirecting to form..."}
                        </p>

                        {/* Progress dots */}
                        <div className="flex items-center gap-2 mt-3">
                            {QUESTIONS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-2 w-2 rounded-full transition-all ${i < questionIndex
                                        ? "bg-emerald-400"
                                        : i === questionIndex
                                            ? "bg-primary w-4"
                                            : "bg-white/20"
                                        }`}
                                />
                            ))}
                            <span className="ml-2 text-[11px] text-white/40">
                                Question {Math.min(questionIndex + 1, QUESTIONS.length)} of {QUESTIONS.length}
                            </span>
                        </div>
                    </div>

                    {/* Conversation log */}
                    <div className="flex-1 px-6 pb-4 flex flex-col justify-end">
                        <div className="mx-auto w-full max-w-lg space-y-3">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === "user"
                                            ? "bg-emerald-500/20 text-emerald-100 rounded-br-md border border-emerald-500/30"
                                            : "bg-white/5 text-white/80 rounded-bl-md border border-white/10"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Live transcript — pinned at bottom above error bar */}
                    {phase === "listening" && liveTranscript && (
                        <div className="shrink-0 px-6 pb-4">
                            <div className="mx-auto max-w-lg rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/80">
                                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block mb-1">You:</span>
                                {liveTranscript}
                                <span className="animate-pulse ml-1 text-emerald-400">|</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="border-t border-white/10 px-6 py-4 flex items-center justify-center gap-3 bg-[#0c0a09]">
                    <p className="text-sm text-red-300">{error}</p>
                    <button
                        onClick={stopConversation}
                        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-all"
                    >
                        Switch to Form
                    </button>
                </div>
            )}
        </div>
    );
}
