import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voiceId } = await request.json();

    if (!text) {
        return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 5000) {
        return NextResponse.json({ error: "Text too long" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error("[TTS] No ELEVENLABS_API_KEY configured");
        return NextResponse.json(
            { error: "ElevenLabs API key not configured" },
            { status: 500 }
        );
    }

    // Use Rachel voice by default, or ELEVENLABS_VOICE_ID env var
    const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    console.log(`[TTS] Calling ElevenLabs: voice=${voice}, text="${text.substring(0, 50)}..."`);

    try {
        // Use the streaming endpoint as per the tested demo
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`,
            {
                method: "POST",
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TTS] ElevenLabs error (${response.status}):`, errorText);
            return NextResponse.json(
                { error: `ElevenLabs error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        console.log("[TTS] ElevenLabs responded OK, streaming audio...");

        const audioBuffer = await response.arrayBuffer();
        console.log(`[TTS] Audio buffer size: ${audioBuffer.byteLength} bytes`);

        return new Response(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache",
            },
        });
    } catch (err) {
        console.error("[TTS] Fetch error:", err);
        return NextResponse.json(
            { error: "Failed to generate speech" },
            { status: 500 }
        );
    }
}
