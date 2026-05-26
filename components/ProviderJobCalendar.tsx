"use client";

import { useMemo, useState } from "react";
import { type CleanerScheduleJob } from "@/components/CleanerSchedule";
import JobDetailsPanel from "@/components/JobDetailsPanel";

type ProviderJobCalendarProps = {
  jobs: CleanerScheduleJob[];
};

type CalendarView = "day" | "week" | "month";

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

const weekDayLongFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
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

function getRangeLabel(view: CalendarView, currentDate: Date): string {
  if (view === "day") {
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

  return (
    <article className={`rounded-lg border border-slate-200 bg-white ${compact ? "p-2" : "p-3"}`}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className={`font-semibold text-slate-900 ${compact ? "text-xs" : "text-sm"}`}>{job.title}</p>
        <span className={`rounded-full bg-slate-100 px-2 py-0.5 font-medium uppercase tracking-wide text-slate-700 ${compact ? "text-[10px]" : "text-xs"}`}>
          {formatStatusLabel(job.status)}
        </span>
      </div>

      <div className="mb-1 flex flex-wrap gap-1.5">
        <span className={`inline-flex rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800 ${compact ? "text-[10px]" : "text-xs"}`}>
          {compact ? formatRequestedServiceType(job.requestedServiceType) : formatRequestedServiceType(job.requestedServiceType)}
        </span>
        <span className={`inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700 ${compact ? "text-[10px]" : "text-xs"}`}>
          {formatSourcePlatformLabel(job.sourcePlatform)}
        </span>
        {isManualJob ? (
          <span className={`inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 ${compact ? "text-[10px]" : "text-xs"}`}>
            Manual job
          </span>
        ) : null}
        {job.ownerSelfAssigned ? (
          <span className={`inline-flex rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 ${compact ? "text-[10px]" : "text-xs"}`}>
            Owner assigned
          </span>
        ) : null}
        {(job.priority === "high" || job.priority === "urgent") ? (
          <span className={`inline-flex rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 ${compact ? "text-[10px]" : "text-xs"}`}>
            {formatPriority(job.priority)} priority
          </span>
        ) : null}
        {dueToday ? (
          <span className={`inline-flex rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 ${compact ? "text-[10px]" : "text-xs"}`}>
            Due today
          </span>
        ) : null}
      </div>

      <div className={`space-y-0.5 text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
        <p>
          <span className="font-medium text-slate-900">{job.property.name}</span>
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
          className={`rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-50 ${compact ? "text-[10px]" : "text-xs"}`}
        >
          Details
        </button>
      </div>

      {issueLabels.length > 0 ? (
        <div className="mt-2 space-y-1">
          <span className={`inline-flex rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 ${compact ? "text-[10px]" : "text-xs"}`}>
            Issues flagged
          </span>
          <div className="flex flex-wrap gap-1">
            {issueLabels.map((label) => (
              <span
                key={label}
                className={`rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700 ${compact ? "text-[10px]" : "text-xs"}`}
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

export default function ProviderJobCalendar({ jobs }: ProviderJobCalendarProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
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
    if (view === "day") {
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
    if (view === "day") {
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

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Job calendar</h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("day")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  view === "day" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setView("week")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  view === "week" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  view === "month" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Month
              </button>
            </div>

            <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
              <button
                type="button"
                onClick={navigatePrevious}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Today
              </button>
              <button
                type="button"
                onClick={navigateNext}
                className="rounded px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-700">{rangeLabel}</p>
      </header>

      {view === "day" ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{formatDateLabel(normalizedCurrentDate)}</h3>
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
              <p className="text-sm text-slate-600">No jobs scheduled for this day.</p>
            )}
          </div>
        </section>
      ) : null}

      {view === "week" ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[920px] grid-cols-7 gap-3">
            {weekDates.map((date) => {
              const dayJobs = getJobsForDate(date);
              return (
                <section key={toDateOnly(date)} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-sm font-semibold text-slate-900">{weekDayLongFormatter.format(date)}</h3>
                  <p className="mb-2 text-xs text-slate-600">{formatDateLabel(date)}</p>

                  <div className="space-y-2">
                    {dayJobs.length > 0 ? (
                      dayJobs.map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          compact
                          onDetails={() => setSelectedDetailsJobId(job.id)}
                          todayDateOnly={todayDateOnly}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No jobs</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[960px] space-y-2">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, index) => (
                <p
                  key={index}
                  className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  {weekDayShortFormatter.format(addDays(startOfWeek(normalizedCurrentDate), index))}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthGridDates.map((date) => {
                const dayJobs = getJobsForDate(date);
                const inCurrentMonth = date.getUTCMonth() === currentMonth;

                return (
                  <section
                    key={toDateOnly(date)}
                    className={`min-h-36 rounded-lg border p-2 ${
                      inCurrentMonth
                        ? "border-slate-200 bg-slate-50"
                        : "border-slate-100 bg-slate-100/70"
                    }`}
                  >
                    <p
                      className={`mb-2 text-xs font-semibold ${
                        inCurrentMonth ? "text-slate-800" : "text-slate-500"
                      }`}
                    >
                      {date.getUTCDate()}
                    </p>

                    <div className="space-y-1.5">
                      {dayJobs.length > 0 ? (
                        dayJobs.map((job) => (
                          <JobCard
                            key={job.id}
                            job={job}
                            compact
                            onDetails={() => setSelectedDetailsJobId(job.id)}
                            todayDateOnly={todayDateOnly}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No jobs</p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
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
