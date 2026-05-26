import { useState } from "react";

export type CleaningJobCalendarEvent = {
  id: string;
  summary: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  source: string;
};

type AssignedProvider = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  serviceType: string;
};

export type CleaningJobItem = {
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
  property?: {
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
  calendarEvent: CleaningJobCalendarEvent | null;
  assignedProvider: AssignedProvider | null;
};

type CleanerProviderOption = {
  id: string;
  name: string;
  companyName: string | null;
};

type CleaningJobCardProps = {
  job: CleaningJobItem;
  onStatusChange?: (jobId: string, status: string) => void;
  statusUpdating?: boolean;
  cleanerProviders?: CleanerProviderOption[];
  onProviderChange?: (jobId: string, providerId: string | null) => void;
  providerUpdating?: boolean;
  showCleanerActions?: boolean;
  showOwnerActions?: boolean;
  onOwnerSelfAssign?: (jobId: string) => void;
  ownerSelfAssigning?: boolean;
  onNotesChange?: (jobId: string, notes: string | null) => void;
  notesUpdating?: boolean;
  onIssueFlagsChange?: (
    jobId: string,
    flags: {
      maintenanceNeeded?: boolean;
      restockNeeded?: boolean;
      damageFound?: boolean;
    }
  ) => void;
  issueFlagsUpdating?: boolean;
};

const STATUS_OPTIONS = [
  "needs_assignment",
  "assigned",
  "declined",
  "accepted",
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

export default function CleaningJobCard({
  job,
  onStatusChange,
  statusUpdating = false,
  cleanerProviders = [],
  onProviderChange,
  providerUpdating = false,
  showCleanerActions = false,
  showOwnerActions = false,
  onOwnerSelfAssign,
  ownerSelfAssigning = false,
  onNotesChange,
  notesUpdating = false,
  onIssueFlagsChange,
  issueFlagsUpdating = false,
}: CleaningJobCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(job.notes ?? "");

  const activityItems = [
    { label: "Accepted", value: job.acceptedAt },
    { label: "Started", value: job.startedAt },
    { label: "Completed", value: job.completedAt },
    { label: "Cancelled", value: job.cancelledAt },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  const ownerStatusOptions = Array.from(
    new Set([
      "needs_assignment",
      "assigned",
      "cancelled",
      job.status,
      ...(job.ownerSelfAssigned ? ["in_progress", "completed"] : []),
    ])
  ).filter((status): status is (typeof STATUS_OPTIONS)[number] =>
    (STATUS_OPTIONS as readonly string[]).includes(status)
  );

  const hasIssuesFlagged =
    job.maintenanceNeeded || job.restockNeeded || job.damageFound;
  const isManualJob = job.jobSource === "manual";
  const isHighPriority = job.priority === "high" || job.priority === "urgent";

  function handleEditNotes() {
    setDraftNotes(job.notes ?? "");
    setIsEditingNotes(true);
  }

  function handleCancelNotes() {
    setDraftNotes(job.notes ?? "");
    setIsEditingNotes(false);
  }

  function handleSaveNotes() {
    const trimmed = draftNotes.trim();

    if (onNotesChange) {
      onNotesChange(job.id, trimmed.length === 0 ? null : trimmed);
    }

    setIsEditingNotes(false);
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
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
                Self-assigned by owner
              </span>
            ) : null}
            {isHighPriority ? (
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {formatPriority(job.priority)} priority
              </span>
            ) : null}
          </div>
          {hasIssuesFlagged ? (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Issues flagged
            </span>
          ) : null}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-700">
          {formatStatusLabel(job.status)}
        </span>
      </div>

      <p className="text-sm text-slate-700">
        <span className="font-medium text-slate-900">Scheduled:</span> {formatDateLabel(job.scheduledDate)}
      </p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-700">
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
      </div>
      {job.ownerInstructions ? (
        <p className="mt-1 text-xs font-medium text-slate-600">Owner instructions available</p>
      ) : null}

      <div className="mt-2 space-y-1">
        <p className="text-sm text-slate-700">
          <span className="font-medium text-slate-900">Assigned to:</span>{" "}
          {job.assignedProvider ? job.assignedProvider.name : "Unassigned"}
        </p>
        {job.assignedProvider?.companyName ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Company:</span>{" "}
            {job.assignedProvider.companyName}
          </p>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        <label
          htmlFor={`cleaning-job-provider-${job.id}`}
          className="block text-sm font-medium text-slate-700"
        >
          Assigned provider
        </label>
        <select
          id={`cleaning-job-provider-${job.id}`}
          value={job.assignedProviderId ?? ""}
          onChange={(event) => {
            if (onProviderChange) {
              const selectedProviderId = event.target.value;
              onProviderChange(job.id, selectedProviderId === "" ? null : selectedProviderId);
            }
          }}
          disabled={providerUpdating}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Unassigned</option>
          {cleanerProviders.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.companyName
                ? `${provider.name} (${provider.companyName})`
                : provider.name}
            </option>
          ))}
        </select>
        {providerUpdating ? (
          <p className="text-xs text-slate-500">Updating assignment...</p>
        ) : null}
      </div>

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
          {(showOwnerActions ? ownerStatusOptions : STATUS_OPTIONS).map((status) => (
            <option key={status} value={status}>
              {formatStatusLabel(status)}
            </option>
          ))}
        </select>
        {statusUpdating ? <p className="text-xs text-slate-500">Updating...</p> : null}
      </div>

      {showOwnerActions ? (
        <section className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-medium text-slate-900">Owner actions</h4>

          {job.ownerSelfAssigned ? (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
              Self-assigned by owner
            </span>
          ) : null}

          {job.ownerSelfAssigned && job.status === "accepted" ? (
            <button
              type="button"
              onClick={() => onStatusChange?.(job.id, "in_progress")}
              disabled={statusUpdating || !onStatusChange}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Start job
            </button>
          ) : null}

          {job.ownerSelfAssigned && job.status === "in_progress" ? (
            <button
              type="button"
              onClick={() => onStatusChange?.(job.id, "completed")}
              disabled={statusUpdating || !onStatusChange}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Complete job
            </button>
          ) : null}

          {job.ownerSelfAssigned && job.status === "completed" ? (
            <p className="text-xs text-slate-600">Owner completed this job.</p>
          ) : null}

          {!job.ownerSelfAssigned && !job.assignedProviderId ? (
            <button
              type="button"
              onClick={() => onOwnerSelfAssign?.(job.id)}
              disabled={ownerSelfAssigning || !onOwnerSelfAssign}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ownerSelfAssigning ? "Self-assigning..." : "Self-assign"}
            </button>
          ) : null}

          {!job.ownerSelfAssigned && !!job.assignedProviderId ? (
            <p className="text-xs text-slate-600">
              Provider-assigned job. Provider controls accept/start/complete.
            </p>
          ) : null}
        </section>
      ) : null}

      {showCleanerActions ? (
        <section className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-sm font-medium text-slate-900">Cleaner actions</h4>

          {job.status === "assigned" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onStatusChange?.(job.id, "accepted")}
                disabled={statusUpdating || !onStatusChange}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Accept job
              </button>
              <button
                type="button"
                onClick={() => onStatusChange?.(job.id, "declined")}
                disabled={statusUpdating || !onStatusChange}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Decline job
              </button>
            </div>
          ) : null}

          {job.status === "accepted" ? (
            <button
              type="button"
              onClick={() => onStatusChange?.(job.id, "in_progress")}
              disabled={statusUpdating || !onStatusChange}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Start job
            </button>
          ) : null}

          {job.status === "in_progress" ? (
            <button
              type="button"
              onClick={() => onStatusChange?.(job.id, "completed")}
              disabled={statusUpdating || !onStatusChange}
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

          {job.status === "needs_assignment" ? (
            <p className="text-xs text-slate-600">
              Assign a cleaner before actions are available.
            </p>
          ) : null}

          {job.status === "cancelled" ? (
            <p className="text-xs text-slate-600">This job is cancelled.</p>
          ) : null}

          {job.status === "declined" ? (
            <p className="text-xs text-slate-600">This job was declined and needs reassignment.</p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h4 className="text-sm font-medium text-slate-900">Issue flags</h4>

        <div className="space-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={job.maintenanceNeeded}
              disabled={issueFlagsUpdating}
              onChange={(event) =>
                onIssueFlagsChange?.(job.id, {
                  maintenanceNeeded: event.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed"
            />
            <span>Maintenance needed</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={job.restockNeeded}
              disabled={issueFlagsUpdating}
              onChange={(event) =>
                onIssueFlagsChange?.(job.id, {
                  restockNeeded: event.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed"
            />
            <span>Restock needed</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={job.damageFound}
              disabled={issueFlagsUpdating}
              onChange={(event) =>
                onIssueFlagsChange?.(job.id, {
                  damageFound: event.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:cursor-not-allowed"
            />
            <span>Damage found</span>
          </label>
        </div>

        {issueFlagsUpdating ? (
          <p className="text-xs text-slate-500">Updating issue flags...</p>
        ) : null}
      </section>

      <section className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-slate-900">Notes</h4>
          {!isEditingNotes ? (
            <button
              type="button"
              onClick={handleEditNotes}
              disabled={notesUpdating}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {job.notes ? "Edit notes" : "Add notes"}
            </button>
          ) : null}
        </div>

        {!isEditingNotes ? (
          job.notes ? <p className="text-sm text-slate-700">{job.notes}</p> : null
        ) : (
          <div className="space-y-2">
            <textarea
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              rows={3}
              disabled={notesUpdating}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={notesUpdating}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save notes
              </button>
              <button
                type="button"
                onClick={handleCancelNotes}
                disabled={notesUpdating}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {notesUpdating ? <p className="text-xs text-slate-500">Saving notes...</p> : null}
      </section>

      {activityItems.length > 0 ? (
        <section className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
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
        <div className="mt-3 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Stay:</span>{" "}
            {formatDateLabel(job.calendarEvent.checkInDate)} {"→"} {formatDateLabel(job.calendarEvent.checkOutDate)}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Nights:</span> {job.calendarEvent.nights}
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Calendar event:</span> {job.calendarEvent.summary}
          </p>
        </div>
      ) : null}
    </article>
  );
}
