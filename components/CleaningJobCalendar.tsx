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
    needs_assignment: "Needs provider",
    assigned: "Assigned",
    declined: "Declined",
    accepted: "Accepted",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    issue_reported: "Needs attention",
    pending_acceptance: "Waiting for provider",
    unassigned: "Needs provider",
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

function formatCleaningTypeLabel(cleaningType: string): string {
  const knownLabels: Record<string, string> = {
    checkout_cleaning: "Checkout cleaning",
    turnover_cleaning: "Turnover cleaning",
  };

  if (knownLabels[cleaningType]) {
    return knownLabels[cleaningType];
  }

  const normalized = cleaningType.replace(/_/g, " ").trim();
  if (!normalized) {
    return "Cleaning";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatSourcePlatformLabel(sourcePlatform: string): string {
  const normalized = sourcePlatform.trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }

  if (normalized === "airbnb") {
    return "Airbnb";
  }

  return normalized
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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
                  {(() => {
                    const activeIssueLabels: string[] = [];

                    if (job.maintenanceNeeded) {
                      activeIssueLabels.push("Maintenance needed");
                    }

                    if (job.restockNeeded) {
                      activeIssueLabels.push("Restock needed");
                    }

                    if (job.damageFound) {
                      activeIssueLabels.push("Damage found");
                    }

                    return (
                      <>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          {formatCleaningTypeLabel(job.cleaningType)}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {formatSourcePlatformLabel(job.sourcePlatform)}
                        </span>
                      </div>
                      {activeIssueLabels.length > 0 ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Issues flagged
                        </span>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
                      {formatStatusLabel(job.status)}
                    </span>
                  </div>

                  {activeIssueLabels.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {activeIssueLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {job.notes ? (
                    <p className="text-sm text-slate-700">{job.notes}</p>
                  ) : null}

                  <div className="mt-2 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-900">Assigned to:</span>{" "}
                      {job.assignedProvider ? (
                        <span>
                          {job.assignedProvider.name}
                          {job.assignedProvider.companyName ? (
                            <span className="ml-1 text-xs text-slate-600">
                              ({job.assignedProvider.companyName})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-slate-500">Needs provider</span>
                      )}
                    </p>
                  </div>

                  {job.calendarEvent ? (
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p>
                        <span className="font-medium text-slate-900">Stay:</span>{" "}
                        {formatDateLabel(job.calendarEvent.checkInDate)} {"→"} {formatDateLabel(job.calendarEvent.checkOutDate)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Nights:</span> {job.calendarEvent.nights}
                      </p>
                      <p>
                        <span className="font-medium text-slate-900">Calendar event:</span>{" "}
                        {job.calendarEvent.summary}
                      </p>
                    </div>
                  ) : null}
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
