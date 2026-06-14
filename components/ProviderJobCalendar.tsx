"use client";

import { useMemo, useState } from "react";
import { type CleanerScheduleJob } from "@/components/CleanerSchedule";
import JobDetailsPanel from "@/components/JobDetailsPanel";

type ProviderJobCalendarProps = {
  jobs: CleanerScheduleJob[];
};

type CalendarView = "today" | "week" | "month";

const displayDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const weekDayShortFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function dateFromDateOnly(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

function toUtcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

export function toDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }

    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(
      parsed.getUTCDate()
    ).padStart(2, "0")}`;
  }

  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}

export function formatDateLabel(value: string | Date): string {
  const normalized = typeof value === "string" ? dateFromDateOnly(toDateOnly(value)) : dateFromDateOnly(toDateOnly(value));
  return displayDateFormatter.format(normalized);
}

export function startOfWeek(date: Date): Date {
  const utcDate = dateFromDateOnly(toDateOnly(date));
  const dayOfWeek = utcDate.getUTCDay();
  return addDays(utcDate, -dayOfWeek);
}

export function addDays(date: Date, days: number): Date {
  const utcDate = dateFromDateOnly(toDateOnly(date));
  return toUtcDate(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate() + days
  );
}

export function addMonths(date: Date, months: number): Date {
  const utcDate = dateFromDateOnly(toDateOnly(date));
  return toUtcDate(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + months, utcDate.getUTCDate());
}

export function getMonthGridDates(date: Date): Date[] {
  const normalized = dateFromDateOnly(toDateOnly(date));
  const monthStart = toUtcDate(normalized.getUTCFullYear(), normalized.getUTCMonth(), 1);
  const monthEnd = toUtcDate(normalized.getUTCFullYear(), normalized.getUTCMonth() + 1, 0);

  const gridStart = addDays(monthStart, -monthStart.getUTCDay());
  const trailingDays = 6 - monthEnd.getUTCDay();
  const gridEnd = addDays(monthEnd, trailingDays);

  const dates: Date[] = [];
  for (let cursor = gridStart; toDateOnly(cursor) <= toDateOnly(gridEnd); cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }

  return dates;
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

function getRangeLabel(view: CalendarView, currentDate: Date): string {
  if (view === "today") {
    return formatDateLabel(currentDate);
  }

  if (view === "month") {
    return monthYearFormatter.format(dateFromDateOnly(toDateOnly(currentDate)));
  }

  const start = startOfWeek(currentDate);
  const end = addDays(start, 6);

  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(start);
    return `${month} ${start.getUTCDate()}-${end.getUTCDate()}, ${startYear}`;
  }

  if (startYear === endYear) {
    const startPart = monthDayFormatter.format(start);
    const endPart = monthDayFormatter.format(end);
    return `${startPart}-${endPart}, ${startYear}`;
  }

  const startPart = displayDateFormatter.format(start);
  const endPart = displayDateFormatter.format(end);
  return `${startPart}-${endPart}`;
}

function getIssueLabels(job: CleanerScheduleJob): string[] {
  const labels: string[] = [];

  if (job.maintenanceNeeded) {
    labels.push("Maintenance");
  }

  if (job.restockNeeded) {
    labels.push("Restock");
  }

  if (job.damageFound) {
    labels.push("Damage");
  }

  return labels;
}

function formatBedroomBathroom(job: CleanerScheduleJob): string {
  const bedroomsLabel = job.property.bedrooms !== null ? `${job.property.bedrooms} bd` : "";
  const bathroomsLabel = job.property.bathrooms !== null ? `${job.property.bathrooms} ba` : "";
  return [bedroomsLabel, bathroomsLabel].filter((value) => value.length > 0).join(" / ");
}

function JobCard({
  job,
  compact = false,
  onDetails,
  todayDateOnly,
}: {
  job: CleanerScheduleJob;
  compact?: boolean;
  onDetails: () => void;
  todayDateOnly: string;
}) {
  const issueLabels = getIssueLabels(job);
  const dueToday = toDateOnly(job.scheduledDate) === todayDateOnly;
  const isManualJob = job.jobSource === "manual";
  const statusColor = getStatusBadgeColor(job.status);
  const leftBorderColor = getStatusLeftBorderColor(job.status);

  return (
    <article className={`rounded-[12px] border-l-4 border border-[#E5E0D8] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] ${leftBorderColor} ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className={`font-semibold text-[#0D1B2A] ${compact ? "text-xs" : "text-sm"}`}>{job.title}</p>
        <span className={`rounded-full ${statusColor.bg} ${statusColor.text} px-2.5 py-1 font-medium text-xs`}>
          {formatStatusLabel(job.status)}
        </span>
      </div>

      <div className="mb-1 flex flex-wrap gap-1.5">
        <span className={`inline-flex rounded-full bg-[#B8860B]/10 px-2 py-0.5 font-medium text-[#B8860B] ${compact ? "text-[10px]" : "text-xs"}`}>
          {compact ? formatRequestedServiceType(job.requestedServiceType) : formatRequestedServiceType(job.requestedServiceType)}
        </span>
        <span className={`inline-flex rounded-full bg-[#7A7060]/10 px-2 py-0.5 font-medium text-[#7A7060] ${compact ? "text-[10px]" : "text-xs"}`}>
          {formatSourcePlatformLabel(job.sourcePlatform)}
        </span>
        {isManualJob ? (
          <span className={`inline-flex rounded-full bg-[#1A6B60]/10 px-2 py-0.5 font-medium text-[#1A6B60] ${compact ? "text-[10px]" : "text-xs"}`}>
            Manual job
          </span>
        ) : null}
        {job.ownerSelfAssigned ? (
          <span className={`inline-flex rounded-full bg-[#1A6B60]/10 px-2 py-0.5 font-medium text-[#1A6B60] ${compact ? "text-[10px]" : "text-xs"}`}>
            Owner assigned
          </span>
        ) : null}
        {(job.priority === "high" || job.priority === "urgent") ? (
          <span className={`inline-flex rounded-full bg-[#D97706]/10 px-2 py-0.5 font-medium text-[#D97706] ${compact ? "text-[10px]" : "text-xs"}`}>
            {formatPriority(job.priority)} priority
          </span>
        ) : null}
        {dueToday ? (
          <span className={`inline-flex rounded-full bg-[#D97706]/10 px-2 py-0.5 font-medium text-[#D97706] ${compact ? "text-[10px]" : "text-xs"}`}>
            Due today
          </span>
        ) : null}
      </div>

      <div className={`space-y-0.5 text-[#7A7060] ${compact ? "text-xs" : "text-sm"}`}>
        <p>
          <span className="font-medium text-[#0D1B2A]">{job.property.name}</span>
        </p>
        {!compact ? <p>{formatDateLabel(job.scheduledDate)}</p> : null}
        <p>Service: {formatRequestedServiceType(job.requestedServiceType)}</p>
        <p>Priority: {formatPriority(job.priority)}</p>
        {job.dueTime ? <p>Due time: {job.dueTime}</p> : null}
        {job.estimatedDurationMinutes !== null ? <p>Duration: {job.estimatedDurationMinutes} min</p> : null}
        {job.ownerInstructions ? <p>Owner instructions available</p> : null}
        {formatBedroomBathroom(job) ? <p>{formatBedroomBathroom(job)}</p> : null}
        {job.property.floorNumber || job.property.parkingInfo || job.property.hasElevator ? (
          <p>
            {[job.property.floorNumber ? `Floor ${job.property.floorNumber}` : "", job.property.hasElevator ? "Elevator" : "", job.property.parkingInfo ? "Parking" : ""]
              .filter((value) => value.length > 0)
              .join(" • ")}
          </p>
        ) : null}
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={onDetails}
          className={`min-h-10 rounded-md border border-[#E5E0D8] bg-white px-3 py-2 font-medium text-[#7A7060] transition hover:bg-[#FAF7F2] hover:text-[#0D1B2A] ${compact ? "text-xs" : "text-sm"}`}
        >
          View details
        </button>
      </div>

      {issueLabels.length > 0 ? (
        <div className="mt-2 space-y-1">
          <span className={`inline-flex rounded-full bg-[#D97706]/10 px-2 py-0.5 font-medium text-[#D97706] ${compact ? "text-[10px]" : "text-xs"}`}>
            Issues flagged
          </span>
          <div className="flex flex-wrap gap-1">
            {issueLabels.map((label) => (
              <span
                key={label}
                className={`rounded-full bg-[#E5E0D8] px-2 py-0.5 font-medium text-[#7A7060] ${compact ? "text-[10px]" : "text-xs"}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function getStatusLeftBorderColor(status: string): string {
  // Teal for assigned/accepted/completed/synced
  if (["assigned", "accepted", "completed", "synced"].includes(status)) {
    return "border-l-[#1A6B60]";
  }
  // Amber for unassigned/needs assignment/pending
  if (["unassigned", "needs_assignment", "pending_acceptance"].includes(status)) {
    return "border-l-[#D97706]";
  }
  // Red for error/canceled/issue states
  if (["cancelled", "issue_reported", "declined"].includes(status)) {
    return "border-l-[#EF4444]";
  }
  return "border-l-[#D97706]"; // Default to amber
}

function getStatusBadgeColor(status: string): { bg: string; text: string } {
  if (["needs_assignment", "unassigned", "pending_acceptance"].includes(status)) {
    return { bg: "bg-[#D97706]", text: "text-white" };
  }
  if (["assigned", "accepted", "in_progress"].includes(status)) {
    return { bg: "bg-[#1A6B60]", text: "text-white" };
  }
  if (["completed", "synced"].includes(status)) {
    return { bg: "bg-[#1A6B60]", text: "text-white" };
  }
  if (["cancelled", "declined", "issue_reported"].includes(status)) {
    return { bg: "bg-[#EF4444]", text: "text-white" };
  }
  return { bg: "bg-[#7A7060]", text: "text-white" };
}

export default function ProviderJobCalendar({ jobs }: ProviderJobCalendarProps) {
  const [view, setView] = useState<CalendarView>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "today" : "week"
  );
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateOnly, setSelectedDateOnly] = useState(toDateOnly(new Date()));
  const [selectedDetailsJobId, setSelectedDetailsJobId] = useState<string | null>(null);

  const jobsByDate = useMemo(() => {
    return jobs.reduce<Record<string, CleanerScheduleJob[]>>((accumulator, job) => {
      const dateKey = toDateOnly(job.scheduledDate);
      if (!accumulator[dateKey]) {
        accumulator[dateKey] = [];
      }
      accumulator[dateKey].push(job);
      return accumulator;
    }, {});
  }, [jobs]);

  function getJobsForDate(date: Date): CleanerScheduleJob[] {
    return jobsByDate[toDateOnly(date)] ?? [];
  }

  function navigatePrevious() {
    if (view === "today") {
      setCurrentDate((previous) => addDays(previous, -1));
      return;
    }

    if (view === "week") {
      setCurrentDate((previous) => addDays(previous, -7));
      return;
    }

    setCurrentDate((previous) => addMonths(previous, -1));
  }

  function navigateNext() {
    if (view === "today") {
      setCurrentDate((previous) => addDays(previous, 1));
      return;
    }

    if (view === "week") {
      setCurrentDate((previous) => addDays(previous, 7));
      return;
    }

    setCurrentDate((previous) => addMonths(previous, 1));
  }

  const normalizedCurrentDate = dateFromDateOnly(toDateOnly(currentDate));
  const rangeLabel = getRangeLabel(view, normalizedCurrentDate);

  const weekDates = useMemo(() => {
    const start = startOfWeek(normalizedCurrentDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [normalizedCurrentDate]);

  const monthGridDates = useMemo(() => getMonthGridDates(normalizedCurrentDate), [normalizedCurrentDate]);
  const currentMonth = normalizedCurrentDate.getUTCMonth();
  const todayDateOnly = toDateOnly(new Date());
  const selectedDetailsJob =
    selectedDetailsJobId ? jobs.find((job) => job.id === selectedDetailsJobId) ?? null : null;
  const selectedDayJobs = getJobsForDate(dateFromDateOnly(selectedDateOnly));

  return (
    <section className="space-y-4 rounded-[12px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[#0D1B2A]">Calendar</h2>
            <p className="text-sm text-[#7A7060]">Turnovers, cleanings, and scheduled work</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap rounded-full border border-[#E5E0D8] bg-[#FAF7F2] p-1">
              <button
                type="button"
                onClick={() => {
                  setView("today");
                  setSelectedDateOnly(toDateOnly(currentDate));
                }}
                className={`min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  view === "today" ? "bg-[#0D1B2A] text-[#FAF7F2]" : "text-[#7A7060] hover:text-[#0D1B2A]"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setView("week")}
                className={`min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  view === "week" ? "bg-[#0D1B2A] text-[#FAF7F2]" : "text-[#7A7060] hover:text-[#0D1B2A]"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={`min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  view === "month" ? "bg-[#0D1B2A] text-[#FAF7F2]" : "text-[#7A7060] hover:text-[#0D1B2A]"
                }`}
              >
                Month
              </button>
            </div>

            <div className="flex flex-wrap rounded-full border border-[#E5E0D8] bg-white p-1">
              <button
                type="button"
                onClick={navigatePrevious}
                className="min-h-9 rounded-full px-3 py-1.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="min-h-9 rounded-full px-3 py-1.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={navigateNext}
                className="min-h-9 rounded-full px-3 py-1.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-[#0D1B2A]">{rangeLabel}</p>
      </header>

      {view === "today" ? (
        <section className="rounded-[12px] border border-[#E5E0D8] bg-white p-3">
          <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">{formatDateLabel(normalizedCurrentDate)}</h3>
          <div className="space-y-2">
            {getJobsForDate(normalizedCurrentDate).length > 0 ? (
              getJobsForDate(normalizedCurrentDate).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDetails={() => setSelectedDetailsJobId(job.id)}
                  todayDateOnly={todayDateOnly}
                />
              ))
            ) : (
              <div className="rounded-[12px] border-2 border-dashed border-[#E5E0D8] bg-white p-6 text-center">
                <p className="text-sm font-medium text-[#0D1B2A]">No jobs scheduled</p>
                <p className="mt-1 text-sm text-[#7A7060]">This day is clear. New turnovers and assigned work will appear here.</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {view === "week" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const dayJobs = getJobsForDate(date);
              const dateOnly = toDateOnly(date);
              const isSelected = selectedDateOnly === dateOnly;
              return (
                <button
                  key={dateOnly}
                  type="button"
                  onClick={() => setSelectedDateOnly(dateOnly)}
                  className={`min-h-20 rounded-[12px] border p-3 text-left transition ${
                    isSelected
                      ? "border-[#0D1B2A] bg-[#0D1B2A]/5"
                      : "border-[#E5E0D8] bg-white hover:bg-[#FAF7F2]"
                  }`}
                >
                  <p className="text-xs font-semibold text-[#7A7060]">{weekDayShortFormatter.format(date)}</p>
                  <p className="text-base font-semibold text-[#0D1B2A]">{date.getUTCDate()}</p>
                  <div className="mt-1 flex items-center gap-1">
                    {dayJobs.length > 0 ? (
                      <span className="rounded-full bg-[#0D1B2A] px-2 py-0.5 text-xs font-semibold text-white">
                        {dayJobs.length}
                      </span>
                    ) : (
                      <span className="text-xs text-[#B8860B]">No jobs</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <section className="rounded-[12px] border border-[#E5E0D8] bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-[#0D1B2A]">
              {formatDateLabel(`${selectedDateOnly}T00:00:00.000Z`)}
            </h3>
            {selectedDayJobs.length > 0 ? (
              <div className="space-y-2">
                {selectedDayJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDetails={() => setSelectedDetailsJobId(job.id)}
                    todayDateOnly={todayDateOnly}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[12px] border-2 border-dashed border-[#E5E0D8] bg-white p-6 text-center">
                <p className="text-sm font-medium text-[#0D1B2A]">No jobs scheduled</p>
                <p className="mt-1 text-sm text-[#7A7060]">This day is clear. New turnovers and assigned work will appear here.</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, index) => (
                <p
                  key={index}
                  className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wide text-[#7A7060]"
                >
                  {weekDayShortFormatter.format(addDays(startOfWeek(normalizedCurrentDate), index))}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthGridDates.map((date) => {
                const dayJobs = getJobsForDate(date);
                const inCurrentMonth = date.getUTCMonth() === currentMonth;
                const dateOnly = toDateOnly(date);
                const isSelected = selectedDateOnly === dateOnly;

                return (
                  <button
                    key={dateOnly}
                    type="button"
                    onClick={() => setSelectedDateOnly(dateOnly)}
                    className={`min-h-24 rounded-[12px] border p-3 text-left transition ${
                      isSelected
                        ? "border-[#0D1B2A] bg-[#0D1B2A]/5"
                        : inCurrentMonth
                        ? "border-[#E5E0D8] bg-white hover:bg-[#FAF7F2]"
                        : "border-[#E5E0D8] bg-[#FAF7F2]/50"
                    }`}
                  >
                    <p
                      className={`mb-2 text-sm font-semibold ${
                        inCurrentMonth ? "text-[#0D1B2A]" : "text-[#B8860B]"
                      }`}
                    >
                      {date.getUTCDate()}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {dayJobs.length > 0 ? (
                        <>
                          {dayJobs.slice(0, 3).map((job) => (
                            <span key={job.id} className="h-2 w-2 rounded-full bg-[#0D1B2A]" />
                          ))}
                          {dayJobs.length > 3 ? (
                            <span className="text-xs font-medium text-[#7A7060]">+{dayJobs.length - 3}</span>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-xs text-[#B8860B]">No jobs</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <section className="rounded-[12px] border border-[#E5E0D8] bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-[#0D1B2A]">
              {formatDateLabel(`${selectedDateOnly}T00:00:00.000Z`)}
            </h3>
            {selectedDayJobs.length > 0 ? (
              <div className="space-y-2">
                {selectedDayJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDetails={() => setSelectedDetailsJobId(job.id)}
                    todayDateOnly={todayDateOnly}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[12px] border-2 border-dashed border-[#E5E0D8] bg-white p-6 text-center">
                <p className="text-sm font-medium text-[#0D1B2A]">No jobs scheduled</p>
                <p className="mt-1 text-sm text-[#7A7060]">This day is clear. New turnovers and assigned work will appear here.</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {selectedDetailsJob ? (
        <JobDetailsPanel
          job={selectedDetailsJob}
          onClose={() => setSelectedDetailsJobId(null)}
        />
      ) : null}
    </section>
  );
}
