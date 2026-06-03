import { useState } from "react";
import JobDetailsPanel from "@/components/JobDetailsPanel";
import { getBrowserTimeZone } from "@/lib/date/dateUtils";

type CleanerScheduleProperty = {
  id: string;
  name: string;
  address: string | null;
  listingUrl: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  maxGuests: number | null;
  defaultCheckInTime: string | null;
  defaultCheckOutTime: string | null;
  floorNumber: string | null;
  hasElevator: boolean;
  parkingInfo: string | null;
  accessNotes: string | null;
  cleaningNotes: string | null;
  supplyLocation: string | null;
  laundryLocation: string | null;
  trashInstructions: string | null;
  petInfo: string | null;
  providerInstructions: string | null;
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
  ownerSelfAssigned: boolean;
  title: string;
  scheduledDate: string;
  jobSource: string;
  requestedServiceType: string;
  priority: string;
  dueTime: string | null;
  estimatedDurationMinutes: number | null;
  ownerInstructions: string | null;
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
  timeZone: getBrowserTimeZone(),
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

function formatRequestedServiceType(serviceType: string): string {
  const knownLabels: Record<string, string> = {
    cleaning: "Cleaning",
    maintenance: "Maintenance",
    restock: "Restock",
    inspection: "Inspection",
    laundry: "Laundry",
    trash_removal: "Trash removal",
  };

  if (knownLabels[serviceType]) {
    return knownLabels[serviceType];
  }

  const normalized = serviceType.replace(/_/g, " ").trim();
  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatPriority(priority: string): string {
  const knownLabels: Record<string, string> = {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  };

  if (knownLabels[priority]) {
    return knownLabels[priority];
  }

  const normalized = priority.replace(/_/g, " ").trim();
  if (!normalized) {
    return "Unknown";
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

function formatBedroomBathroom(property: CleanerScheduleProperty): string {
  const bedroomsLabel = property.bedrooms !== null ? `${property.bedrooms} bd` : "";
  const bathroomsLabel = property.bathrooms !== null ? `${property.bathrooms} ba` : "";
  return [bedroomsLabel, bathroomsLabel].filter((value) => value.length > 0).join(" / ");
}

function getPrimaryProviderAction(job: CleanerScheduleJob, isDueToday: boolean): {
  label: string;
  nextStatus: string | null;
} {
  if (job.status === "assigned") {
    return { label: "Accept job", nextStatus: "accepted" };
  }

  if (job.status === "accepted" && isDueToday) {
    return { label: "Start job", nextStatus: "in_progress" };
  }

  if (job.status === "in_progress") {
    return { label: "Complete job", nextStatus: "completed" };
  }

  if (job.status === "accepted") {
    return { label: "View details", nextStatus: null };
  }

  if (job.status === "completed") {
    return { label: "View details", nextStatus: null };
  }

  if (job.status === "cancelled") {
    return { label: "View details", nextStatus: null };
  }

  return { label: "View details", nextStatus: null };
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
  const [selectedDetailsJobId, setSelectedDetailsJobId] = useState<string | null>(null);

  const selectedDetailsJob =
    selectedDetailsJobId ? jobs.find((job) => job.id === selectedDetailsJobId) ?? null : null;
  const todayDateOnly = toDateOnly(new Date().toISOString());

  if (jobs.length === 0) {
    return <p className="text-sm text-slate-600">No jobs assigned yet.</p>;
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
      {selectedDetailsJob ? (
        <JobDetailsPanel
          job={selectedDetailsJob}
          onClose={() => setSelectedDetailsJobId(null)}
        />
      ) : null}

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
                    const activeIssueLabels: string[] = [];
                    if (job.maintenanceNeeded) {
                      activeIssueLabels.push("Maintenance");
                    }
                    if (job.restockNeeded) {
                      activeIssueLabels.push("Restock");
                    }
                    if (job.damageFound) {
                      activeIssueLabels.push("Damage");
                    }

                    const propertyStats = formatBedroomBathroom(job.property);
                    const floorElevatorSummary = [
                      job.property.floorNumber ? `Floor ${job.property.floorNumber}` : "",
                      job.property.hasElevator ? "Elevator" : "No elevator",
                    ]
                      .filter((value) => value.length > 0)
                      .join(" · ");

                    const parkingSummary = job.property.parkingInfo
                      ? job.property.parkingInfo.length > 80
                        ? "Parking info available"
                        : job.property.parkingInfo
                      : "";

                    const isDueToday = toDateOnly(job.scheduledDate) === todayDateOnly;
                    const isSameDayTurnover =
                      job.calendarEvent !== null &&
                      toDateOnly(job.scheduledDate) === toDateOnly(job.calendarEvent.checkOutDate);
                    const isManualJob = job.jobSource === "manual";
                    const primaryAction = getPrimaryProviderAction(job, isDueToday);

                    return (
                      <>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          {formatRequestedServiceType(job.requestedServiceType)}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {formatSourcePlatformLabel(job.sourcePlatform)}
                        </span>
                        {isManualJob ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Manual job
                          </span>
                        ) : null}
                        {job.ownerSelfAssigned ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Owner assigned
                          </span>
                        ) : null}
                        {(job.priority === "high" || job.priority === "urgent") ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {formatPriority(job.priority)} priority
                          </span>
                        ) : null}
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
                      <span className="font-medium text-slate-900">Scheduled:</span> {formatDateLabel(job.scheduledDate)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Service:</span> {formatRequestedServiceType(job.requestedServiceType)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-900">Priority:</span> {formatPriority(job.priority)}
                    </p>
                    {job.dueTime ? (
                      <p>
                        <span className="font-medium text-slate-900">Due time:</span> {job.dueTime}
                      </p>
                    ) : null}
                    {job.estimatedDurationMinutes !== null ? (
                      <p>
                        <span className="font-medium text-slate-900">Duration:</span> {job.estimatedDurationMinutes} min
                      </p>
                    ) : null}
                    <p>
                      <span className="font-medium text-slate-900">Property:</span> {job.property.name}
                    </p>
                    {job.ownerInstructions ? (
                      <p>
                        <span className="font-medium text-slate-900">Owner instructions:</span> Available
                      </p>
                    ) : null}
                    {job.property.address ? (
                      <p>
                        <span className="font-medium text-slate-900">Address:</span>{" "}
                        {job.property.address}
                      </p>
                    ) : null}
                    {job.calendarEvent ? (
                      <p>
                        <span className="font-medium text-slate-900">Stay:</span>{" "}
                        {formatDateLabel(job.calendarEvent.checkInDate)} {"→"} {formatDateLabel(job.calendarEvent.checkOutDate)} · {job.calendarEvent.nights} nights
                      </p>
                    ) : null}
                    {job.property.defaultCheckOutTime || job.property.defaultCheckInTime ? (
                      <p>
                        <span className="font-medium text-slate-900">Window:</span>{" "}
                        {job.property.defaultCheckOutTime || "-"} {"→"} {job.property.defaultCheckInTime || "-"}
                      </p>
                    ) : null}
                    {propertyStats ? (
                      <p>
                        <span className="font-medium text-slate-900">Layout:</span> {propertyStats}
                      </p>
                    ) : null}
                    {job.property.floorNumber || !job.property.hasElevator ? (
                      <p>
                        <span className="font-medium text-slate-900">Floor/elevator:</span> {floorElevatorSummary}
                      </p>
                    ) : null}
                    {parkingSummary ? (
                      <p>
                        <span className="font-medium text-slate-900">Parking:</span> {parkingSummary}
                      </p>
                    ) : null}
                    {isDueToday ? (
                      <p className="font-medium text-amber-700">Due today</p>
                    ) : null}
                    {isSameDayTurnover ? (
                      <p className="font-medium text-amber-700">Same-day turnover</p>
                    ) : null}
                    {job.notes ? (
                      <p className="text-slate-600">Notes added</p>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        if (primaryAction.nextStatus && onStatusChange) {
                          onStatusChange(job.id, primaryAction.nextStatus);
                          return;
                        }
                        setSelectedDetailsJobId(job.id);
                      }}
                      disabled={Boolean(primaryAction.nextStatus && statusUpdatingJobId === job.id)}
                      className="min-h-11 w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {primaryAction.nextStatus && statusUpdatingJobId === job.id ? "Updating..." : primaryAction.label}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDetailsJobId(job.id)}
                      className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                    >
                      View details
                    </button>
                  </div>

                  <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-800">More</summary>

                    <div className="mt-3 space-y-2">
                      {job.status === "assigned" && onStatusChange ? (
                        <button
                          type="button"
                          onClick={() => onStatusChange(job.id, "declined")}
                          disabled={statusUpdatingJobId === job.id}
                          className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          Decline job
                        </button>
                      ) : null}

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
                          className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {job.notes ? "Add note" : "Add note"}
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

                        <div className="flex flex-col gap-2 sm:flex-row">
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
                            className="min-h-11 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Save note
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesJobId("");
                              setDraftNotes("");
                            }}
                            disabled={notesUpdatingJobId === job.id}
                            className="min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <h4 className="text-sm font-medium text-slate-900">Report issue</h4>

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

                  {(() => {
                    const activityItems = [
                      { label: "Accepted", value: job.acceptedAt },
                      { label: "Started", value: job.startedAt },
                      { label: "Completed", value: job.completedAt },
                      { label: "Cancelled", value: job.cancelledAt },
                    ].filter((item): item is { label: string; value: string } => Boolean(item.value));

                    return activityItems.length > 0 ? (
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
                    ) : null;
                  })()}
                    </div>
                  </details>
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
