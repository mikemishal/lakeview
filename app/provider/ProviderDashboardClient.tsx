"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CleanerSchedule, { type CleanerScheduleJob } from "@/components/CleanerSchedule";
import ProviderJobCalendar from "@/components/ProviderJobCalendar";
import NotificationPanel, { type AppNotification } from "@/components/NotificationPanel";

type ServiceProvider = {
  id: string;
  name: string;
  companyName: string | null;
  serviceType: string;
  active: boolean;
};

type ServiceProvidersResponse = {
  serviceProviders: ServiceProvider[];
};

type ProviderCleaningJobsResponse = {
  cleaningJobs: CleanerScheduleJob[];
};

type NotificationsResponse = {
  notifications: AppNotification[];
};

type UpdateStatusResponse = {
  cleaningJob: CleanerScheduleJob;
};

type UpdateNotesResponse = {
  cleaningJob: CleanerScheduleJob;
};

type UpdateIssueFlagsResponse = {
  cleaningJob: CleanerScheduleJob;
};

type FocusedCleaningJobResponse = {
  cleaningJob: CleanerScheduleJob;
};

type ApiError = {
  error: string;
};

type ProviderActionQueue =
  | "none"
  | "notification_job"
  | "pending_accept"
  | "due_today"
  | "accepted"
  | "in_progress"
  | "future"
  | "completed_past"
  | "not_completed_past"
  | "issues"
  | "maintenance"
  | "restock"
  | "damage";

type ProviderDashboardTab = "overview" | "queue" | "calendar" | "list";

