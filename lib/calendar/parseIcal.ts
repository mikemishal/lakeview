import ical from "node-ical";
import { CalendarEventItem } from "./calendarTypes";
import { daysBetween, toDateOnly } from "../date/dateUtils";

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
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
      const summary =
        typeof event.summary === "string" && event.summary.trim()
          ? event.summary.trim()
          : "Reserved / Blocked";
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
    .filter((item) => item.checkOutDate >= todayDateOnly)
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

  return items;
}
