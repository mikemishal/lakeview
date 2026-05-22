export type CleaningJobCalendarEvent = {
  id: string;
  summary: string;
  checkInDate: string;
  checkOutDate: string;
};

export type CleaningJobItem = {
  id: string;
  propertyId: string;
  calendarEventId: string | null;
  title: string;
  scheduledDate: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  calendarEvent: CleaningJobCalendarEvent | null;
};

type CleaningJobCardProps = {
  job: CleaningJobItem;
  onStatusChange?: (jobId: string, status: string) => void;
  statusUpdating?: boolean;
};

const STATUS_OPTIONS = [
  "needs_assignment",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

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

function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateFormatter.format(parsed);
}

export default function CleaningJobCard({
  job,
  onStatusChange,
  statusUpdating = false,
}: CleaningJobCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
          {formatStatusLabel(job.status)}
        </span>
      </div>

      <p className="text-sm text-slate-700">
        <span className="font-medium text-slate-900">Scheduled:</span> {formatDateLabel(job.scheduledDate)}
      </p>

      <div className="mt-3 space-y-1">
        <label htmlFor={`cleaning-job-status-${job.id}`} className="block text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          id={`cleaning-job-status-${job.id}`}
          value={job.status}
          onChange={(event) => {
            if (onStatusChange) {
              onStatusChange(job.id, event.target.value);
            }
          }}
          disabled={statusUpdating}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatStatusLabel(status)}
            </option>
          ))}
        </select>
        {statusUpdating ? <p className="text-xs text-slate-500">Updating...</p> : null}
      </div>

      {job.notes ? <p className="mt-2 text-sm text-slate-700">{job.notes}</p> : null}

      {job.calendarEvent ? (
        <div className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-900">{job.calendarEvent.summary}</p>
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Check-in:</span>{" "}
            {formatDateLabel(job.calendarEvent.checkInDate)}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Check-out:</span>{" "}
            {formatDateLabel(job.calendarEvent.checkOutDate)}
          </p>
        </div>
      ) : null}
    </article>
  );
}
