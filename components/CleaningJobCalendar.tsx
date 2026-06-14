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
      <div className="rounded-[12px] border-2 border-dashed border-[#E5E0D8] bg-white p-8 text-center">
        <p className="text-sm font-medium text-[#0D1B2A]">No jobs scheduled</p>
        <p className="mt-1 text-sm text-[#7A7060]">This day is clear. New turnovers and assigned work will appear here.</p>
      </div>
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
            className="rounded-[12px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">{formatDateLabel(`${dateKey}T00:00:00.000Z`)}</h3>

            <div className="space-y-3">
              {dayJobs.map((job) => {
                // Determine left border color based on job status
                let leftBorderColor = "border-l-[#D97706]"; // Amber default
                if (["assigned", "accepted", "completed", "synced"].includes(job.status)) {
                  leftBorderColor = "border-l-[#1A6B60]"; // Teal
                } else if (["cancelled", "issue_reported", "declined"].includes(job.status)) {
                  leftBorderColor = "border-l-[#EF4444]"; // Red
                }

                return (
                  <article key={job.id} className={`rounded-[12px] border border-l-4 border-[#E5E0D8] bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${leftBorderColor}`}>
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
                              <p className="text-sm font-semibold text-[#0D1B2A]">{job.title}</p>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="inline-flex rounded-full bg-[#B8860B]/10 px-2 py-0.5 text-xs font-medium text-[#B8860B]">
                                  {formatCleaningTypeLabel(job.cleaningType)}
                                </span>
                                <span className="inline-flex rounded-full bg-[#7A7060]/10 px-2 py-0.5 text-xs font-medium text-[#7A7060]">
                                  {formatSourcePlatformLabel(job.sourcePlatform)}
                                </span>
                              </div>
                              {activeIssueLabels.length > 0 ? (
                                <span className="inline-flex rounded-full bg-[#D97706]/10 px-2 py-0.5 text-xs font-medium text-[#D97706]">
                                  Issues flagged
                                </span>
                              ) : null}
                            </div>
                            <span className="rounded-full bg-[#1A6B60] px-2 py-1 text-xs font-medium text-white">
                              {formatStatusLabel(job.status)}
                            </span>
                          </div>

                          {activeIssueLabels.length > 0 ? (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {activeIssueLabels.map((label) => (
                                <span
                                  key={label}
                                  className="rounded-full bg-[#E5E0D8] px-2 py-0.5 text-xs font-medium text-[#7A7060]"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {job.notes ? (
                            <p className="text-sm text-[#7A7060]">{job.notes}</p>
                          ) : null}

                          <div className="mt-2 text-sm text-[#7A7060]">
                            <p>
                              <span className="font-medium text-[#0D1B2A]">Assigned to:</span>{" "}
                              {job.assignedProvider ? (
                                <span>
                                  {job.assignedProvider.name}
                                  {job.assignedProvider.companyName ? (
                                    <span className="ml-1 text-xs text-[#7A7060]">
                                      ({job.assignedProvider.companyName})
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span className="text-[#D97706]">Needs provider</span>
                              )}
                            </p>
                          </div>

                          {job.calendarEvent ? (
                            <div className="mt-2 space-y-1 text-sm text-[#7A7060]">
                              <p>
                                <span className="font-medium text-[#0D1B2A]">Stay:</span>{" "}
                                {formatDateLabel(job.calendarEvent.checkInDate)} {"→"} {formatDateLabel(job.calendarEvent.checkOutDate)}
                              </p>
                              <p>
                                <span className="font-medium text-[#0D1B2A]">Nights:</span> {job.calendarEvent.nights}
                              </p>
                              <p>
                                <span className="font-medium text-[#0D1B2A]">Calendar event:</span>{" "}
                                {job.calendarEvent.summary}
                              </p>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
