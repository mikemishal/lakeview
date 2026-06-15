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
  quotedPrice: string | null;
  quotedPriceNotes: string | null;
  quotedPriceSource: string | null;
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
  cleaningFlatRateCents?: number | null;
  cleaningHourlyRateCents?: number | null;
};

type CleaningJobCardProps = {
  job: CleaningJobItem;
  onOpen?: (job: CleaningJobItem) => void;
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

function getStatusLeftBorderColor(status: string): string {
  if (["assigned", "accepted", "completed", "synced"].includes(status)) {
    return "#1A6B60";
  }

  if (["needs_assignment", "pending_acceptance", "unassigned"].includes(status)) {
    return "#D97706";
  }

  return "#EF4444";
}

function getStatusBadgeColor(status: string): { bg: string; text: string } {
  if (["assigned", "accepted", "completed", "synced"].includes(status)) {
    return { bg: "bg-[#E8F4F1]", text: "text-[#0F6A5F]" };
  }

  if (["needs_assignment", "pending_acceptance", "unassigned"].includes(status)) {
    return { bg: "bg-[#FFF4E5]", text: "text-[#9A5B00]" };
  }

  return { bg: "bg-[#FDECEC]", text: "text-[#B42318]" };
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

function formatCentsToDollars(cents: number | null | undefined): string {
  if (typeof cents !== "number" || cents < 0) {
    return "Not set";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CleaningJobCard({
  job,
  onOpen,
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
  const [showAssignmentPanel, setShowAssignmentPanel] = useState(false);
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
  const propertyLabel = job.property?.name?.trim() || "Unknown property";
  const cardTitle = `${formatRequestedServiceType(job.requestedServiceType)} · ${propertyLabel}`;

  const assignmentOptions = (() => {
    const options = [...cleanerProviders];
    if (
      job.assignedProviderId &&
      job.assignedProvider &&
      !options.some((provider) => provider.id === job.assignedProviderId)
    ) {
      options.unshift({
        id: job.assignedProviderId,
        name: `${job.assignedProvider.name} (legacy assignment)`,
        companyName: job.assignedProvider.companyName,
      });
    }
    return options;
  })();

  const priceDisplay = (() => {
    if (job.requestedServiceType !== "cleaning") {
      return <span className="text-[#7A7060]">Price setup later</span>;
    }

    const quotedPriceDollars =
      typeof job.quotedPrice === "string" ? Number(job.quotedPrice) : null;

    if (typeof quotedPriceDollars === "number" && Number.isFinite(quotedPriceDollars) && quotedPriceDollars >= 0) {
      return `$${quotedPriceDollars.toFixed(2)}`;
    }

    const teamRate = cleanerProviders.find((provider) => provider.id === job.assignedProviderId)?.cleaningFlatRateCents;
    if (typeof teamRate === "number" && teamRate >= 0) {
      return formatCentsToDollars(teamRate);
    }

    return <span className="text-[#D97706]">Price not set</span>;
  })();

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
    <article
      className="rounded-[12px] border border-[#E5E0D8] border-l-4 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
      style={{ borderLeftColor: getStatusLeftBorderColor(job.status) }}
    >
      <div className="border-b border-[#E5E0D8] bg-[#FAF7F2]/70 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h3 className="font-serif text-base font-semibold text-[#0D1B2A]">{cardTitle}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-[#E8F4F1] px-3 py-1 text-xs font-medium text-[#0F6A5F]">
                {formatRequestedServiceType(job.requestedServiceType)}
              </span>
              <span className="inline-flex rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-medium text-[#546170]">
                {formatSourcePlatformLabel(job.sourcePlatform)}
              </span>
              {isManualJob ? <span className="inline-flex rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-medium text-[#9A5B00]">Manual job</span> : null}
              {job.ownerSelfAssigned ? <span className="inline-flex rounded-full bg-[#E8F4F1] px-3 py-1 text-xs font-medium text-[#0F6A5F]">Self-assigned by owner</span> : null}
              {isHighPriority ? <span className="inline-flex rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-medium text-[#9A5B00]">{formatPriority(job.priority)} priority</span> : null}
              {hasIssuesFlagged ? <span className="inline-flex rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-medium text-[#B42318]">Issues flagged</span> : null}
            </div>
          </div>

          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeColor(job.status).bg} ${getStatusBadgeColor(job.status).text}`}>
            {formatStatusLabel(job.status)}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 text-sm text-[#7A7060] sm:grid-cols-2 xl:grid-cols-4">
          <p><span className="font-medium text-[#0D1B2A]">Scheduled:</span> {formatDateLabel(job.scheduledDate)}</p>
          {job.dueTime ? <p><span className="font-medium text-[#0D1B2A]">Time:</span> {job.dueTime}</p> : null}
          <p><span className="font-medium text-[#0D1B2A]">Service:</span> {formatRequestedServiceType(job.requestedServiceType)}</p>
          <p><span className="font-medium text-[#0D1B2A]">Priority:</span> {formatPriority(job.priority)}</p>
          {job.estimatedDurationMinutes !== null ? <p><span className="font-medium text-[#0D1B2A]">Duration:</span> {job.estimatedDurationMinutes} min</p> : null}
          <p><span className="font-medium text-[#0D1B2A]">Price:</span> {priceDisplay}</p>
        </div>

        {job.ownerInstructions ? (
          <p className="rounded-lg border border-[#E5E0D8] bg-[#FAF7F2] px-4 py-3 text-sm text-[#7A7060]">
            <span className="font-medium text-[#0D1B2A]">Owner instructions available</span>
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#0D1B2A]">Assigned to:</span> {job.assignedProvider ? job.assignedProvider.name : "Unassigned"}</p>
          {job.assignedProvider?.companyName ? <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#0D1B2A]">Company:</span> {job.assignedProvider.companyName}</p> : null}
          {job.ownerSelfAssigned ? <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#0D1B2A]">Owner status:</span> Self-assigned by owner</p> : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpen?.(job)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#0D1B2A] px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_18px_rgba(13,27,42,0.12)] transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Open
          </button>
          {showOwnerActions ? (
            <button
              type="button"
              onClick={() => setShowAssignmentPanel((previous) => !previous)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#E5E0D8] bg-white px-5 py-2.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2] sm:w-auto"
            >
              {job.assignedProviderId ? "Change Assignment" : "Assign"}
            </button>
          ) : null}
        </div>

        {showAssignmentPanel ? (
          <div className="space-y-4 rounded-[12px] border border-[#E5E0D8] bg-[#FAF7F2] p-4">
            <div className="space-y-2">
              <label htmlFor={`cleaning-job-provider-${job.id}`} className="block text-sm font-medium text-[#0D1B2A]">Assigned provider</label>
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
                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#0D1B2A] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">{assignmentOptions.length === 0 ? "No team providers available" : "Unassigned"}</option>
                {assignmentOptions.map((provider) => {
                  const priceLabel =
                    job.requestedServiceType === "cleaning"
                      ? provider.cleaningFlatRateCents
                        ? ` — ${formatCentsToDollars(provider.cleaningFlatRateCents)}`
                        : provider.cleaningHourlyRateCents
                          ? ` — $${(provider.cleaningHourlyRateCents / 100).toFixed(2)}/hr`
                          : " — Price not set"
                      : "";
                  const providerLabel = provider.companyName
                    ? `${provider.name} (${provider.companyName})`
                    : provider.name;
                  return (
                    <option key={provider.id} value={provider.id}>
                      {providerLabel}
                      {priceLabel}
                    </option>
                  );
                })}
              </select>
              {providerUpdating ? <p className="text-xs text-[#7A7060]">Updating assignment...</p> : null}
            </div>

            <div className="space-y-2">
              <label htmlFor={`cleaning-job-status-${job.id}`} className="block text-sm font-medium text-[#0D1B2A]">Status</label>
              <select
                id={`cleaning-job-status-${job.id}`}
                value={job.status}
                onChange={(event) => {
                  if (onStatusChange) {
                    onStatusChange(job.id, event.target.value);
                  }
                }}
                disabled={statusUpdating}
                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#0D1B2A] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {(showOwnerActions ? ownerStatusOptions : STATUS_OPTIONS).map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
              {statusUpdating ? <p className="text-xs text-[#7A7060]">Updating...</p> : null}
            </div>

            {showOwnerActions ? (
              <section className="space-y-3 rounded-[12px] border border-[#E5E0D8] bg-white p-4">
                <h4 className="text-sm font-medium text-[#0D1B2A]">Owner actions</h4>
                {job.ownerSelfAssigned ? <span className="inline-flex rounded-full bg-[#E8F4F1] px-3 py-1 text-xs font-medium text-[#0F6A5F]">Self-assigned by owner</span> : null}
                {job.ownerSelfAssigned && job.status === "accepted" ? <button type="button" onClick={() => onStatusChange?.(job.id, "in_progress")} disabled={statusUpdating || !onStatusChange} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60">Start job</button> : null}
                {job.ownerSelfAssigned && job.status === "in_progress" ? <button type="button" onClick={() => onStatusChange?.(job.id, "completed")} disabled={statusUpdating || !onStatusChange} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60">Complete job</button> : null}
                {job.ownerSelfAssigned && job.status === "completed" ? <p className="text-xs text-[#7A7060]">Owner completed this job.</p> : null}
                {!job.ownerSelfAssigned && !job.assignedProviderId ? <button type="button" onClick={() => onOwnerSelfAssign?.(job.id)} disabled={ownerSelfAssigning || !onOwnerSelfAssign} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60">{ownerSelfAssigning ? "Self-assigning..." : "Self-assign"}</button> : null}
                {!job.ownerSelfAssigned && !!job.assignedProviderId ? <p className="text-xs text-[#7A7060]">Provider-assigned job. Provider controls accept/start/complete.</p> : null}
              </section>
            ) : null}

            {showCleanerActions ? (
              <section className="space-y-3 rounded-[12px] border border-[#E5E0D8] bg-white p-4">
                <h4 className="text-sm font-medium text-[#0D1B2A]">Cleaner actions</h4>
                {job.status === "assigned" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => onStatusChange?.(job.id, "accepted")} disabled={statusUpdating || !onStatusChange} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60">Accept job</button>
                    <button type="button" onClick={() => onStatusChange?.(job.id, "declined")} disabled={statusUpdating || !onStatusChange} className="min-h-11 rounded-full border border-[#E5E0D8] bg-white px-4 py-2.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-60">Decline job</button>
                  </div>
                ) : null}
                {job.status === "accepted" ? <button type="button" onClick={() => onStatusChange?.(job.id, "in_progress")} disabled={statusUpdating || !onStatusChange} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60">Start job</button> : null}
                {job.status === "in_progress" ? <button type="button" onClick={() => onStatusChange?.(job.id, "completed")} disabled={statusUpdating || !onStatusChange} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60">Complete job</button> : null}
                {job.status === "completed" ? <span className="inline-flex rounded-full bg-[#E8F4F1] px-3 py-1 text-xs font-medium text-[#0F6A5F]">Job completed</span> : null}
                {job.status === "needs_assignment" ? <p className="text-xs text-[#7A7060]">This job still needs a provider.</p> : null}
                {job.status === "cancelled" ? <p className="text-xs text-[#7A7060]">This job is cancelled.</p> : null}
                {job.status === "declined" ? <p className="text-xs text-[#7A7060]">This job was declined and needs reassignment.</p> : null}
              </section>
            ) : null}

            <section className="space-y-3 rounded-[12px] border border-[#E5E0D8] bg-white p-4">
              <h4 className="text-sm font-medium text-[#0D1B2A]">Report issue</h4>
              <div className="space-y-2 text-sm text-[#7A7060]">
                <label className="flex items-center gap-2"><input type="checkbox" checked={job.maintenanceNeeded} disabled={issueFlagsUpdating} onChange={(event) => onIssueFlagsChange?.(job.id, { maintenanceNeeded: event.target.checked })} className="h-4 w-4 rounded border-[#E5E0D8] text-[#0D1B2A] focus:ring-[#B8860B] disabled:cursor-not-allowed" /><span>Maintenance needed</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={job.restockNeeded} disabled={issueFlagsUpdating} onChange={(event) => onIssueFlagsChange?.(job.id, { restockNeeded: event.target.checked })} className="h-4 w-4 rounded border-[#E5E0D8] text-[#0D1B2A] focus:ring-[#B8860B] disabled:cursor-not-allowed" /><span>Restock needed</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={job.damageFound} disabled={issueFlagsUpdating} onChange={(event) => onIssueFlagsChange?.(job.id, { damageFound: event.target.checked })} className="h-4 w-4 rounded border-[#E5E0D8] text-[#0D1B2A] focus:ring-[#B8860B] disabled:cursor-not-allowed" /><span>Damage found</span></label>
              </div>
              {issueFlagsUpdating ? <p className="text-xs text-[#7A7060]">Updating issue flags...</p> : null}
            </section>

            <section className="space-y-3 rounded-[12px] border border-[#E5E0D8] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-[#0D1B2A]">Notes</h4>
                {!isEditingNotes ? <button type="button" onClick={handleEditNotes} disabled={notesUpdating} className="min-h-11 rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-4 py-2.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">Add note</button> : null}
              </div>
              {!isEditingNotes ? (job.notes ? <p className="text-sm text-[#7A7060]">{job.notes}</p> : null) : (
                <div className="space-y-2">
                  <textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} rows={3} disabled={notesUpdating} className="w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#0D1B2A] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60" />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={handleSaveNotes} disabled={notesUpdating} className="min-h-11 rounded-full bg-[#0D1B2A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60">Save note</button>
                    <button type="button" onClick={handleCancelNotes} disabled={notesUpdating} className="min-h-11 rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-4 py-2.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
                  </div>
                </div>
              )}
              {notesUpdating ? <p className="text-xs text-[#7A7060]">Saving notes...</p> : null}
            </section>

            {activityItems.length > 0 ? (
              <section className="space-y-2 rounded-[12px] border border-[#E5E0D8] bg-[#FAF7F2] p-4">
                <h4 className="text-sm font-medium text-[#0D1B2A]">Activity</h4>
                <div className="space-y-1 text-sm text-[#7A7060]">
                  {activityItems.map((item) => (
                    <p key={item.label}><span className="font-medium text-[#0D1B2A]">{item.label}:</span>{" "}{formatActivityDateTimeLabel(item.value)}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {job.calendarEvent ? (
              <div className="space-y-1 rounded-[12px] border border-[#E5E0D8] bg-[#FAF7F2] p-4">
                <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#0D1B2A]">Stay:</span>{" "}{formatDateLabel(job.calendarEvent.checkInDate)} {"→"} {formatDateLabel(job.calendarEvent.checkOutDate)}</p>
                <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#0D1B2A]">Nights:</span> {job.calendarEvent.nights}</p>
                <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#0D1B2A]">Calendar event:</span> {job.calendarEvent.summary}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
