import { useState } from "react";
import JobDetailsPanel from "@/components/JobDetailsPanel";

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
  quotedPrice?: string | number | null;
  quotedPriceNotes?: string | null;
  quotedPriceSource?: string | null;
  property: CleanerScheduleProperty;
  calendarEvent: CleanerScheduleCalendarEvent | null;
  assignedProvider?: CleanerScheduleAssignedProvider | null;
};

type CleanerScheduleProps = {
  jobs: CleanerScheduleJob[];
  allProviderJobs?: CleanerScheduleJob[];
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

// === Conflict Detection Helpers ===

function getJobDateKey(job: CleanerScheduleJob): string {
  return toDateOnly(job.scheduledDate);
}

function parseTimeToMinutes(timeStr: string): number | null {
  const clean = timeStr.trim();
  const ampm = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    if (ampm[3].toLowerCase() === "pm" && h < 12) h += 12;
    if (ampm[3].toLowerCase() === "am" && h === 12) h = 0;
    return h * 60 + m;
  }
  const hm = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10);
  return null;
}

function getJobTimeRange(job: CleanerScheduleJob): { start: number; end: number } | null {
  if (!job.dueTime) return null;
  const start = parseTimeToMinutes(job.dueTime);
  if (start === null) return null;
  const duration = job.estimatedDurationMinutes ?? 120;
  return { start, end: start + duration };
}

function findSameDayProviderJobs(
  job: CleanerScheduleJob,
  allJobs: CleanerScheduleJob[]
): CleanerScheduleJob[] {
  const dateKey = getJobDateKey(job);
  const inactive = new Set(["cancelled", "completed", "declined"]);
  return allJobs.filter(
    (other) =>
      other.id !== job.id && !inactive.has(other.status) && getJobDateKey(other) === dateKey
  );
}

