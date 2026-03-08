import { NextResponse } from "next/server";
import { askGeminiJSON } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are an expert at extracting structured travel preferences from casual conversation transcripts.

Given a transcript of a conversation between a user and a travel assistant, extract the user's preferences into a JSON object. 

Users speak casually. Parse approximate values generously — "maybe around 500" means budget_max: 500. "I'm vegetarian but I eat fish" means dietary_restrictions: ["Pescatarian"]. If the user didn't clearly mention something, leave that field null rather than guessing. For vibe ratings, map descriptive language to 1-5: "I love beaches" = 5, "beaches are okay" = 3, "not really into beaches" = 1.

Return ONLY this JSON structure:
{
  "budget_max": number or null,
  "vibe_beach": number 1-5 or null,
  "vibe_city": number 1-5 or null, 
  "vibe_nature": number 1-5 or null,
  "vibe_culture": number 1-5 or null,
  "vibe_relaxation": number 1-5 or null,
  "vibe_nightlife": number 1-5 or null,
  "vibe_adventure": number 1-5 or null,
  "dietary_restrictions": string[] or [],
  "dietary_notes": string or null,
  "activity_level": "chill" | "moderate" | "packed" or null,
  "accommodation_pref": "budget" | "mid-range" | "luxury" or null,
  "must_haves": string[] or [],
  "dealbreakers": string[] or [],
  "additional_notes": string or null
}

For dietary_restrictions, use these exact values when matching: "Vegetarian", "Vegan", "Gluten-Free", "Halal", "Kosher", "Nut Allergy", "Dairy-Free", "Pescatarian".
For must_haves, use these when matching: "Good WiFi", "Pool", "Near beach", "Pet-friendly", "Walkable area", "Public transit", "Free parking".
For dealbreakers, use these when matching: "Long drives (3+ hrs)", "Extreme heat", "Extreme cold", "Crowds", "Remote areas", "No nightlife".

If the user mentions preferences that don't match predefined options exactly, put them in additional_notes.`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { transcript } = await request.json();

        if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
            return NextResponse.json(
                { error: "Transcript is required" },
                { status: 400 }
            );
        }

        const conversationText = transcript
            .map((msg: { role: string; text: string }) => `${msg.role}: ${msg.text}`)
            .join("\n");

        const preferences = await askGeminiJSON(
            SYSTEM_PROMPT,
            `Extract preferences from this conversation:\n\n${conversationText}`
        );

        return NextResponse.json({ preferences });
    } catch (err) {
        console.error("Extract preferences error:", err);
        return NextResponse.json(
            { error: "Failed to extract preferences" },
            { status: 500 }
        );
    }
}
