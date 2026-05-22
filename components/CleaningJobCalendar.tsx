import { type CleaningJobItem } from "@/components/CleaningJobCard";

type CleaningJobCalendarProps = {
  jobs: CleaningJobItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatStatusLabel(status: string): string {
  const knownLabels: Record<string, string> = {
    needs_assignment: "Needs assignment",
    assigned: "Assigned",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  if (knownLabels[status]) {
    return knownLabels[status];
  }

  const normalized = status.replace(/_/g, " ").trim();
  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toDateOnly(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateFormatter.format(parsed);
}

function toTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export default function CleaningJobCalendar({ jobs }: CleaningJobCalendarProps) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-slate-600">No cleaning jobs scheduled.</p>
    );
  }

  const grouped = jobs.reduce<Record<string, CleaningJobItem[]>>((accumulator, job) => {
    const dateKey = toDateOnly(job.scheduledDate);
    if (!accumulator[dateKey]) {
      accumulator[dateKey] = [];
    }
    accumulator[dateKey].push(job);
    return accumulator;
  }, {});

  const sortedDateKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-3">
      {sortedDateKeys.map((dateKey) => {
        const dayJobs = [...grouped[dateKey]].sort(
          (a, b) => toTimestamp(a.scheduledDate) - toTimestamp(b.scheduledDate)
        );

        return (
          <section
            key={dateKey}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-900">{formatDateLabel(`${dateKey}T00:00:00.000Z`)}</h3>

            <div className="space-y-3">
              {dayJobs.map((job) => (
                <article key={job.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                      {formatStatusLabel(job.status)}
                    </span>
                  </div>

                  {job.notes ? (
                    <p className="text-sm text-slate-700">{job.notes}</p>
                  ) : null}

                  {job.calendarEvent ? (
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{job.calendarEvent.summary}</p>
                      <p>
                        <span className="font-medium text-slate-900">Check-in:</span>{" "}
                        {formatDateLabel(job.calendarEvent.checkInDate)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Check-out:</span>{" "}
                        {formatDateLabel(job.calendarEvent.checkOutDate)}
                      </p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
