"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CleanerSchedule, { type CleanerScheduleJob } from "@/components/CleanerSchedule";
import ProviderJobCalendar from "@/components/ProviderJobCalendar";
import { type AppNotification } from "@/components/NotificationPanel";
import AppHeader from "@/components/AppHeader";
import EmptyState from "@/components/EmptyState";
import MobileBottomNav from "@/components/MobileBottomNav";

type ServiceProvider = {
  id: string;
  name: string;
  companyName: string | null;
  serviceType: string;
  active: boolean;
  authUserId?: string | null;
  capabilities?: {
    id: string;
    serviceType: string;
    active: boolean;
  }[];
};

type ServiceProvidersResponse = {
  serviceProviders: ServiceProvider[];
};

type CurrentProviderResponse = {
  currentProviderProfile: ServiceProvider | null;
};

type AccountProfileSummary = {
  id: string;
  inviteCodeVerified: boolean;
};

type OnboardingProfileResponse = {
  accountProfile: AccountProfileSummary | null;
  ownerProfile?: { id: string } | null;
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
  const isDevelopment = process.env.NODE_ENV !== "production";

  const [selectedCleanerId, setSelectedCleanerId] = useState("");
  const [cleanerScheduleJobs, setCleanerScheduleJobs] = useState<CleanerScheduleJob[]>([]);
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
  const [currentAccountProfile, setCurrentAccountProfile] =
    useState<AccountProfileSummary | null>(null);
  const [hasOwnerProfile, setHasOwnerProfile] = useState(false);
  const [currentProviderProfile, setCurrentProviderProfile] = useState<ServiceProvider | null>(null);
  const [loadingCurrentProviderProfile, setLoadingCurrentProviderProfile] = useState(true);
  const [unclaimedProviders, setUnclaimedProviders] = useState<ServiceProvider[]>([]);
  const [loadingUnclaimedProviders, setLoadingUnclaimedProviders] = useState(false);
  const [selectedUnclaimedProviderId, setSelectedUnclaimedProviderId] = useState("");
  const [claimProviderError, setClaimProviderError] = useState("");
  const [claimProviderSuccess, setClaimProviderSuccess] = useState("");
  const [claimingProviderProfile, setClaimingProviderProfile] = useState(false);
  const providerQueueSectionRef = useRef<HTMLElement | null>(null);
  const providerRefreshInFlightRef = useRef(false);
  const inviteCodeBlocked = Boolean(
    currentAccountProfile && !currentAccountProfile.inviteCodeVerified
  );

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

  const loadUnclaimedProviders = useCallback(async () => {
    setLoadingUnclaimedProviders(true);
    setClaimProviderError("");

    try {
      const response = await fetch("/api/service-providers/unclaimed");
      const data = (await response.json()) as ServiceProvidersResponse | ApiError;

      if (!response.ok) {
        setClaimProviderError((data as ApiError).error || "Failed to load unclaimed providers.");
        return;
      }

      setUnclaimedProviders((data as ServiceProvidersResponse).serviceProviders);
    } catch {
      setClaimProviderError("Failed to load unclaimed providers.");
    } finally {
      setLoadingUnclaimedProviders(false);
    }
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

  const handleLoadSchedule = useCallback(async (providerId: string) => {
    if (inviteCodeBlocked) {
      return;
    }

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
  }, [inviteCodeBlocked, loadProviderNotifications, loadProviderSchedule]);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentProviderProfile() {
      setLoadingCurrentProviderProfile(true);
      setClaimProviderError("");

      try {
        const [currentProviderResponse, onboardingResponse] = await Promise.all([
          fetch("/api/current-provider"),
          fetch("/api/onboarding/profile"),
        ]);
        const data = (await currentProviderResponse.json()) as CurrentProviderResponse | ApiError;
        const onboardingData = (await onboardingResponse.json()) as OnboardingProfileResponse | ApiError;
        const onboardingAccountProfile = onboardingResponse.ok
          ? (onboardingData as OnboardingProfileResponse).accountProfile
          : null;
        const onboardingOwnerProfile = onboardingResponse.ok
          ? Boolean((onboardingData as OnboardingProfileResponse).ownerProfile)
          : false;
        const inviteBlocked = Boolean(
          onboardingAccountProfile && !onboardingAccountProfile.inviteCodeVerified
        );

        setCurrentAccountProfile(onboardingAccountProfile);
        setHasOwnerProfile(onboardingOwnerProfile);

        if (!currentProviderResponse.ok) {
          if (isActive) {
            setCurrentProviderProfile(null);
            setSelectedCleanerId("");
            if (!inviteBlocked) {
              await loadUnclaimedProviders();
            }
          }
          return;
        }

        const currentProvider = (data as CurrentProviderResponse).currentProviderProfile;
        if (isActive) {
          setCurrentProviderProfile(currentProvider);

          if (currentProvider && !inviteBlocked) {
            await handleLoadSchedule(currentProvider.id);
          } else if (isDevelopment && !inviteBlocked) {
            await loadUnclaimedProviders();
            setSelectedCleanerId("");
          } else {
            setSelectedCleanerId("");
          }
        }
      } catch {
        if (isActive) {
          setCurrentAccountProfile(null);
          setHasOwnerProfile(false);
          setCurrentProviderProfile(null);
          if (isDevelopment) {
            await loadUnclaimedProviders();
          }
        }
      } finally {
        if (isActive) {
          setLoadingCurrentProviderProfile(false);
        }
      }
    }

    void loadCurrentProviderProfile();

    return () => {
      isActive = false;
    };
  }, [handleLoadSchedule, isDevelopment, loadUnclaimedProviders]);

  async function handleClaimLegacyProviderProfile() {
    if (!selectedUnclaimedProviderId) {
      setClaimProviderError("Provider ID is required.");
      return;
    }

    setClaimingProviderProfile(true);
    setClaimProviderError("");
    setClaimProviderSuccess("");

    try {
      const response = await fetch("/api/current-provider/claim-legacy-provider", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerId: selectedUnclaimedProviderId }),
      });

      const data = (await response.json()) as { serviceProvider: ServiceProvider } | ApiError;

      if (!response.ok) {
        setClaimProviderError(
          (data as ApiError).error || "Failed to claim legacy provider profile."
        );
        return;
      }

      const claimedProvider = (data as { serviceProvider: ServiceProvider }).serviceProvider;

      setCurrentProviderProfile(claimedProvider);
      setClaimProviderSuccess("Provider profile claimed.");
      setSelectedUnclaimedProviderId("");
      setUnclaimedProviders([]);

      await handleLoadSchedule(claimedProvider.id);
    } catch {
      setClaimProviderError("Failed to claim legacy provider profile.");
    } finally {
      setClaimingProviderProfile(false);
    }
  }

  const refreshProviderDashboardData = useCallback(async () => {
    if (!selectedCleanerId || inviteCodeBlocked || providerRefreshInFlightRef.current) {
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
    inviteCodeBlocked,
    selectedCleanerId,
  ]);

  useEffect(() => {
    if (!selectedCleanerId || inviteCodeBlocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshProviderDashboardData();
    }, POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [focusedNotificationJob?.id, inviteCodeBlocked, refreshProviderDashboardData, selectedCleanerId]);

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
  const futureRangeEndDateOnly = addDaysToDateOnly(todayDateOnly, 7);

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
        description: "Upcoming jobs within the next 7 days.",
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

  const providerQueueEmptyMessage = (() => {
    if (providerActiveQueue === "pending_accept") {
      return "You're all caught up today.";
    }
    if (providerActiveQueue === "future") {
      return "No upcoming jobs";
    }
    if (providerActiveQueue === "completed_past") {
      return "Completed jobs will appear here";
    }

    return "No jobs assigned yet.";
  })();

  const hasProviderDashboard = Boolean(
    !inviteCodeBlocked && currentAccountProfile && currentProviderProfile
  );

  return (
    <>
    <AppHeader
      currentSection="provider"
      roleContext={hasOwnerProfile ? "both" : "provider"}
      showProfilesLink
      showProviderLink={Boolean(currentProviderProfile && !inviteCodeBlocked)}
      showOwnerLink={Boolean(hasOwnerProfile && currentProviderProfile && !inviteCodeBlocked)}
      showJobsLink={Boolean(currentProviderProfile && !inviteCodeBlocked)}
    />
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-1">
        <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "#0D1B2A" }}>Provider Workbench</h1>
        <p className="text-base" style={{ color: "#7A7060" }}>Review assigned work, manage schedule, and report issues.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {currentProviderProfile ? (
          <p className="text-sm" style={{ color: "#7A7060" }}>
            Signed in as:{" "}
            <span className="font-semibold" style={{ color: "#0D1B2A" }}>
              {currentProviderProfile.companyName
                ? `${currentProviderProfile.name} (${currentProviderProfile.companyName})`
                : currentProviderProfile.name}
            </span>
          </p>
        ) : null}

        {hasProviderDashboard && pendingAcceptJobs.length > 0 ? (
          <div
            className="rounded-lg border-l-4 px-4 py-3"
            style={{ borderColor: "#D97706", backgroundColor: "#FFFBEB" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#D97706" }}>
                  New assignments need your response
                </p>
                <p className="mt-1 text-sm" style={{ color: "#92400E" }}>
                  You have {pendingAcceptJobs.length} job{pendingAcceptJobs.length !== 1 ? "s" : ""} waiting for acceptance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateProviderTab("queue");
                  setProviderActiveQueue("pending_accept");
                }}
                className="ml-4 whitespace-nowrap text-sm font-semibold rounded-md px-3 py-1.5 transition"
                style={{ color: "#FFFFFF", backgroundColor: "#D97706" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#B45309")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#D97706")}
              >
                Review Assignments
              </button>
            </div>
          </div>
        ) : null}

        {loadingCurrentProviderProfile ? (
          <EmptyState
            variant="loading"
            title="Loading provider workbench"
            message="Checking your provider profile and access."
          />
        ) : null}

        {!loadingCurrentProviderProfile && !currentAccountProfile ? (
          <section className="space-y-3 rounded-xl border-l-4 p-4" style={{ borderColor: "#D97706", backgroundColor: "#FFFBEB" }}>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold" style={{ color: "#D97706" }}>Account profile required</h2>
              <p className="text-sm" style={{ color: "#92400E" }}>
                Complete onboarding to finish account setup before using the Provider Workbench.
              </p>
              <Link href="/onboarding" className="text-sm font-medium underline" style={{ color: "#D97706" }}>
                Go to onboarding
              </Link>
            </div>
          </section>
        ) : null}

        {!loadingCurrentProviderProfile && currentAccountProfile && inviteCodeBlocked ? (
          <section className="space-y-3 rounded-xl border-l-4 p-4" style={{ borderColor: "#D97706", backgroundColor: "#FFFBEB" }}>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold" style={{ color: "#D97706" }}>Invite code required</h2>
              <p className="text-sm" style={{ color: "#92400E" }}>
                Complete onboarding with a valid invite code before using the Provider Workbench.
              </p>
              <Link href="/onboarding" className="text-sm font-medium underline" style={{ color: "#D97706" }}>
                Go to onboarding
              </Link>
            </div>
          </section>
        ) : null}

        {!loadingCurrentProviderProfile && currentAccountProfile && !currentProviderProfile && !inviteCodeBlocked ? (
          <section className="space-y-3 rounded-xl border-l-4 p-4" style={{ borderColor: "#D97706", backgroundColor: "#FFFBEB" }}>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold" style={{ color: "#D97706" }}>Provider profile required</h2>
              <p className="text-sm" style={{ color: "#92400E" }}>
                Complete provider onboarding before using the Provider Workbench.
              </p>
              <Link href="/onboarding" className="text-sm font-medium underline" style={{ color: "#D97706" }}>
                Go to onboarding
              </Link>
            </div>

            {isDevelopment ? (
              <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: "#E5E0D8", backgroundColor: "#FFFFFF" }}>
                <h3 className="text-sm font-semibold" style={{ color: "#0D1B2A" }}>Development tools</h3>
                <p className="text-sm" style={{ color: "#7A7060" }}>
                  Claim existing provider profile
                </p>
                <p className="text-sm" style={{ color: "#999999" }}>
                  For local testing only. This will not appear in production.
                </p>

                <div className="max-w-sm space-y-1">
                  <label htmlFor="unclaimedProviderSelect" className="block text-sm font-medium" style={{ color: "#0D1B2A" }}>
                    Unclaimed provider
                  </label>
                  <select
                    id="unclaimedProviderSelect"
                    value={selectedUnclaimedProviderId}
                    onChange={(event) => setSelectedUnclaimedProviderId(event.target.value)}
                    disabled={loadingUnclaimedProviders || claimingProviderProfile}
                    className="w-full rounded-md border bg-white px-3 py-2 text-sm"
                    style={{ borderColor: "#E5E0D8", color: "#0D1B2A" }}
                  >
                    <option value="">Select provider</option>
                    {unclaimedProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.companyName ? `${provider.name} (${provider.companyName})` : provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleClaimLegacyProviderProfile();
                  }}
                  disabled={claimingProviderProfile || !selectedUnclaimedProviderId}
                  className="rounded-md border bg-white px-3 py-2 text-sm font-medium transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ borderColor: "#E5E0D8", color: "#0D1B2A" }}
                >
                  {claimingProviderProfile ? "Claiming..." : "Claim provider profile"}
                </button>

                {claimProviderSuccess ? (
                  <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "#D1FAE5", backgroundColor: "#ECFDF5", color: "#047857" }}>
                    {claimProviderSuccess}
                  </p>
                ) : null}

                {claimProviderError ? (
                  <p className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "#FECACA", backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                    {claimProviderError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {loadingSchedule ? (
          <EmptyState
            variant="loading"
            title="Loading jobs"
            message="Fetching your provider schedule and assignments."
          />
        ) : null}

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

        {!hasProviderDashboard ? null : !selectedCleanerId ? (
          <p className="text-sm text-slate-600">Select a cleaner to view assigned jobs.</p>
        ) : null}

        {hasProviderDashboard ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { id: "overview", label: "Overview" },
              { id: "queue", label: "Work Queue" },
              { id: "calendar", label: "Calendar" },
              { id: "list", label: "All Jobs" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateProviderTab(tab.id)}
                className="min-h-11 rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  backgroundColor: providerActiveTab === tab.id ? "#B8860B" : "#FFFFFF",
                  color: providerActiveTab === tab.id ? "#0D1B2A" : "#7A7060",
                  border: `1px solid ${providerActiveTab === tab.id ? "#B8860B" : "#E5E0D8"}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {hasProviderDashboard && !loadingSchedule ? (
          <div className="space-y-3">
            {providerActiveTab === "overview" ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
                <h2 className="text-base font-semibold" style={{ color: "#0D1B2A" }}>Quick Actions</h2>

                {pendingAcceptJobs.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      updateProviderTab("queue");
                      setProviderActiveQueue("pending_accept");
                    }}
                    className="w-full rounded-lg border-l-4 p-3 text-left transition hover:shadow-sm"
                    style={{ borderColor: "#D97706", backgroundColor: "#FFFBEB" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#D97706" }}>
                      Pending Response
                    </p>
                    <p className="mt-1 text-lg font-semibold" style={{ color: "#0D1B2A" }}>
                      {pendingAcceptJobs.length} job{pendingAcceptJobs.length !== 1 ? "s" : ""}
                    </p>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    updateProviderTab("queue");
                    setProviderActiveQueue("due_today");
                  }}
                  className="w-full rounded-lg border-l-4 p-3 text-left transition hover:shadow-sm"
                  style={{ borderColor: jobsDueToday.length > 0 ? "#D97706" : "#0D1B2A", backgroundColor: jobsDueToday.length > 0 ? "#FFFBEB" : "#FAF7F2" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A7060" }}>Today&apos;s Work</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: "#0D1B2A" }}>{jobsDueToday.length}</p>
                  {jobsDueToday.length === 0 && <p className="mt-1 text-xs" style={{ color: "#7A7060" }}>You&apos;re all caught up today.</p>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateProviderTab("queue");
                    setProviderActiveQueue("future");
                  }}
                  className="w-full rounded-lg border-l-4 p-3 text-left transition hover:shadow-sm"
                  style={{ borderColor: "#0D1B2A" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A7060" }}>Upcoming Work</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: "#0D1B2A" }}>{futureJobsInRange.length}</p>
                </button>

                <details className="rounded-lg border p-3" style={{ borderColor: "#E5E0D8" }}>
                  <summary className="cursor-pointer text-sm font-medium" style={{ color: "#0D1B2A" }}>
                    Completed ({completedPastJobs.length})
                  </summary>
                  <p className="mt-2 text-sm" style={{ color: "#7A7060" }}>View your completed work in the All Jobs tab.</p>
                </details>
              </section>
            ) : null}

            {providerActiveTab === "overview" ? (
              <section className="hidden space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:block">
                <h2 className="text-lg font-semibold" style={{ color: "#0D1B2A" }}>Summary</h2>

                {/* Summary cards grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { id: "pending_accept", label: "Pending Acceptance", count: pendingAcceptJobs.length, color: "#D97706", borderColor: "#FCD34D" },
                    { id: "due_today", label: "Today", count: jobsDueToday.length, color: "#D97706", borderColor: "#FCD34D" },
                    { id: "future", label: "Upcoming", count: futureJobsInRange.length, color: "#0D1B2A", borderColor: "#E5E0D8" },
                    { id: "in_progress", label: "In Progress", count: inProgressJobs.length, color: "#1A6B60", borderColor: "#99E6DD" },
                    { id: "completed_past", label: "Completed", count: completedPastJobs.length, color: "#1A6B60", borderColor: "#99E6DD" },
                  ].map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setProviderActiveQueue(card.id as ProviderActionQueue);
                        updateProviderTab("queue");
                      }}
                      className="rounded-lg border-l-4 bg-white p-3 text-left transition hover:shadow-md"
                      style={{ borderColor: card.color }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7A7060" }}>
                        {card.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: "#0D1B2A", minHeight: "32px" }}>
                        {card.count}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Find Work filter section */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3" style={{ color: "#0D1B2A" }}>Find Work</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="filter-status" className="block text-xs font-medium mb-1" style={{ color: "#7A7060" }}>
                        Status
                      </label>
                      <select
                        id="filter-status"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        style={{ borderColor: "#E5E0D8", backgroundColor: "#FFFFFF", color: "#0D1B2A" }}
                      >
                        <option value="">All statuses</option>
                        <option value="assigned">Pending Acceptance</option>
                        <option value="accepted">Accepted</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="filter-service" className="block text-xs font-medium mb-1" style={{ color: "#7A7060" }}>
                        Service Type
                      </label>
                      <select
                        id="filter-service"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        style={{ borderColor: "#E5E0D8", backgroundColor: "#FFFFFF", color: "#0D1B2A" }}
                      >
                        <option value="">All types</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="restock">Restock</option>
                        <option value="inspection">Inspection</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateProviderTab("queue")}
                      className="rounded-md px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                      style={{ backgroundColor: "#0D1B2A" }}
                    >
                      View Work
                    </button>
                    <button
                      type="button"
                      onClick={() => setProviderActiveQueue("none")}
                      className="rounded-md border px-4 py-2 text-sm font-medium transition"
                      style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void refreshProviderDashboardData();
                }}
                className="min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition hover:opacity-90"
                style={{ borderColor: "#E5E0D8", color: "#7A7060", backgroundColor: "#FFFFFF" }}
              >
                Refresh workbench
              </button>
            </div>

            {providerActiveTab === "overview" ? (
              <section className="hidden space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:block">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: "#0D1B2A" }}>Provider Notifications</h3>
                  {providerNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleMarkAllProviderNotificationsRead()}
                      className="text-xs font-medium transition hover:opacity-75"
                      style={{ color: "#B8860B" }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {loadingProviderNotifications ? (
                  <p className="text-sm" style={{ color: "#7A7060" }}>Loading notifications...</p>
                ) : providerNotificationsError ? (
                  <p className="text-sm text-red-700">{providerNotificationsError}</p>
                ) : providerNotifications.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {providerNotifications.slice(0, 5).map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => void handleProviderNotificationClick(notification)}
                        className="w-full rounded-lg border p-3 text-left transition hover:bg-amber-50"
                        style={{ borderColor: "#E5E0D8", backgroundColor: "#FFFBEB" }}
                      >
                        <p className="text-sm font-medium" style={{ color: "#0D1B2A" }}>{notification.message}</p>
                        {notification.createdAt && (
                          <p className="mt-1 text-xs" style={{ color: "#7A7060" }}>
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "#7A7060" }}>No new notifications.</p>
                )}
              </section>
            ) : null}

            {providerActiveTab === "overview" || providerActiveTab === "queue" ? (
              <section
              ref={providerQueueSectionRef}
              className="hidden space-y-4 rounded-xl p-6 shadow-sm md:block"
              style={{
                border: `1px solid ${providerActiveQueue === "notification_job" ? "#FCD34D" : "#E5E0D8"}`,
                backgroundColor: providerActiveQueue === "notification_job" ? "#FFFBEB" : "#FFFFFF",
              }}
            >
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#0D1B2A" }}>Work Queue</h2>
                <p className="mt-0.5 text-sm" style={{ color: "#7A7060" }}>Review assigned jobs, schedule conflicts, and confirmed pay.</p>
              </div>

              {providerActiveQueue === "none" ? (
                <CleanerSchedule
                  jobs={cleanerScheduleJobs.filter(
                    (j) => j.status !== "cancelled" && j.status !== "declined" && j.status !== "completed"
                  )}
                  allProviderJobs={cleanerScheduleJobs}
                  onStatusChange={handleUpdateStatus}
                  statusUpdatingJobId={updatingStatusJobId}
                  onNotesChange={handleUpdateNotes}
                  notesUpdatingJobId={updatingNotesJobId}
                  onIssueFlagsChange={handleUpdateProviderIssueFlags}
                  issueFlagsUpdatingJobId={updatingIssueFlagsJobId}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold" style={{ color: "#0D1B2A" }}>{providerQueueMeta.title}</h3>
                      <p className="text-sm" style={{ color: "#7A7060" }}>{providerQueueMeta.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProviderActiveQueue("none");
                        setFocusedNotificationJob(null);
                        setFocusedNotificationJobError("");
                        setLoadingFocusedNotificationJob(false);
                      }}
                      className="whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium transition hover:opacity-75"
                      style={{ borderColor: "#E5E0D8", color: "#7A7060" }}
                    >
                      {providerActiveQueue === "notification_job"
                        ? "Close notification"
                        : "Clear filters"}
                    </button>
                  </div>

                  {providerActiveQueue === "notification_job" && loadingFocusedNotificationJob ? (
                    <p className="text-sm" style={{ color: "#7A7060" }}>Loading job details...</p>
                  ) : null}

                  {providerActiveQueue === "notification_job" && focusedNotificationJobError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {focusedNotificationJobError}
                    </p>
                  ) : null}

                  {providerActiveQueue === "notification_job" && !loadingFocusedNotificationJob && !focusedNotificationJobError && !focusedNotificationJob ? (
                    <p className="text-sm" style={{ color: "#7A7060" }}>
                      This job is no longer available in your assigned work.
                    </p>
                  ) : null}

                  {providerQueueJobs.length > 0 ? (
                    <CleanerSchedule
                      jobs={providerQueueJobs}
                      allProviderJobs={cleanerScheduleJobs}
                      onStatusChange={handleUpdateStatus}
                      statusUpdatingJobId={updatingStatusJobId}
                      onNotesChange={handleUpdateNotes}
                      notesUpdatingJobId={updatingNotesJobId}
                      onIssueFlagsChange={handleUpdateProviderIssueFlags}
                      issueFlagsUpdatingJobId={updatingIssueFlagsJobId}
                    />
                  ) : null}

                  {providerActiveQueue !== "notification_job" && providerQueueJobs.length === 0 ? (
                    <EmptyState title={providerQueueEmptyMessage} message="Check back later or refresh to see new assignments." />
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
                allProviderJobs={cleanerScheduleJobs}
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
    <MobileBottomNav
      mode="provider"
      activeTab={providerActiveTab}
      showRoleSwitch={hasOwnerProfile}
    />
    </>
  );
}
