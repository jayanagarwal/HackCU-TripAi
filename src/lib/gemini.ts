import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Send a prompt to Gemini and parse the JSON response.
 * Retries up to 2 times if JSON parsing fails.
 * @param useGrounding - Enable Google Search grounding (for itinerary/location calls)
 */
export async function askGeminiJSON<T = unknown>(
    systemPrompt: string,
    userMessage: string,
    retries = 2,
    useGrounding = false
): Promise<T> {
    const model = genAI.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
        },
        tools: useGrounding
            ? [{ googleSearch: {} } as any]
            : undefined,
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: userMessage }] }],
                systemInstruction: {
                    role: "system",
                    parts: [
                        {
                            text: `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no backticks, no explanation text — just the raw JSON object.`,
                        },
                    ],
                },
            });

            const text = result.response.text();
            // Strip any accidental markdown fences
            const cleaned = text
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

            return JSON.parse(cleaned) as T;
        } catch (err) {
            if (attempt < retries) {
                console.warn(
                    `Gemini JSON parse failed (attempt ${attempt + 1}/${retries + 1}):`,
                    err
                );
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
                continue;
            }
            throw new Error(
                `Gemini failed after ${retries + 1} attempts: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    throw new Error("Unreachable");
}
