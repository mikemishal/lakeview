import { NextResponse } from "next/server";
import { normalizeCalendarUrl } from "@/lib/calendar/validateCalendarUrl";
import { parseIcalEvents } from "@/lib/calendar/parseIcal";
import {
  CalendarSyncError,
  CalendarSyncResponse,
} from "@/lib/calendar/calendarTypes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get("url") ?? "";
    const calendarUrl = normalizeCalendarUrl(rawUrl);

    let response: Response;
    try {
      response = await fetch(calendarUrl, {
        cache: "no-store",
        headers: {
          "User-Agent": "LakeviewPilot/0.1",
        },
      });
    } catch {
      throw new Error("Failed to fetch calendar URL.");
    }

    if (!response.ok) {
      throw new Error("Calendar URL could not be fetched.");
    }

    const icsText = await response.text();
    const items = await parseIcalEvents(icsText);

    const payload: CalendarSyncResponse = {
      calendarUrl,
      count: items.length,
      items,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    if (error instanceof Error) {
      const payload: CalendarSyncError = { error: error.message };
      return NextResponse.json(payload, { status: 400 });
    }

    const payload: CalendarSyncError = { error: "Unexpected server error." };
    return NextResponse.json(payload, { status: 500 });
  }
}