function toDateOnly(value: string | Date): string {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(
      parsed.getUTCDate()
    ).padStart(2, "0")}`;
  }

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const base = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    return dateOnly;
  }

  base.setUTCDate(base.getUTCDate() + days);
  return toDateOnly(base);
}

const POLLING_INTERVAL_MS = 10_000;

export default function ProviderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cleaners, setCleaners] = useState<ServiceProvider[]>([]);
  const [loadingCleaners, setLoadingCleaners] = useState(true);
  const [cleanersError, setCleanersError] = useState("");

  const [selectedCleanerId, setSelectedCleanerId] = useState("");
  const [cleanerScheduleJobs, setCleanerScheduleJobs] = useState<CleanerScheduleJob[]>([]);
  const [providerSummaryRange, setProviderSummaryRange] = useState<7 | 30 | 90>(7);
  const [providerActiveQueue, setProviderActiveQueue] = useState<ProviderActionQueue>("none");
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const [updatingStatusJobId, setUpdatingStatusJobId] = useState("");
  const [updatingNotesJobId, setUpdatingNotesJobId] = useState("");
  const [updatingIssueFlagsJobId, setUpdatingIssueFlagsJobId] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [providerIssueFlagsError, setProviderIssueFlagsError] = useState("");
  const [providerNotifications, setProviderNotifications] = useState<AppNotification[]>([]);
  const [loadingProviderNotifications, setLoadingProviderNotifications] = useState(false);
  const [providerNotificationsError, setProviderNotificationsError] = useState("");
  const [focusedNotificationJob, setFocusedNotificationJob] =
    useState<CleanerScheduleJob | null>(null);
  const [loadingFocusedNotificationJob, setLoadingFocusedNotificationJob] = useState(false);
  const [focusedNotificationJobError, setFocusedNotificationJobError] = useState("");
  const providerQueueSectionRef = useRef<HTMLElement | null>(null);
  const providerRefreshInFlightRef = useRef(false);

  function isValidProviderTab(value: string | null): value is ProviderDashboardTab {
    return value === "overview" || value === "queue" || value === "calendar" || value === "list";
  }

  const providerTabParam = searchParams.get("tab");
  const providerActiveTab: ProviderDashboardTab = isValidProviderTab(providerTabParam)
    ? providerTabParam
    : "overview";

  const updateProviderTab = useCallback(
    (nextTab: ProviderDashboardTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);

      const queryString = params.toString();
      router.replace(queryString ? `/provider?${queryString}` : "/provider", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    let isActive = true;

    async function loadCleaners() {
      setLoadingCleaners(true);
      setCleanersError("");

      try {
        const response = await fetch("/api/service-providers?serviceType=cleaner");
        const data = (await response.json()) as ServiceProvidersResponse | ApiError;

        if (!response.ok) {
          if (isActive) {
            setCleanersError((data as ApiError).error || "Failed to load cleaners.");
          }
          return;
        }

        if (isActive) {
          const loaded = (data as ServiceProvidersResponse).serviceProviders;
          setCleaners(loaded.filter((provider) => provider.active));
        }
      } catch {
        if (isActive) {
          setCleanersError("Failed to load cleaners.");
        }
      } finally {
        if (isActive) {
          setLoadingCleaners(false);
        }
      }
    }

    void loadCleaners();

    return () => {
      isActive = false;
    };
  }, []);

  const loadProviderNotifications = useCallback(
    async (providerId: string, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!providerId) {
        setProviderNotifications([]);
        setProviderNotificationsError("");
        if (!silent) {
          setLoadingProviderNotifications(false);
        }
        return;
      }

      if (!silent) {
        setLoadingProviderNotifications(true);
        setProviderNotificationsError("");
      }

      try {
        const response = await fetch(
          `/api/notifications?audienceType=provider&providerId=${providerId}&unreadOnly=true`
        );
        const data = (await response.json()) as NotificationsResponse | ApiError;

        if (!response.ok) {
          const message = (data as ApiError).error || "Failed to load notifications.";
          if (silent) {
            console.error(message);
          } else {
            setProviderNotificationsError(message);
          }
          return;
        }

        setProviderNotifications((data as NotificationsResponse).notifications);
      } catch {
        if (silent) {
          console.error("Failed to load notifications.");
        } else {
          setProviderNotificationsError("Failed to load notifications.");
        }
      } finally {
        if (!silent) {
          setLoadingProviderNotifications(false);
        }
      }
    },
    []
  );

  const loadProviderSchedule = useCallback(
    async (providerId: string, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!providerId) {
        return;
      }

      if (!silent) {
        setLoadingSchedule(true);
        setScheduleError("");
      }

      try {
        const response = await fetch(`/api/service-providers/${providerId}/cleaning-jobs`);
        const data = (await response.json()) as ProviderCleaningJobsResponse | ApiError;

        if (!response.ok) {
          const message = (data as ApiError).error || "Failed to load cleaner schedule.";
          if (silent) {
            console.error(message);
          } else {
            setScheduleError(message);
          }
          return;
        }

        setCleanerScheduleJobs((data as ProviderCleaningJobsResponse).cleaningJobs);
      } catch {
        if (silent) {
          console.error("Failed to load cleaner schedule.");
        } else {
          setScheduleError("Failed to load cleaner schedule.");
        }
      } finally {
        if (!silent) {
          setLoadingSchedule(false);
        }
      }
    },
    []
  );

  async function handleLoadSchedule(providerId: string) {
    setSelectedCleanerId(providerId);
    setCleanerScheduleJobs([]);
    setProviderActiveQueue("none");
    setFocusedNotificationJob(null);
    setLoadingFocusedNotificationJob(false);
    setFocusedNotificationJobError("");
    setScheduleError("");
    setUpdateError("");
    setProviderIssueFlagsError("");

    if (!providerId) {
      await loadProviderNotifications("");
      setLoadingSchedule(false);
      return;
    }

    await loadProviderSchedule(providerId);
    await loadProviderNotifications(providerId);
  }

  const refreshProviderDashboardData = useCallback(async () => {
    if (!selectedCleanerId || providerRefreshInFlightRef.current) {
      return;
    }

    providerRefreshInFlightRef.current = true;

    try {
      await Promise.all([
        loadProviderNotifications(selectedCleanerId, { silent: true }),
        loadProviderSchedule(selectedCleanerId, { silent: true }),
      ]);

      if (focusedNotificationJob?.id) {
        try {
          const response = await fetch(`/api/cleaning-jobs/${focusedNotificationJob.id}`);
          const data = (await response.json()) as FocusedCleaningJobResponse | ApiError;

          if (!response.ok) {
            console.error((data as ApiError).error || "Failed to load cleaning job.");
          } else {
            const refreshedJob = (data as FocusedCleaningJobResponse).cleaningJob;
            setFocusedNotificationJob(refreshedJob);
            setCleanerScheduleJobs((previous) =>
              previous.map((job) =>
                job.id === refreshedJob.id
                  ? {
                      ...job,
                      ...refreshedJob,
                      property: refreshedJob.property ?? job.property,
                      calendarEvent: refreshedJob.calendarEvent ?? job.calendarEvent,
                      assignedProvider: refreshedJob.assignedProvider ?? job.assignedProvider,
                    }
                  : job
              )
            );
          }
        } catch {
          console.error("Failed to load cleaning job.");
        }
      }
    } finally {
      providerRefreshInFlightRef.current = false;
    }
  }, [
    focusedNotificationJob?.id,
    loadProviderNotifications,
    loadProviderSchedule,
    selectedCleanerId,
  ]);

  useEffect(() => {
    if (!selectedCleanerId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshProviderDashboardData();
    }, POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshProviderDashboardData, selectedCleanerId, focusedNotificationJob?.id]);

  async function handleMarkProviderNotificationRead(notificationId: string) {
    setProviderNotificationsError("");

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      const data = (await response.json()) as
        | { notification: AppNotification }
        | ApiError;

      if (!response.ok) {
        setProviderNotificationsError(
          (data as ApiError).error || "Failed to mark notification as read."
        );
        return;
      }

      setProviderNotifications((previous) =>
        previous.filter((notification) => notification.id !== notificationId)
      );
    } catch {
      setProviderNotificationsError("Failed to mark notification as read.");
    }
  }

  async function handleMarkAllProviderNotificationsRead() {
    if (!selectedCleanerId) {
      return;
    }

    setProviderNotificationsError("");

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audienceType: "provider",
          providerId: selectedCleanerId,
        }),
      });

      const data = (await response.json()) as { updatedCount: number } | ApiError;

      if (!response.ok) {
        setProviderNotificationsError(
          (data as ApiError).error || "Failed to mark notifications as read."
        );
        return;
      }

      setProviderNotifications([]);
    } catch {
      setProviderNotificationsError("Failed to mark notifications as read.");
    }
  }

  async function handleProviderNotificationClick(notification: AppNotification) {
    if (!notification.cleaningJobId) {
      return;
    }

    setProviderActiveQueue("notification_job");
    setFocusedNotificationJob(null);
    setLoadingFocusedNotificationJob(true);
    setFocusedNotificationJobError("");

    requestAnimationFrame(() => {
      providerQueueSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    try {
      const response = await fetch(`/api/cleaning-jobs/${notification.cleaningJobId}`);
      const data = (await response.json()) as FocusedCleaningJobResponse | ApiError;

      if (!response.ok) {
        setFocusedNotificationJobError(
          (data as ApiError).error || "Failed to load cleaning job."
        );
        return;
      }

      const loadedJob = (data as FocusedCleaningJobResponse).cleaningJob;
      setFocusedNotificationJob(loadedJob);
      setCleanerScheduleJobs((previous) =>
        previous.map((job) =>
          job.id === loadedJob.id
            ? {
                ...job,
                ...loadedJob,
                property: loadedJob.property ?? job.property,
                calendarEvent: loadedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: loadedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      await handleMarkProviderNotificationRead(notification.id);
    } catch {
      setFocusedNotificationJobError("Failed to load cleaning job.");
    } finally {
      setLoadingFocusedNotificationJob(false);
    }
  }

  async function handleUpdateStatus(jobId: string, status: string) {
    setUpdatingStatusJobId(jobId);
    setUpdateError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, actorType: "provider" }),
      });

      const data = (await response.json()) as UpdateStatusResponse | ApiError;

      if (!response.ok) {
        setUpdateError((data as ApiError).error || "Failed to update cleaning job status.");
        return;
      }

      const updatedJob = (data as UpdateStatusResponse).cleaningJob;

      setCleanerScheduleJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                property: updatedJob.property ?? job.property,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: updatedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      setFocusedNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              property: updatedJob.property ?? currentJob.property,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? currentJob.assignedProvider,
            }
          : currentJob
      );
    } catch {
      setUpdateError("Failed to update cleaning job status.");
    } finally {
      setUpdatingStatusJobId("");
    }
  }

  async function handleUpdateNotes(jobId: string, notes: string | null) {
    setUpdatingNotesJobId(jobId);
    setUpdateError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });

      const data = (await response.json()) as UpdateNotesResponse | ApiError;

      if (!response.ok) {
        setUpdateError((data as ApiError).error || "Failed to update cleaning job notes.");
        return;
      }

      const updatedJob = (data as UpdateNotesResponse).cleaningJob;

      setCleanerScheduleJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                property: updatedJob.property ?? job.property,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: updatedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      setFocusedNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              property: updatedJob.property ?? currentJob.property,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? currentJob.assignedProvider,
            }
          : currentJob
      );
    } catch {
      setUpdateError("Failed to update cleaning job notes.");
    } finally {
      setUpdatingNotesJobId("");
    }
  }

  async function handleUpdateProviderIssueFlags(
    jobId: string,
    flags: {
      maintenanceNeeded?: boolean;
      restockNeeded?: boolean;
      damageFound?: boolean;
    }
  ) {
    setUpdatingIssueFlagsJobId(jobId);
    setProviderIssueFlagsError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/issue-flags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flags),
      });

      const data = (await response.json()) as UpdateIssueFlagsResponse | ApiError;

      if (!response.ok) {
        setProviderIssueFlagsError(
          (data as ApiError).error || "Failed to update cleaning job issue flags."
        );
        return;
      }

      const updatedJob = (data as UpdateIssueFlagsResponse).cleaningJob;

      setCleanerScheduleJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                property: updatedJob.property ?? job.property,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: updatedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      setFocusedNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              property: updatedJob.property ?? currentJob.property,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? currentJob.assignedProvider,
            }
          : currentJob
      );
    } catch {
      setProviderIssueFlagsError("Failed to update cleaning job issue flags.");
    } finally {
      setUpdatingIssueFlagsJobId("");
    }
  }

  const todayDateOnly = toDateOnly(new Date());
  const futureRangeEndDateOnly = addDaysToDateOnly(todayDateOnly, providerSummaryRange);

  const jobsDueToday = cleanerScheduleJobs.filter(
    (job) => toDateOnly(job.scheduledDate) === todayDateOnly
  );
  const futureJobsAll = cleanerScheduleJobs.filter(
    (job) => toDateOnly(job.scheduledDate) >= todayDateOnly
  );
  const futureJobsInRange = futureJobsAll.filter((job) => {
    const scheduledDateOnly = toDateOnly(job.scheduledDate);
    return scheduledDateOnly <= futureRangeEndDateOnly;
  });
  const pastJobs = cleanerScheduleJobs.filter((job) => toDateOnly(job.scheduledDate) < todayDateOnly);
  const pendingAcceptJobs = cleanerScheduleJobs.filter((job) => job.status === "assigned");
  const acceptedJobs = cleanerScheduleJobs.filter((job) => job.status === "accepted");
  const inProgressJobs = cleanerScheduleJobs.filter((job) => job.status === "in_progress");
  const completedPastJobs = pastJobs.filter((job) => job.status === "completed");
  const notCompletedPastJobs = pastJobs.filter((job) => job.status !== "completed");
  const jobsWithIssues = cleanerScheduleJobs.filter(
    (job) => job.maintenanceNeeded || job.restockNeeded || job.damageFound
  );
  const maintenanceIssueJobs = cleanerScheduleJobs.filter((job) => job.maintenanceNeeded);
  const restockIssueJobs = cleanerScheduleJobs.filter((job) => job.restockNeeded);
  const damageIssueJobs = cleanerScheduleJobs.filter((job) => job.damageFound);
  const jobsWithNotes = cleanerScheduleJobs.filter((job) => Boolean(job.notes?.trim()));
  const providerNotificationJobQueue = focusedNotificationJob
    ? [focusedNotificationJob]
    : [];

  const providerQueueJobs = (() => {
    if (providerActiveQueue === "notification_job") {
      return providerNotificationJobQueue;
    }

    if (providerActiveQueue === "pending_accept") {
      return pendingAcceptJobs;
    }

    if (providerActiveQueue === "due_today") {
      return jobsDueToday;
    }

    if (providerActiveQueue === "accepted") {
      return acceptedJobs;
    }

    if (providerActiveQueue === "in_progress") {
      return inProgressJobs;
    }

    if (providerActiveQueue === "future") {
      return futureJobsInRange;
    }

    if (providerActiveQueue === "completed_past") {
      return completedPastJobs;
    }

    if (providerActiveQueue === "not_completed_past") {
      return notCompletedPastJobs;
    }

    if (providerActiveQueue === "issues") {
      return jobsWithIssues;
    }

    if (providerActiveQueue === "maintenance") {
      return maintenanceIssueJobs;
    }

    if (providerActiveQueue === "restock") {
      return restockIssueJobs;
    }

    if (providerActiveQueue === "damage") {
      return damageIssueJobs;
    }

    return [] as CleanerScheduleJob[];
  })();

  const providerQueueMeta = (() => {
    if (providerActiveQueue === "notification_job") {
      return {
        title: "Notification job",
        description: "This job was opened from a notification.",
      };
    }

    if (providerActiveQueue === "pending_accept") {
      return {
        title: "Pending accept",
        description: "Jobs assigned to you that still need an accept or decline response.",
      };
    }

    if (providerActiveQueue === "due_today") {
      return {
        title: "Due today",
        description: "Jobs scheduled for today that may need immediate action.",
      };
    }

    if (providerActiveQueue === "accepted") {
      return {
        title: "Accepted jobs",
        description: "Jobs you accepted and can start when work begins.",
      };
    }

    if (providerActiveQueue === "in_progress") {
      return {
        title: "In progress jobs",
        description: "Active jobs currently being worked and ready to complete.",
      };
    }

    if (providerActiveQueue === "future") {
      return {
        title: "Future jobs",
        description: `Upcoming jobs within the next ${providerSummaryRange} days.`,
      };
    }

    if (providerActiveQueue === "completed_past") {
      return {
        title: "Completed past jobs",
        description: "Past jobs already completed for quick verification.",
      };
    }

    if (providerActiveQueue === "not_completed_past") {
      return {
        title: "Not completed past jobs",
        description: "Past-due jobs not marked complete and needing follow-up.",
      };
    }

    if (providerActiveQueue === "issues") {
      return {
        title: "Jobs with issues",
        description: "Jobs where maintenance, restock, or damage has been flagged.",
      };
    }

    if (providerActiveQueue === "maintenance") {
      return {
        title: "Maintenance issues",
        description: "Jobs currently flagged with maintenance issues.",
      };
    }

    if (providerActiveQueue === "restock") {
      return {
        title: "Restock issues",
        description: "Jobs currently flagged with restock needs.",
      };
    }

    if (providerActiveQueue === "damage") {
      return {
        title: "Damage issues",
        description: "Jobs currently flagged with damage findings.",
      };
    }

    return {
      title: "Job queue",
      description: "Select a summary card above to open a focused job queue.",
    };
  })();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Project Lakeview</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Provider Dashboard</h1>
        <p className="text-sm text-slate-600">View and update assigned cleaning jobs for a selected cleaner.</p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="max-w-sm space-y-1">
          <label htmlFor="providerCleanerSelect" className="block text-sm font-medium text-slate-700">
            Cleaner
          </label>
          <select
            id="providerCleanerSelect"
            value={selectedCleanerId}
            onChange={(event) => {
              void handleLoadSchedule(event.target.value);
            }}
            disabled={loadingCleaners}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select cleaner</option>
            {cleaners.map((cleaner) => (
              <option key={cleaner.id} value={cleaner.id}>
                {cleaner.companyName ? `${cleaner.name} (${cleaner.companyName})` : cleaner.name}
              </option>
            ))}
          </select>
        </div>

        {loadingCleaners ? <p className="text-sm text-slate-600">Loading cleaners...</p> : null}

        {cleanersError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {cleanersError}
          </p>
        ) : null}

        {loadingSchedule ? <p className="text-sm text-slate-600">Loading cleaner schedule...</p> : null}

        {scheduleError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {scheduleError}
          </p>
        ) : null}

        {updateError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {updateError}
          </p>
        ) : null}

        {providerIssueFlagsError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {providerIssueFlagsError}
          </p>
        ) : null}

        {!selectedCleanerId ? (
          <p className="text-sm text-slate-600">Select a cleaner to view assigned jobs.</p>
        ) : null}

        {selectedCleanerId ? (
          <div className="flex flex-wrap gap-2">
            {([
              { id: "overview", label: "Overview" },
              { id: "queue", label: "Job queue" },
              { id: "calendar", label: "Calendar" },
              { id: "list", label: "List" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateProviderTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  providerActiveTab === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {selectedCleanerId && !loadingSchedule ? (
          <div className="space-y-3">
            {providerActiveTab === "overview" ? (
              <NotificationPanel
                title="Provider notifications"
                notifications={providerNotifications}
                loading={loadingProviderNotifications}
                error={providerNotificationsError}
                onMarkRead={handleMarkProviderNotificationRead}
                onMarkAllRead={handleMarkAllProviderNotificationsRead}
                onNotificationClick={handleProviderNotificationClick}
              />
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void refreshProviderDashboardData();
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Refresh dashboard
              </button>
            </div>

            {providerActiveTab === "overview" ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Provider summary</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setProviderSummaryRange(7)}
                      className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                        providerSummaryRange === 7
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Next 7 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setProviderSummaryRange(30)}
                      className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                        providerSummaryRange === 30
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Next 30 days
                    </button>
                    <button
                      type="button"
                      onClick={() => setProviderSummaryRange(90)}
                      className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                        providerSummaryRange === 90
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Next 90 days
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("pending_accept")}
                  className={`rounded-lg border bg-white p-3 text-left ${
                    pendingAcceptJobs.length > 0
                      ? "border-amber-300 bg-amber-50/60"
                      : "border-slate-200"
                  } ${providerActiveQueue === "pending_accept" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending accept</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingAcceptJobs.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("due_today")}
                  className={`rounded-lg border bg-white p-3 text-left ${
                    jobsDueToday.length > 0
                      ? "border-amber-300 bg-amber-50/60"
                      : "border-slate-200"
                  } ${providerActiveQueue === "due_today" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Due today</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{jobsDueToday.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("accepted")}
                  className={`rounded-lg border border-slate-200 bg-white p-3 text-left ${providerActiveQueue === "accepted" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Accepted</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{acceptedJobs.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("in_progress")}
                  className={`rounded-lg border bg-white p-3 text-left ${
                    inProgressJobs.length > 0
                      ? "border-amber-300 bg-amber-50/60"
                      : "border-slate-200"
                  } ${providerActiveQueue === "in_progress" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In progress</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{inProgressJobs.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("future")}
                  className={`rounded-lg border border-slate-200 bg-white p-3 text-left ${providerActiveQueue === "future" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Future jobs</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureJobsInRange.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Next {providerSummaryRange} days</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("completed_past")}
                  className={`rounded-lg border border-slate-200 bg-white p-3 text-left ${providerActiveQueue === "completed_past" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed past</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{completedPastJobs.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("not_completed_past")}
                  className={`rounded-lg border border-slate-200 bg-white p-3 text-left ${providerActiveQueue === "not_completed_past" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Not completed past</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{notCompletedPastJobs.length}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProviderActiveQueue("issues")}
                  className={`rounded-lg border bg-white p-3 text-left ${
                    jobsWithIssues.length > 0
                      ? "border-amber-300 bg-amber-50/60"
                      : "border-slate-200"
                  } ${providerActiveQueue === "issues" ? "ring-2 ring-slate-300" : ""}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Jobs with issues</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{jobsWithIssues.length}</p>
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issue queues</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setProviderActiveQueue("maintenance")}
                    className={`rounded-lg border bg-white p-3 text-left transition ${
                      maintenanceIssueJobs.length > 0
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-slate-200"
                    } ${providerActiveQueue === "maintenance" ? "ring-2 ring-slate-300" : "hover:bg-slate-50"}`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Maintenance</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{maintenanceIssueJobs.length}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderActiveQueue("restock")}
                    className={`rounded-lg border bg-white p-3 text-left transition ${
                      restockIssueJobs.length > 0
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-slate-200"
                    } ${providerActiveQueue === "restock" ? "ring-2 ring-slate-300" : "hover:bg-slate-50"}`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Restock</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{restockIssueJobs.length}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderActiveQueue("damage")}
                    className={`rounded-lg border bg-white p-3 text-left transition ${
                      damageIssueJobs.length > 0
                        ? "border-amber-300 bg-amber-50/60"
                        : "border-slate-200"
                    } ${providerActiveQueue === "damage" ? "ring-2 ring-slate-300" : "hover:bg-slate-50"}`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Damage</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{damageIssueJobs.length}</p>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600">Jobs with notes: {jobsWithNotes.length}</p>
              </section>
            ) : null}

            {providerActiveTab === "overview" || providerActiveTab === "queue" ? (
              <section
              ref={providerQueueSectionRef}
              className={`space-y-3 rounded-xl p-4 shadow-sm ${
                providerActiveQueue === "notification_job"
                  ? "border border-indigo-200 bg-indigo-50/60 ring-1 ring-indigo-200"
                  : "border border-slate-200 bg-slate-50/70"
              }`}
            >
              <h2 className="text-sm font-semibold text-slate-900">Job queue</h2>

              {providerActiveQueue === "none" ? (
                <p className="text-sm text-slate-600">
                  Select a summary card above to open a focused job queue.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900">{providerQueueMeta.title}</h3>
                      <p className="text-sm text-slate-600">{providerQueueMeta.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProviderActiveQueue("none");
                        setFocusedNotificationJob(null);
                        setFocusedNotificationJobError("");
                        setLoadingFocusedNotificationJob(false);
                      }}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      {providerActiveQueue === "notification_job"
                        ? "Close notification job"
                        : "Clear queue"}
                    </button>
                  </div>

                  {providerActiveQueue === "notification_job" && loadingFocusedNotificationJob ? (
                    <p className="text-sm text-slate-600">Loading job...</p>
                  ) : null}

                  {providerActiveQueue === "notification_job" && focusedNotificationJobError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {focusedNotificationJobError}
                    </p>
                  ) : null}

                  {providerActiveQueue === "notification_job" && !loadingFocusedNotificationJob && !focusedNotificationJobError && !focusedNotificationJob ? (
                    <p className="text-sm text-slate-600">
                      This job is no longer available in your assigned jobs.
                    </p>
                  ) : null}

                  {providerQueueJobs.length > 0 ? (
                    <CleanerSchedule
                      jobs={providerQueueJobs}
                      onStatusChange={handleUpdateStatus}
                      statusUpdatingJobId={updatingStatusJobId}
                      onNotesChange={handleUpdateNotes}
                      notesUpdatingJobId={updatingNotesJobId}
                      onIssueFlagsChange={handleUpdateProviderIssueFlags}
                      issueFlagsUpdatingJobId={updatingIssueFlagsJobId}
                    />
                  ) : null}

                  {providerActiveQueue !== "notification_job" && providerQueueJobs.length === 0 ? (
                    <p className="text-sm text-slate-600">No jobs in this queue.</p>
                  ) : null}
                </>
              )}
              </section>
            ) : null}

            {providerActiveTab === "calendar" ? (
              <ProviderJobCalendar jobs={cleanerScheduleJobs} />
            ) : null}

            {providerActiveTab === "list" ? (
              <CleanerSchedule
                jobs={cleanerScheduleJobs}
                onStatusChange={handleUpdateStatus}
                statusUpdatingJobId={updatingStatusJobId}
                onNotesChange={handleUpdateNotes}
                notesUpdatingJobId={updatingNotesJobId}
                onIssueFlagsChange={handleUpdateProviderIssueFlags}
                issueFlagsUpdatingJobId={updatingIssueFlagsJobId}
              />
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
