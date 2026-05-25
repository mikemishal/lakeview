import { useState } from "react";

type CleanerScheduleProperty = {
  id: string;
  name: string;
  address: string | null;
};

type CleanerScheduleCalendarEvent = {
  id: string;
  summary: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  source: string;
};

type CleanerScheduleAssignedProvider = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  serviceType: string;
};

export type CleanerScheduleJob = {
  id: string;
  propertyId: string;
  calendarEventId: string | null;
  assignedProviderId: string | null;
  title: string;
  scheduledDate: string;
  status: string;
  sourcePlatform: string;
  cleaningType: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  maintenanceNeeded: boolean;
  restockNeeded: boolean;
  damageFound: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  property: CleanerScheduleProperty;
  calendarEvent: CleanerScheduleCalendarEvent | null;
  assignedProvider?: CleanerScheduleAssignedProvider | null;
};

type CleanerScheduleProps = {
  jobs: CleanerScheduleJob[];
  onStatusChange?: (jobId: string, status: string) => void;
  statusUpdatingJobId?: string;
  onNotesChange?: (jobId: string, notes: string | null) => void;
  notesUpdatingJobId?: string;
  onIssueFlagsChange?: (
    jobId: string,
    flags: {
      maintenanceNeeded?: boolean;
      restockNeeded?: boolean;
      damageFound?: boolean;
    }
  ) => void;
  issueFlagsUpdatingJobId?: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const activityDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
});

function formatStatusLabel(status: string): string {
  const knownLabels: Record<string, string> = {
    needs_assignment: "Needs assignment",
    assigned: "Assigned",
    declined: "Declined",
    accepted: "Accepted",
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

function formatActivityDateTimeLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return activityDateTimeFormatter.format(parsed);
}

function toTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export default function CleanerSchedule({
  jobs,
  onStatusChange,
  statusUpdatingJobId = "",
  onNotesChange,
  notesUpdatingJobId = "",
  onIssueFlagsChange,
  issueFlagsUpdatingJobId = "",
}: CleanerScheduleProps) {
  const [editingNotesJobId, setEditingNotesJobId] = useState("");
  const [draftNotes, setDraftNotes] = useState("");

  if (jobs.length === 0) {
    return <p className="text-sm text-slate-600">No assigned cleaning jobs.</p>;
  }

  const grouped = jobs.reduce<Record<string, CleanerScheduleJob[]>>((accumulator, job) => {
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
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              {formatDateLabel(`${dateKey}T00:00:00.000Z`)}
            </h3>

            <div className="space-y-3">
              {dayJobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  {(() => {
                    const activityItems = [
                      { label: "Accepted", value: job.acceptedAt },
                      { label: "Started", value: job.startedAt },
                      { label: "Completed", value: job.completedAt },
                      { label: "Cancelled", value: job.cancelledAt },
                    ].filter((item): item is { label: string; value: string } => Boolean(item.value));

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

                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <span className="font-medium text-slate-900">Property:</span> {job.property.name}
                    </p>
                    {job.property.address ? (
                      <p>
                        <span className="font-medium text-slate-900">Address:</span>{" "}
                        {job.property.address}
                      </p>
                    ) : null}
                  </div>

                  <section className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-slate-900">Notes</h4>
                      {editingNotesJobId !== job.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotesJobId(job.id);
                            setDraftNotes(job.notes ?? "");
                          }}
                          disabled={notesUpdatingJobId === job.id}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {job.notes ? "Edit notes" : "Add notes"}
                        </button>
                      ) : null}
                    </div>

                    {editingNotesJobId !== job.id ? (
                      job.notes ? <p className="text-sm text-slate-700">{job.notes}</p> : null
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={draftNotes}
                          onChange={(event) => setDraftNotes(event.target.value)}
                          rows={3}
                          disabled={notesUpdatingJobId === job.id}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = draftNotes.trim();
                              if (onNotesChange) {
                                onNotesChange(job.id, trimmed.length === 0 ? null : trimmed);
                              }
                              setEditingNotesJobId("");
                            }}
                            disabled={notesUpdatingJobId === job.id}
                            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Save notes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesJobId("");
                              setDraftNotes("");
                            }}
                            disabled={notesUpdatingJobId === job.id}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {notesUpdatingJobId === job.id ? (
                      <p className="text-xs text-slate-500">Saving notes...</p>
                    ) : null}
                  </section>

                  <section className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                    <h4 className="text-sm font-medium text-slate-900">Issue flags</h4>

                    <div className="space-y-2 text-sm text-slate-700">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={job.maintenanceNeeded}
                          onChange={(event) =>
                            onIssueFlagsChange?.(job.id, {
                              maintenanceNeeded: event.target.checked,
                            })
                          }
                          disabled={issueFlagsUpdatingJobId === job.id}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        Maintenance needed
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={job.restockNeeded}
                          onChange={(event) =>
                            onIssueFlagsChange?.(job.id, {
                              restockNeeded: event.target.checked,
                            })
                          }
                          disabled={issueFlagsUpdatingJobId === job.id}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        Restock needed
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={job.damageFound}
                          onChange={(event) =>
                            onIssueFlagsChange?.(job.id, {
                              damageFound: event.target.checked,
                            })
                          }
                          disabled={issueFlagsUpdatingJobId === job.id}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        Damage found
                      </label>
                    </div>

                    {issueFlagsUpdatingJobId === job.id ? (
                      <p className="text-xs text-slate-500">Updating issue flags...</p>
                    ) : null}
                  </section>

                  {(onStatusChange || job.status === "completed" || job.status === "cancelled") ? (
                    <section className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                      <h4 className="text-sm font-medium text-slate-900">Cleaner actions</h4>

                      {onStatusChange && job.status === "assigned" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onStatusChange(job.id, "accepted")}
                            disabled={statusUpdatingJobId === job.id}
                            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Accept job
                          </button>
                          <button
                            type="button"
                            onClick={() => onStatusChange(job.id, "declined")}
                            disabled={statusUpdatingJobId === job.id}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Decline job
                          </button>
                        </div>
                      ) : null}

                      {onStatusChange && job.status === "accepted" ? (
                        <button
                          type="button"
                          onClick={() => onStatusChange(job.id, "in_progress")}
                          disabled={statusUpdatingJobId === job.id}
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Start job
                        </button>
                      ) : null}

                      {onStatusChange && job.status === "in_progress" ? (
                        <button
                          type="button"
                          onClick={() => onStatusChange(job.id, "completed")}
                          disabled={statusUpdatingJobId === job.id}
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Complete job
                        </button>
                      ) : null}

                      {job.status === "completed" ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          Job completed
                        </span>
                      ) : null}

                      {job.status === "cancelled" ? (
                        <p className="text-xs text-slate-600">This job is cancelled.</p>
                      ) : null}

                      {job.status === "declined" ? (
                        <p className="text-xs text-slate-600">This job was declined.</p>
                      ) : null}

                      {statusUpdatingJobId === job.id ? (
                        <p className="text-xs text-slate-500">Updating...</p>
                      ) : null}
                    </section>
                  ) : null}

                  {activityItems.length > 0 ? (
                    <section className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white p-3">
                      <h4 className="text-sm font-medium text-slate-900">Activity</h4>
                      <div className="space-y-1 text-sm text-slate-700">
                        {activityItems.map((item) => (
                          <p key={item.label}>
                            <span className="font-medium text-slate-900">{item.label}:</span>{" "}
                            {formatActivityDateTimeLabel(item.value)}
                          </p>
                        ))}
                      </div>
                    </section>
                  ) : null}

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
