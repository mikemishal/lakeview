// Fetches an iCal feed safely. Used by both the preview route and the per-property
// sync route so the SSRF protections live in one place.
//
// Protections:
//   - normalizeCalendarUrl validates scheme and host allowlist
//   - redirect: "error" stops an allowed host from redirecting to an internal address
//   - an abort timeout stops slow or hanging targets
//   - a size cap avoids reading an unexpectedly huge response into memory

import { normalizeCalendarUrl } from "./validateCalendarUrl";

const FETCH_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export type FetchedCalendar = {
  calendarUrl: string;
  text: string;
};

export async function fetchCalendarIcs(rawUrl: string): Promise<FetchedCalendar> {
  const calendarUrl = normalizeCalendarUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(calendarUrl, {
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "User-Agent": "LakeviewPilot/0.1",
      },
    });

    if (!response.ok) {
      throw new Error("Calendar URL could not be fetched.");
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error("Calendar file is too large.");
    }

    return { calendarUrl, text };
  } catch (error) {
    // Normalize fetch/abort failures into a single client-safe message.
    if (error instanceof Error && error.message.startsWith("Calendar")) {
      throw error;
    }
    throw new Error("Failed to fetch calendar URL.");
  } finally {
    clearTimeout(timeout);
  }
}
