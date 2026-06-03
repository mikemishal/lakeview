import { type CleanerScheduleJob } from "@/components/CleanerSchedule";
import { getBrowserTimeZone } from "@/lib/date/dateUtils";

type JobDetailsPanelProps = {
  job: CleanerScheduleJob;
  onClose: () => void;
};

function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatDateTimeLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: getBrowserTimeZone(),
  }).format(parsed);
}

function formatDateRange(checkInDate: string, checkOutDate: string): string {
  return `${formatDateLabel(checkInDate)} -> ${formatDateLabel(checkOutDate)}`;
}

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

function formatPropertyStats(job: CleanerScheduleJob): string {
  const bedroomsLabel = job.property.bedrooms !== null ? `${job.property.bedrooms} bed` : "";
  const bathroomsLabel = job.property.bathrooms !== null ? `${job.property.bathrooms} bath` : "";
  return [bedroomsLabel, bathroomsLabel].filter((value) => value.length > 0).join(" · ");
}

export default function JobDetailsPanel({ job, onClose }: JobDetailsPanelProps) {
  const issueLabels: string[] = [];
  if (job.maintenanceNeeded) {
    issueLabels.push("Maintenance");
  }
  if (job.restockNeeded) {
    issueLabels.push("Restock");
  }
  if (job.damageFound) {
    issueLabels.push("Damage");
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {formatStatusLabel(job.status)}
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              {formatRequestedServiceType(job.requestedServiceType)}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {formatSourcePlatformLabel(job.sourcePlatform)}
            </span>
            {job.jobSource === "manual" ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Manual job
              </span>
            ) : null}
            {job.ownerSelfAssigned ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Self-assigned by owner
              </span>
            ) : null}
            {(job.priority === "high" || job.priority === "urgent") ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {formatPriority(job.priority)} priority
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-slate-700">Scheduled: {formatDateLabel(job.scheduledDate)}</p>
        {issueLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {issueLabels.map((label) => (
              <span key={label} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section className="space-y-1 text-sm text-slate-700">
        <h4 className="text-sm font-semibold text-slate-900">Job details</h4>
        <p>Job source: {job.jobSource === "manual" ? "Manual" : "Calendar sync"}</p>
        <p>Service type: {formatRequestedServiceType(job.requestedServiceType)}</p>
        <p>Priority: {formatPriority(job.priority)}</p>
        {job.dueTime ? <p>Due time: {job.dueTime}</p> : null}
        {job.estimatedDurationMinutes !== null ? <p>Estimated duration: {job.estimatedDurationMinutes} minutes</p> : null}
        {job.ownerInstructions ? <p>Owner instructions: {job.ownerInstructions}</p> : null}
        {job.calendarEvent ? (
          <>
            <h4 className="text-sm font-semibold text-slate-900">Stay details</h4>
            <p>Stay: {formatDateRange(job.calendarEvent.checkInDate, job.calendarEvent.checkOutDate)}</p>
            <p>Check-in: {formatDateLabel(job.calendarEvent.checkInDate)}</p>
            <p>Check-out: {formatDateLabel(job.calendarEvent.checkOutDate)}</p>
            <p>Nights: {job.calendarEvent.nights}</p>
            <p>Summary: {job.calendarEvent.summary}</p>
            <p>Source: {formatSourcePlatformLabel(job.calendarEvent.source)}</p>
          </>
        ) : (
          <>
            <h4 className="text-sm font-semibold text-slate-900">Manual job</h4>
            <p>Scheduled date: {formatDateLabel(job.scheduledDate)}</p>
            {job.dueTime ? <p>Due time: {job.dueTime}</p> : null}
          </>
        )}
      </section>

      <section className="space-y-1 text-sm text-slate-700">
        <h4 className="text-sm font-semibold text-slate-900">Property details</h4>
        <p>{job.property.name}</p>
        {job.property.address ? <p>{job.property.address}</p> : null}
        {job.property.listingUrl ? (
          <p>
            <a href={job.property.listingUrl} target="_blank" rel="noreferrer" className="text-sky-700 underline">
              Open listing
            </a>
          </p>
        ) : null}
        {job.property.propertyType ? <p>Type: {job.property.propertyType}</p> : null}
        {formatPropertyStats(job) ? <p>{formatPropertyStats(job)}</p> : null}
        {job.property.squareFeet !== null ? <p>Square feet: {job.property.squareFeet}</p> : null}
        {job.property.maxGuests !== null ? <p>Max guests: {job.property.maxGuests}</p> : null}
        {job.property.floorNumber ? <p>Floor: {job.property.floorNumber}</p> : null}
        <p>{job.property.hasElevator ? "Elevator available" : "No elevator"}</p>
        {job.property.parkingInfo ? <p>Parking: {job.property.parkingInfo}</p> : null}
      </section>

      {(job.property.defaultCheckOutTime || job.property.defaultCheckInTime) ? (
        <section className="space-y-1 text-sm text-slate-700">
          <h4 className="text-sm font-semibold text-slate-900">Cleaning window</h4>
          <p>
            Checkout {job.property.defaultCheckOutTime || "-"}{" -> "}Check-in {job.property.defaultCheckInTime || "-"}
          </p>
        </section>
      ) : null}

      <section className="space-y-1 text-sm text-slate-700">
        <h4 className="text-sm font-semibold text-slate-900">Provider instructions</h4>
        {job.property.accessNotes ? <p>Access: {job.property.accessNotes}</p> : null}
        {job.property.supplyLocation ? <p>Supplies: {job.property.supplyLocation}</p> : null}
        {job.property.laundryLocation ? <p>Laundry: {job.property.laundryLocation}</p> : null}
        {job.property.trashInstructions ? <p>Trash: {job.property.trashInstructions}</p> : null}
        {job.property.petInfo ? <p>Pets: {job.property.petInfo}</p> : null}
        {job.property.cleaningNotes ? <p>Cleaning notes: {job.property.cleaningNotes}</p> : null}
        {job.property.providerInstructions ? <p>Provider notes: {job.property.providerInstructions}</p> : null}
        {!job.property.accessNotes && !job.property.supplyLocation && !job.property.laundryLocation && !job.property.trashInstructions && !job.property.petInfo && !job.property.cleaningNotes && !job.property.providerInstructions ? (
          <p>No additional instructions available.</p>
        ) : null}
      </section>

      <section className="space-y-1 text-sm text-slate-700">
        <h4 className="text-sm font-semibold text-slate-900">Job notes and activity</h4>
        {job.notes ? <p>Notes: {job.notes}</p> : <p>No notes added.</p>}
        {job.acceptedAt ? <p>Accepted: {formatDateTimeLabel(job.acceptedAt)}</p> : null}
        {job.startedAt ? <p>Started: {formatDateTimeLabel(job.startedAt)}</p> : null}
        {job.completedAt ? <p>Completed: {formatDateTimeLabel(job.completedAt)}</p> : null}
        {job.cancelledAt ? <p>Cancelled: {formatDateTimeLabel(job.cancelledAt)}</p> : null}
      </section>

      <footer>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Close
        </button>
      </footer>
    </section>
  );
}