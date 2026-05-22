import { CalendarEventItem } from "@/lib/calendar/calendarTypes";

type CalendarEventCardProps = {
  item: CalendarEventItem;
};

export default function CalendarEventCard({ item }: CalendarEventCardProps) {
  const nightsText = `${item.nights} ${item.nights === 1 ? "night" : "nights"}`;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{item.summary}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
          {item.source}
        </span>
      </div>

      <div className="space-y-1 text-sm text-slate-700">
        <p>
          <span className="font-medium text-slate-900">Check-in:</span> {item.checkInDate}
        </p>
        <p>
          <span className="font-medium text-slate-900">Check-out:</span> {item.checkOutDate}
        </p>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-800">{nightsText}</p>
    </article>
  );
}
