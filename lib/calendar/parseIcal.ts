import ical from "node-ical";
import { CalendarEventItem } from "./calendarTypes";
import { daysBetween, toDateOnly } from "../date/dateUtils";

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

// Airbnb iCal feeds include owner blocks and maintenance holds alongside real
// reservations. Those show up with summaries like "Airbnb (Not available)" or
// "Blocked". We exclude them so they do not turn into cleaning jobs.
function isBlockedSummary(summary: string): boolean {
  return /\bnot available\b|\bunavailable\b|\bblocked\b/i.test(summary);
}

export async function parseIcalEvents(
  icsText: string
): Promise<CalendarEventItem[]> {
  const parsed = await ical.async.parseICS(icsText);
  const todayDateOnly = toDateOnly(new Date());

  const items: CalendarEventItem[] = Object.values(parsed)
    .filter((entry): entry is ical.VEvent => {
      return typeof entry === "object" && entry !== null && entry.type === "VEVENT";
    })
    .map((event) => {
      const start = isValidDate(event.start) ? event.start : null;
      const end = isValidDate(event.end) ? event.end : null;

      if (!start || !end) {
        return null;
      }

      const checkInDate = toDateOnly(start);
      const checkOutDate = toDateOnly(end);
      // Default unknown summaries to "Reserved" (not "Blocked") so a missing
      // summary is kept as a reservation rather than filtered out below.
      const summary =
        typeof event.summary === "string" && event.summary.trim()
          ? event.summary.trim()
          : "Reserved";
      const id =
        typeof event.uid === "string" && event.uid.trim()
          ? event.uid.trim()
          : `${checkInDate}-${checkOutDate}-${summary}`;

      return {
        id,
        summary,
        checkInDate,
        checkOutDate,
        nights: daysBetween(start, end),
        source: "airbnb",
      } as CalendarEventItem;
    })
    .filter((item): item is CalendarEventItem => item !== null)
    .filter((item) => !isBlockedSummary(item.summary))
    .filter((item) => item.checkOutDate >= todayDateOnly)
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  return items;
}