function hasTimeOverlap(jobA: CleanerScheduleJob, jobB: CleanerScheduleJob): boolean {
  const rangeA = getJobTimeRange(jobA);
  const rangeB = getJobTimeRange(jobB);
  if (!rangeA || !rangeB) return false;
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

type ConflictResult = {
  type: "overlap" | "sameday" | "none";
  conflictingJobs: CleanerScheduleJob[];
};

function getProviderJobConflictStatus(
  job: CleanerScheduleJob,
  allJobs: CleanerScheduleJob[]
): ConflictResult {
  const sameDayJobs = findSameDayProviderJobs(job, allJobs);
  if (sameDayJobs.length === 0) return { type: "none", conflictingJobs: [] };
  const overlapJobs = sameDayJobs.filter((other) => hasTimeOverlap(job, other));
  if (overlapJobs.length > 0) return { type: "overlap", conflictingJobs: overlapJobs };
  return { type: "sameday", conflictingJobs: sameDayJobs };
}

// === Price Helper ===

function formatJobPrice(job: CleanerScheduleJob): { display: string; hasPrice: boolean } {
  if (job.quotedPrice !== null && job.quotedPrice !== undefined && String(job.quotedPrice) !== "") {
    const amount = parseFloat(String(job.quotedPrice));
    if (!Number.isNaN(amount)) {
      const formatted = amount % 1 === 0 ? `$${amount}` : `$${amount.toFixed(2)}`;
      return { display: formatted, hasPrice: true };
    }
  }
  return { display: "Price not set", hasPrice: false };
}

// === Status Styling Helpers ===

function getStatusBorderColor(status: string): string {
  if (status === "assigned") return "#D97706";
  if (status === "in_progress") return "#1A6B60";
  if (status === "accepted") return "#0D1B2A";
  if (status === "completed") return "#1A6B60";
  if (status === "cancelled" || status === "declined") return "#DC2626";
  return "#E5E0D8";
}

function getStatusPillColors(status: string): { bg: string; text: string } {
  if (status === "assigned") return { bg: "#FEF3C7", text: "#D97706" };
  if (status === "accepted") return { bg: "#DBEAFE", text: "#1D4ED8" };
  if (status === "in_progress") return { bg: "#CCFBF1", text: "#0F766E" };
  if (status === "completed") return { bg: "#D1FAE5", text: "#047857" };
  if (status === "cancelled") return { bg: "#FEE2E2", text: "#DC2626" };
  if (status === "declined") return { bg: "#F3F4F6", text: "#6B7280" };
  return { bg: "#F3F4F6", text: "#374151" };
}

// === Scheduled Date/Time Display ===

function formatScheduledDateTime(job: CleanerScheduleJob, todayDateOnly: string): string {
  const dateKey = getJobDateKey(job);
  const dateLabel =
    dateKey === todayDateOnly
      ? "Today"
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${dateKey}T00:00:00.000Z`));
  if (job.dueTime) return `${dateLabel}, ${job.dueTime}`;
  return dateLabel;
}

// === Conflict Detection Helpers ===

export default function CleanerSchedule({
  jobs,
  allProviderJobs,
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
  const [confirmStartJobId, setConfirmStartJobId] = useState<string | null>(null);
  const [confirmCompleteJobId, setConfirmCompleteJobId] = useState<string | null>(null);

  const effectiveAllJobs = allProviderJobs ?? jobs;
  const selectedDetailsJob =
    selectedDetailsJobId ? jobs.find((job) => job.id === selectedDetailsJobId) ?? null : null;
  const todayDateOnly = toDateOnly(new Date().toISOString());

  if (jobs.length === 0) {
    return (
      <div
        className="rounded-xl border-2 border-dashed p-8 text-center"
        style={{ borderColor: "#E5E0D8" }}
      >
        <p className="font-medium" style={{ color: "#0D1B2A" }}>
          No work in your queue
        </p>
        <p className="mt-1 text-sm" style={{ color: "#7A7060" }}>
          Assigned jobs from owners will appear here.
        </p>
      </div>
    );
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
    <div className="space-y-4">
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
        const isToday = dateKey === todayDateOnly;

        return (
          <section key={dateKey}>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wide"
              style={{ color: isToday ? "#D97706" : "#7A7060" }}
            >
              {isToday ? "Today" : formatDateLabel(`${dateKey}T00:00:00.000Z`)}
            </h3>

            <div className="space-y-3">
              {dayJobs.map((job) => {
                const isDueToday = dateKey === todayDateOnly;
                const activeIssueLabels: string[] = [];
                if (job.maintenanceNeeded) activeIssueLabels.push("Maintenance");
                if (job.restockNeeded) activeIssueLabels.push("Restock");
                if (job.damageFound) activeIssueLabels.push("Damage");

                const conflict = getProviderJobConflictStatus(job, effectiveAllJobs);
                const price = formatJobPrice(job);
                const statusPill = getStatusPillColors(job.status);
                const dateDisplay = formatScheduledDateTime(job, todayDateOnly);
                const isUpdating = statusUpdatingJobId === job.id;
                const isStartConfirm = confirmStartJobId === job.id;
                const isCompleteConfirm = confirmCompleteJobId === job.id;

                return (
                  <article
                    key={job.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E0D8",
                      borderLeftWidth: "3px",
                      borderLeftColor: getStatusBorderColor(job.status),
                      borderRadius: "12px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="p-4">
                      {/* Header: Service · Property + Status pill */}
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <p className="text-base font-semibold leading-snug" style={{ color: "#0D1B2A" }}>
                          {formatRequestedServiceType(job.requestedServiceType)} · {job.property.name}
                        </p>
                        <span
                          className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ backgroundColor: statusPill.bg, color: statusPill.text }}
                        >
                          {formatStatusLabel(job.status)}
                        </span>
                      </div>

                      {/* Date/time + duration */}
                      <p className="mb-4 text-sm" style={{ color: "#7A7060" }}>
                        {dateDisplay}
                        {job.estimatedDurationMinutes ? ` · ${job.estimatedDurationMinutes} min` : ""}
                      </p>

                      {/* Price mini-card */}
                      <div
                        className="mb-4 rounded-lg p-3"
                        style={{ border: "1px solid #E5E0D8", backgroundColor: "#FAF7F2", borderRadius: "10px" }}
                      >
                        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#7A7060" }}>
                          Job Amount
                        </p>
                        <p
                          className="mt-1 font-semibold"
                          style={{ fontSize: "22px", lineHeight: "1.2", color: price.hasPrice ? "#0D1B2A" : "#D97706" }}
                        >
                          {price.display}
                        </p>
                      </div>

                      {/* Conflict warning */}
                      {conflict.type !== "none" ? (
                        <div
                          className="mb-4 rounded-lg px-3 py-2.5"
                          style={{
                            borderLeft: `3px solid ${conflict.type === "overlap" ? "#DC2626" : "#D97706"}`,
                            backgroundColor: conflict.type === "overlap" ? "#FEF2F2" : "#FFFBEB",
                          }}
                        >
                          <p
                            className="text-sm font-semibold"
                            style={{ color: conflict.type === "overlap" ? "#DC2626" : "#D97706" }}
                          >
                            {conflict.type === "overlap" ? "Schedule conflict" : "Same-day job"}
                          </p>
                          <p
                            className="mt-0.5 text-xs"
                            style={{ color: conflict.type === "overlap" ? "#991B1B" : "#92400E" }}
                          >
                            {conflict.type === "overlap"
                              ? "This overlaps with another job on your calendar."
                              : "You have another job scheduled this day."}
                          </p>
                          {conflict.conflictingJobs.length > 0 ? (
                            <p className="mt-1 text-xs" style={{ color: "#7A7060" }}>
                              {"Also scheduled: "}
                              {formatRequestedServiceType(conflict.conflictingJobs[0].requestedServiceType)}
                              {" · "}
                              {conflict.conflictingJobs[0].property.name}
                              {conflict.conflictingJobs.length > 1
                                ? ` (+${conflict.conflictingJobs.length - 1} more)`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Owner instructions preview */}
                      {job.ownerInstructions ? (
                        <p className="mb-3 text-sm" style={{ color: "#7A7060" }}>
                          <span className="font-medium" style={{ color: "#0D1B2A" }}>Instructions:</span>{" "}
                          {job.ownerInstructions.length > 120
                            ? `${job.ownerInstructions.slice(0, 120)}…`
                            : job.ownerInstructions}
                        </p>
                      ) : null}

                      {/* Access notes preview */}
                      {job.property.accessNotes ? (
                        <p className="mb-3 text-sm" style={{ color: "#7A7060" }}>
                          <span className="font-medium" style={{ color: "#0D1B2A" }}>Access:</span>{" "}
                          {job.property.accessNotes.length > 80
                            ? `${job.property.accessNotes.slice(0, 80)}…`
                            : job.property.accessNotes}
                        </p>
                      ) : null}

                      {/* Issue indicators */}
                      {activeIssueLabels.length > 0 ? (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {activeIssueLabels.map((label) => (
                            <span
                              key={label}
                              className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* Start confirmation modal */}
                      {isStartConfirm ? (
                        <div
                          className="mb-3 rounded-lg p-3"
                          style={{ border: "1px solid #FECACA", backgroundColor: "#FEF2F2" }}
                        >
                          <p className="text-sm font-semibold" style={{ color: "#DC2626" }}>
                            This job may conflict with another assignment.
                          </p>
                          <p className="mt-1 text-sm" style={{ color: "#7A7060" }}>
                            Do you still want to start this job?
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onStatusChange?.(job.id, "in_progress");
                                setConfirmStartJobId(null);
                              }}
                              disabled={isUpdating}
                              className="min-h-10 rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                              style={{ backgroundColor: "#DC2626" }}
                            >
                              {isUpdating ? "Starting..." : "Start Anyway"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmStartJobId(null)}
                              className="min-h-10 rounded-md border px-4 py-2 text-sm font-medium transition hover:opacity-75"
                              style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Complete confirmation */}
                      {isCompleteConfirm ? (
                        <div
                          className="mb-3 rounded-lg p-3"
                          style={{ border: "1px solid #D1FAE5", backgroundColor: "#F0FDF4" }}
                        >
                          <p className="text-sm font-semibold" style={{ color: "#0D1B2A" }}>
                            Mark this job complete?
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onStatusChange?.(job.id, "completed");
                                setConfirmCompleteJobId(null);
                              }}
                              disabled={isUpdating}
                              className="min-h-10 rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                              style={{ backgroundColor: "#1A6B60" }}
                            >
                              {isUpdating ? "Completing..." : "Complete Job"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCompleteJobId(null)}
                              className="min-h-10 rounded-md border px-4 py-2 text-sm font-medium transition hover:opacity-75"
                              style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {/* Action buttons (status-based) */}
                      {!isStartConfirm && !isCompleteConfirm ? (
                        <div className="flex flex-wrap gap-2">
                          {/* Pending acceptance */}
                          {job.status === "assigned" ? (
                            <>
                              {conflict.type !== "none" ? (
                                <p
                                  className="mb-1 w-full text-xs"
                                  style={{ color: conflict.type === "overlap" ? "#DC2626" : "#D97706" }}
                                >
                                  {conflict.type === "overlap"
                                    ? "⚠ This job overlaps another assignment."
                                    : "⚠ Check your schedule before accepting."}
                                </p>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => onStatusChange?.(job.id, "accepted")}
                                disabled={isUpdating}
                                className="min-h-11 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                style={{ backgroundColor: "#B8860B" }}
                              >
                                {isUpdating ? "Accepting..." : "Accept"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDetailsJobId(job.id)}
                                className="min-h-11 rounded-md border px-4 py-2.5 text-sm font-medium transition hover:opacity-75"
                                style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => onStatusChange?.(job.id, "declined")}
                                disabled={isUpdating}
                                className="min-h-11 rounded-md border px-4 py-2.5 text-sm font-medium transition hover:opacity-75 disabled:opacity-60"
                                style={{ borderColor: "#FECACA", color: "#DC2626" }}
                              >
                                Decline
                              </button>
                            </>
                          ) : null}

                          {/* Accepted + today = Start Job */}
                          {job.status === "accepted" && isDueToday ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (conflict.type === "overlap") {
                                    setConfirmStartJobId(job.id);
                                  } else {
                                    onStatusChange?.(job.id, "in_progress");
                                  }
                                }}
                                disabled={isUpdating}
                                className="min-h-11 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                style={{ backgroundColor: "#0D1B2A" }}
                              >
                                {isUpdating ? "Starting..." : "Start Job"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDetailsJobId(job.id)}
                                className="min-h-11 rounded-md border px-4 py-2.5 text-sm font-medium transition hover:opacity-75"
                                style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                              >
                                View Details
                              </button>
                            </>
                          ) : null}

                          {/* Accepted + not today = View only */}
                          {job.status === "accepted" && !isDueToday ? (
                            <button
                              type="button"
                              onClick={() => setSelectedDetailsJobId(job.id)}
                              className="min-h-11 rounded-md border px-4 py-2.5 text-sm font-medium transition hover:opacity-75"
                              style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                            >
                              View Details
                            </button>
                          ) : null}

                          {/* In progress = Complete Job */}
                          {job.status === "in_progress" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setConfirmCompleteJobId(job.id)}
                                disabled={isUpdating}
                                className="min-h-11 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                style={{ backgroundColor: "#1A6B60" }}
                              >
                                {isUpdating ? "Completing..." : "Complete Job"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDetailsJobId(job.id)}
                                className="min-h-11 rounded-md border px-4 py-2.5 text-sm font-medium transition hover:opacity-75"
                                style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                              >
                                View Details
                              </button>
                            </>
                          ) : null}

                          {/* Done/cancelled/declined = View only */}
                          {job.status === "completed" ||
                          job.status === "cancelled" ||
                          job.status === "declined" ? (
                            <button
                              type="button"
                              onClick={() => setSelectedDetailsJobId(job.id)}
                              className="min-h-11 rounded-md border px-4 py-2.5 text-sm font-medium transition hover:opacity-75"
                              style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                            >
                              View Details
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Expandable details */}
                      <details
                        className="mt-3 rounded-lg border"
                        style={{ borderColor: "#E5E0D8" }}
                      >
                        <summary
                          className="cursor-pointer px-3 py-2.5 text-sm font-medium"
                          style={{ color: "#7A7060" }}
                        >
                          More details
                        </summary>
                        <div
                          className="space-y-3 border-t px-3 pb-3 pt-3"
                          style={{ borderColor: "#E5E0D8" }}
                        >
                          {/* Property details */}
                          <div className="space-y-1 text-sm" style={{ color: "#7A7060" }}>
                            {job.property.address ? (
                              <p>
                                <span className="font-medium" style={{ color: "#0D1B2A" }}>Address:</span>{" "}
                                {job.property.address}
                              </p>
                            ) : null}
                            {job.calendarEvent ? (
                              <p>
                                <span className="font-medium" style={{ color: "#0D1B2A" }}>Stay:</span>{" "}
                                {formatDateLabel(job.calendarEvent.checkInDate)}{" "}
                                {"→"}{" "}
                                {formatDateLabel(job.calendarEvent.checkOutDate)} · {job.calendarEvent.nights} nights
                              </p>
                            ) : null}
                            {job.property.defaultCheckOutTime || job.property.defaultCheckInTime ? (
                              <p>
                                <span className="font-medium" style={{ color: "#0D1B2A" }}>Window:</span>{" "}
                                {job.property.defaultCheckOutTime || "-"} {"→"} {job.property.defaultCheckInTime || "-"}
                              </p>
                            ) : null}
                            {formatBedroomBathroom(job.property) ? (
                              <p>
                                <span className="font-medium" style={{ color: "#0D1B2A" }}>Layout:</span>{" "}
                                {formatBedroomBathroom(job.property)}
                              </p>
                            ) : null}
                            {job.property.parkingInfo ? (
                              <p>
                                <span className="font-medium" style={{ color: "#0D1B2A" }}>Parking:</span>{" "}
                                {job.property.parkingInfo}
                              </p>
                            ) : null}
                          </div>

                          {/* Notes */}
                          <section className="space-y-2 rounded-lg border p-3" style={{ borderColor: "#E5E0D8" }}>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-medium" style={{ color: "#0D1B2A" }}>Provider notes</h4>
                              {editingNotesJobId !== job.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNotesJobId(job.id);
                                    setDraftNotes(job.notes ?? "");
                                  }}
                                  disabled={notesUpdatingJobId === job.id}
                                  className="min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium transition hover:opacity-75 disabled:opacity-60"
                                  style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                                >
                                  Add note
                                </button>
                              ) : null}
                            </div>
                            {editingNotesJobId !== job.id ? (
                              job.notes ? (
                                <p className="text-sm" style={{ color: "#7A7060" }}>{job.notes}</p>
                              ) : (
                                <p className="text-sm" style={{ color: "#9CA3AF" }}>No notes added.</p>
                              )
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  value={draftNotes}
                                  onChange={(event) => setDraftNotes(event.target.value)}
                                  rows={3}
                                  disabled={notesUpdatingJobId === job.id}
                                  placeholder="Add a note for this job..."
                                  className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition disabled:opacity-60"
                                  style={{ borderColor: "#E5E0D8", color: "#0D1B2A" }}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const trimmed = draftNotes.trim();
                                      onNotesChange?.(job.id, trimmed.length === 0 ? null : trimmed);
                                      setEditingNotesJobId("");
                                    }}
                                    disabled={notesUpdatingJobId === job.id}
                                    className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                                    style={{ backgroundColor: "#0D1B2A" }}
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
                                    className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                                    style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            {notesUpdatingJobId === job.id ? (
                              <p className="text-xs" style={{ color: "#7A7060" }}>Saving notes...</p>
                            ) : null}
                          </section>

                          {/* Issue flags */}
                          <section className="space-y-2 rounded-lg border p-3" style={{ borderColor: "#E5E0D8" }}>
                            <h4 className="text-sm font-medium" style={{ color: "#0D1B2A" }}>Report issue</h4>
                            <div className="space-y-2 text-sm" style={{ color: "#7A7060" }}>
                              <label className="flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={job.maintenanceNeeded}
                                  onChange={(e) =>
                                    onIssueFlagsChange?.(job.id, { maintenanceNeeded: e.target.checked })
                                  }
                                  disabled={issueFlagsUpdatingJobId === job.id}
                                  className="h-4 w-4 rounded disabled:opacity-60"
                                />
                                Maintenance needed
                              </label>
                              <label className="flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={job.restockNeeded}
                                  onChange={(e) =>
                                    onIssueFlagsChange?.(job.id, { restockNeeded: e.target.checked })
                                  }
                                  disabled={issueFlagsUpdatingJobId === job.id}
                                  className="h-4 w-4 rounded disabled:opacity-60"
                                />
                                Restock needed
                              </label>
                              <label className="flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={job.damageFound}
                                  onChange={(e) =>
                                    onIssueFlagsChange?.(job.id, { damageFound: e.target.checked })
                                  }
                                  disabled={issueFlagsUpdatingJobId === job.id}
                                  className="h-4 w-4 rounded disabled:opacity-60"
                                />
                                Damage found
                              </label>
                            </div>
                            {issueFlagsUpdatingJobId === job.id ? (
                              <p className="text-xs" style={{ color: "#7A7060" }}>Updating...</p>
                            ) : null}
                          </section>

                          {/* Activity log */}
                          {(() => {
                            const activityItems = [
                              { label: "Accepted", value: job.acceptedAt },
                              { label: "Started", value: job.startedAt },
                              { label: "Completed", value: job.completedAt },
                              { label: "Cancelled", value: job.cancelledAt },
                            ].filter(
                              (item): item is { label: string; value: string } => Boolean(item.value)
                            );

                            return activityItems.length > 0 ? (
                              <section className="space-y-1 rounded-lg border p-3" style={{ borderColor: "#E5E0D8" }}>
                                <h4 className="text-sm font-medium" style={{ color: "#0D1B2A" }}>Activity</h4>
                                <div className="space-y-1 text-sm" style={{ color: "#7A7060" }}>
                                  {activityItems.map((item) => (
                                    <p key={item.label}>
                                      <span className="font-medium" style={{ color: "#0D1B2A" }}>{item.label}:</span>{" "}
                                      {formatActivityDateTimeLabel(item.value)}
                                    </p>
                                  ))}
                                </div>
                              </section>
                            ) : null;
                          })()}
                        </div>
                      </details>
                    </div>
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

