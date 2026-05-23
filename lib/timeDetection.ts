export type Segment = {
  text: string;
  isHighlight: boolean;
};

// Matches: "20 mins", "1 hour", "30 seconds", "1.5 hours", "2 hrs", etc.
const TIME_REGEX =
  /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;

function toSeconds(amount: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("hour") || u.startsWith("hr")) return Math.round(amount * 3600);
  if (u.startsWith("min")) return Math.round(amount * 60);
  return Math.round(amount); // seconds
}

/** Returns the total seconds of the first time expression found, or null. */
export function extractTimeSeconds(text: string): number | null {
  TIME_REGEX.lastIndex = 0;
  const match = TIME_REGEX.exec(text);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  return toSeconds(amount, match[2]);
}

/** Splits text into plain and highlighted segments at every time expression. */
export function segmentText(text: string): Segment[] {
  const segments: Segment[] = [];
  TIME_REGEX.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TIME_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isHighlight: false });
    }
    segments.push({ text: match[0], isHighlight: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isHighlight: false });
  }

  return segments.length > 0 ? segments : [{ text, isHighlight: false }];
}

/** Formats seconds into a human-readable label, e.g. 90 → "1 min 30 sec" */
export function formatDetectedTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${seconds}s`;
}
