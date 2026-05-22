export function normalizeCalendarUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Calendar URL is required.");
  }

  const candidate = trimmed.replace(/^webcal:\/\//i, "https://");

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Invalid calendar URL. Please enter a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid calendar URL protocol. Use http:// or https://.");
  }

  return parsed.toString();
}
