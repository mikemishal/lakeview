import { NextResponse } from "next/server";
import { fetchCalendarIcs } from "@/lib/calendar/fetchCalendar";
import { parseIcalEvents } from "@/lib/calendar/parseIcal";
import {
  CalendarSyncError,
  CalendarSyncResponse,
} from "@/lib/calendar/calendarTypes";
import { AuthAccessError, requireOwnerProfile } from "@/lib/auth-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    // Require a signed-in owner. This route fetches a remote URL on the server,
    // so it must not be open to anonymous callers.
    await requireOwnerProfile();

    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get("url") ?? "";

    const { calendarUrl, text } = await fetchCalendarIcs(rawUrl);
    const items = await parseIcalEvents(text);

    const payload: CalendarSyncResponse = {
      calendarUrl,
      count: items.length,
      items,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    if (error instanceof AuthAccessError) {
      const payload: CalendarSyncError = { error: error.message };
      return NextResponse.json(payload, { status: error.status });
    }

    if (error instanceof Error) {
      const payload: CalendarSyncError = { error: error.message };
      return NextResponse.json(payload, { status: 400 });
    }

    const payload: CalendarSyncError = { error: "Unexpected server error." };
    return NextResponse.json(payload, { status: 500 });
  }
}
