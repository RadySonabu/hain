import OpenAI from "openai";

// Module-level cache so each unique step text is only ever sent once
const cache = new Map<string, number | null>();

const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
  // Required for React Native (treated as a browser-like environment)
  dangerouslyAllowBrowser: true,
});

/**
 * Uses GPT-4o Mini to extract a cooking duration from free-form step text.
 * Returns the duration in seconds, or null if no time is mentioned.
 * Results are cached in memory so each unique text is only called once.
 */
export async function detectDurationFromText(
  text: string
): Promise<number | null> {
  if (cache.has(text)) return cache.get(text) ?? null;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 64,
      messages: [
        {
          role: "system",
          content:
            'You extract cooking times from recipe steps. Return ONLY valid JSON: {"seconds": <number>} or {"seconds": null}. No other text.',
        },
        {
          role: "user",
          content: `Step: "${text}"`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw) as { seconds: unknown };
    const seconds =
      typeof parsed.seconds === "number" && parsed.seconds > 0
        ? Math.round(parsed.seconds)
        : null;
    cache.set(text, seconds);
    return seconds;
  } catch {
    cache.set(text, null);
    return null;
  }
}
