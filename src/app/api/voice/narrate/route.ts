import { NextResponse } from "next/server";
import { askGeminiJSON } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

const NARRATION_PROMPT = `You are a friendly, enthusiastic travel agent presenting a trip itinerary to a group of friends.

Convert the given trip itinerary JSON into a friendly, exciting narration script. Follow these rules:
- Keep it under 2 minutes when spoken (about 250-300 words)
- Be enthusiastic but not cheesy
- Mention everyone by name when describing activities
- Highlight the group activities and mention when people get their solo time
- Include a few specific highlights (best restaurants, coolest activities)
- Start with "Alright team, here's your [destination] adventure!"
- End with something like "Trust me, this is going to be an amazing trip!"

Return ONLY this JSON:
{
  "script": "the full narration text as a single string"
}`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { itinerary, destination, members } = await request.json();

        if (!itinerary || !destination) {
            return NextResponse.json(
                { error: "Itinerary and destination are required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "ElevenLabs API key not configured" },
                { status: 500 }
            );
        }

        // Step 1: Generate narration script with Gemini
        const memberNames = members?.map((m: any) => m.name).join(", ") || "the group";

        // Trim the itinerary to save tokens
        const trimmedItinerary = {
            days: itinerary.days?.map((day: any) => ({
                date: day.date,
                theme: day.theme,
                activities: day.activities?.map((a: any) => ({
                    time: a.time,
                    name: a.name,
                    participants: a.participants,
                    estimated_cost_pp: a.estimated_cost_pp
                }))
            }))
        };

        const result: any = await askGeminiJSON(
            NARRATION_PROMPT,
            `Create a narration for this trip:\n\nDestination: ${destination}\nGroup members: ${memberNames}\n\nItinerary:\n${JSON.stringify(trimmedItinerary, null, 2)}`
        );

        const script = result?.script;
        if (!script) {
            return NextResponse.json(
                { error: "Failed to generate narration script" },
                { status: 500 }
            );
        }

        // Step 2: Convert to speech with ElevenLabs
        const voiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

        const ttsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
                method: "POST",
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: script,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        );

        if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            console.error("ElevenLabs narration error:", errorText);
            // Return script only — no audio
            return NextResponse.json({ script, audioUrl: null });
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

        return NextResponse.json({ script, audioUrl });
    } catch (err) {
        console.error("Narration error:", err);
        return NextResponse.json(
            { error: "Failed to generate narration" },
            { status: 500 }
        );
    }
}
