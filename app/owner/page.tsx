"use client";

import { useCallback, useEffect, useState } from "react";
import PropertyForm from "@/components/PropertyForm";
import CalendarSyncForm from "@/components/CalendarSyncForm";
import CalendarEventCard from "@/components/CalendarEventCard";
import CleaningJobCard, { type CleaningJobItem } from "@/components/CleaningJobCard";
import CleaningJobCalendar from "@/components/CleaningJobCalendar";
import CleanerSchedule, { type CleanerScheduleJob } from "@/components/CleanerSchedule";
import ProviderJobCalendar from "@/components/ProviderJobCalendar";
import ServiceProviderForm from "@/components/ServiceProviderForm";
import EmptyState from "@/components/EmptyState";
import {
  CalendarEventItem,
  CalendarSyncResponse,
  CalendarSyncError,
} from "@/lib/calendar/calendarTypes";

type SavedProperty = {
  id: string;
  name: string;
  address: string | null;
  airbnbCalendarUrl: string;
  createdAt: string;
  updatedAt: string;
};

type SavePropertyResponse = {
  property: SavedProperty;
};

type LoadPropertiesResponse = {
  properties: SavedProperty[];
};

type SavePropertyError = {
  error: string;
};

type SyncedDbEvent = {
  externalId: string;
  summary: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  source: string;
};

type PropertySyncResponse = {
  events: SyncedDbEvent[];
};

type PropertyEventsResponse = {
  events: SyncedDbEvent[];
};

type PropertyCleaningJobsResponse = {
  cleaningJobs: CleaningJobItem[];
};

type GenerateCleaningJobsResponse = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
};

type UpdateCleaningJobStatusResponse = {
  cleaningJob: CleaningJobItem;
};

type UpdateCleaningJobNotesResponse = {
  cleaningJob: CleaningJobItem & {
    property: CleanerScheduleJob["property"];
  };
};

type UpdateCleaningJobIssueFlagsResponse = {
  cleaningJob: CleaningJobItem & {
    property: CleanerScheduleJob["property"];
  };
};

type ServiceProvider = {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  serviceType: string;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ServiceProvidersResponse = {
  serviceProviders: ServiceProvider[];
};

type SaveServiceProviderResponse = {
  serviceProvider: ServiceProvider;
};

type ServiceProviderCleaningJobsResponse = {
  cleaningJobs: CleanerScheduleJob[];
};

type OwnerActiveQueue =
  | "none"
  | "future_all"
  | "future_needs_assignment"
  | "future_assigned"
  | "future_declined"
  | "future_accepted"
  | "future_in_progress"
  | "future_cancelled"
  | "future_issues"
  | "past_all"
  | "past_completed"
  | "past_not_completed"
  | "past_issues"
  | "issues_all"
  | "issues_maintenance"
  | "issues_restock"
  | "issues_damage";

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

function mapDbEventsToCalendarItems(events: SyncedDbEvent[]): CalendarEventItem[] {
  return events.map((event) => ({
    id: event.externalId,
    summary: event.summary,
    checkInDate: toDateOnly(event.checkInDate),
    checkOutDate: toDateOnly(event.checkOutDate),
    nights: event.nights,
    source: "airbnb",
  }));
}

export default function HomePage() {
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [savedAirbnbCalendarUrl, setSavedAirbnbCalendarUrl] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);
  const [savedProperty, setSavedProperty] = useState<SavedProperty | null>(null);
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyError, setPropertyError] = useState("");
  const [propertySuccess, setPropertySuccess] = useState("");

  const [calendarUrl, setCalendarUrl] = useState("");
  const [items, setItems] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [syncingPropertyId, setSyncingPropertyId] = useState("");
  const [loadingEventsPropertyId, setLoadingEventsPropertyId] = useState("");
  const [cleaningJobs, setCleaningJobs] = useState<CleaningJobItem[]>([]);
  const [loadingCleaningJobsPropertyId, setLoadingCleaningJobsPropertyId] = useState("");
  const [cleaningJobsError, setCleaningJobsError] = useState("");
  const [updatingCleaningJobId, setUpdatingCleaningJobId] = useState("");
  const [cleaningJobStatusError, setCleaningJobStatusError] = useState("");
  const [generatingJobsPropertyId, setGeneratingJobsPropertyId] = useState("");
  const [cleaningJobGenerationMessage, setCleaningJobGenerationMessage] = useState("");
  const [cleaningJobsView, setCleaningJobsView] = useState<"list" | "grouped" | "calendar">(
    "grouped"
  );
  const [ownerActiveQueue, setOwnerActiveQueue] = useState<OwnerActiveQueue>("none");
  const [futureSummaryRange, setFutureSummaryRange] = useState<7 | 30 | 90>(30);
  const [cleaningJobStatusFilter, setCleaningJobStatusFilter] = useState("all");
  const [cleaningJobProviderFilter, setCleaningJobProviderFilter] = useState("all");
  const [showManualSync, setShowManualSync] = useState(false);

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [loadingServiceProviders, setLoadingServiceProviders] = useState(true);
  const [savingServiceProvider, setSavingServiceProvider] = useState(false);
  const [serviceProviderError, setServiceProviderError] = useState("");
  const [serviceProviderSuccess, setServiceProviderSuccess] = useState("");

  const [providerName, setProviderName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("cleaner");
  const [providerNotes, setProviderNotes] = useState("");

  const [updatingProviderJobId, setUpdatingProviderJobId] = useState("");
  const [providerAssignmentError, setProviderAssignmentError] = useState("");
  const [selectedCleanerScheduleProviderId, setSelectedCleanerScheduleProviderId] =
    useState("");
  const [cleanerScheduleJobs, setCleanerScheduleJobs] = useState<CleanerScheduleJob[]>([]);
  const [loadingCleanerSchedule, setLoadingCleanerSchedule] = useState(false);
  const [cleanerScheduleError, setCleanerScheduleError] = useState("");
  const [updatingCleanerScheduleJobId, setUpdatingCleanerScheduleJobId] = useState("");
  const [cleanerScheduleStatusError, setCleanerScheduleStatusError] = useState("");
  const [updatingNotesJobId, setUpdatingNotesJobId] = useState("");
  const [cleaningJobNotesError, setCleaningJobNotesError] = useState("");
  const [updatingIssueFlagsJobId, setUpdatingIssueFlagsJobId] = useState("");
  const [cleaningJobIssueFlagsError, setCleaningJobIssueFlagsError] = useState("");

  const cleanerProviders = serviceProviders
    .filter((provider) => provider.serviceType === "cleaner" && provider.active)
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      companyName: provider.companyName,
    }));

  const filteredCleaningJobs = (() => {
    let result = cleaningJobs;

    // Apply status filter
    if (cleaningJobStatusFilter !== "all") {
      result = result.filter((job) => job.status === cleaningJobStatusFilter);
    }

    // Apply provider filter
    if (cleaningJobProviderFilter === "unassigned") {
      result = result.filter((job) => job.assignedProviderId === null);
    } else if (cleaningJobProviderFilter !== "all") {
      result = result.filter((job) => job.assignedProviderId === cleaningJobProviderFilter);
    }

    return result;
  })();

  const todayDateOnly = toDateOnly(new Date());
  const futureRangeEndDateOnly = addDaysToDateOnly(todayDateOnly, futureSummaryRange);
  const futureJobsAll = cleaningJobs.filter(
    (job) => toDateOnly(job.scheduledDate) >= todayDateOnly
  );
  const futureJobsInRange = futureJobsAll.filter((job) => {
    const scheduledDateOnly = toDateOnly(job.scheduledDate);
    return scheduledDateOnly <= futureRangeEndDateOnly;
  });
  const pastJobs = cleaningJobs.filter((job) => toDateOnly(job.scheduledDate) < todayDateOnly);

  const futureNeedsAssignmentJobs = futureJobsInRange.filter(
    (job) => job.status === "needs_assignment"
  );
  const futureAssignedJobs = futureJobsInRange.filter((job) => job.status === "assigned");
  const futureDeclinedJobs = futureJobsInRange.filter((job) => job.status === "declined");
  const futureAcceptedJobs = futureJobsInRange.filter((job) => job.status === "accepted");
  const futureInProgressJobs = futureJobsInRange.filter((job) => job.status === "in_progress");
  const futureCancelledJobs = futureJobsInRange.filter((job) => job.status === "cancelled");
  const futureIssueJobs = futureJobsInRange.filter(
    (job) => job.maintenanceNeeded || job.restockNeeded || job.damageFound
  );

  const pastCompletedJobs = pastJobs.filter((job) => job.status === "completed");
  const pastNotCompletedJobs = pastJobs.filter((job) => job.status !== "completed");
  const pastIssueJobs = pastJobs.filter(
    (job) => job.maintenanceNeeded || job.restockNeeded || job.damageFound
  );

  const allIssueJobs = cleaningJobs.filter(
    (job) => job.maintenanceNeeded || job.restockNeeded || job.damageFound
  );
  const maintenanceIssueJobs = cleaningJobs.filter((job) => job.maintenanceNeeded);
  const restockIssueJobs = cleaningJobs.filter((job) => job.restockNeeded);
  const damageIssueJobs = cleaningJobs.filter((job) => job.damageFound);

  const totalFutureJobs = futureJobsInRange.length;
  const futureNeedsAssignment = futureNeedsAssignmentJobs.length;
  const futureAssigned = futureAssignedJobs.length;
  const futureDeclined = futureDeclinedJobs.length;
  const futureAccepted = futureAcceptedJobs.length;
  const futureInProgress = futureInProgressJobs.length;
  const futureCancelled = futureCancelledJobs.length;
  const futureWithIssues = futureIssueJobs.length;

  const totalPastJobs = pastJobs.length;
  const pastCompleted = pastCompletedJobs.length;
  const pastNotCompleted = pastNotCompletedJobs.length;
  const pastWithIssues = pastIssueJobs.length;

  const jobsWithIssues = allIssueJobs;
  const maintenanceJobs = maintenanceIssueJobs;
  const restockJobs = restockIssueJobs;
  const damageJobs = damageIssueJobs;

  const ownerQueueJobs = (() => {
    if (ownerActiveQueue === "future_all") {
      return futureJobsInRange;
    }
    if (ownerActiveQueue === "future_needs_assignment") {
      return futureNeedsAssignmentJobs;
    }
    if (ownerActiveQueue === "future_assigned") {
      return futureAssignedJobs;
    }
    if (ownerActiveQueue === "future_declined") {
      return futureDeclinedJobs;
    }
    if (ownerActiveQueue === "future_accepted") {
      return futureAcceptedJobs;
    }
    if (ownerActiveQueue === "future_in_progress") {
      return futureInProgressJobs;
    }
    if (ownerActiveQueue === "future_cancelled") {
      return futureCancelledJobs;
    }
    if (ownerActiveQueue === "future_issues") {
      return futureIssueJobs;
    }
    if (ownerActiveQueue === "past_all") {
      return pastJobs;
    }
    if (ownerActiveQueue === "past_completed") {
      return pastCompletedJobs;
    }
    if (ownerActiveQueue === "past_not_completed") {
      return pastNotCompletedJobs;
    }
    if (ownerActiveQueue === "past_issues") {
      return pastIssueJobs;
    }
    if (ownerActiveQueue === "issues_all") {
      return allIssueJobs;
    }
    if (ownerActiveQueue === "issues_maintenance") {
      return maintenanceIssueJobs;
    }
    if (ownerActiveQueue === "issues_restock") {
      return restockIssueJobs;
    }
    if (ownerActiveQueue === "issues_damage") {
      return damageIssueJobs;
    }

    return [] as CleaningJobItem[];
  })();

  const ownerQueueMeta = (() => {
    if (ownerActiveQueue === "future_all") {
      return {
        title: "Future jobs",
        description: `All jobs scheduled in the next ${futureSummaryRange} days.`,
      };
    }
    if (ownerActiveQueue === "future_needs_assignment") {
      return {
        title: "Needs assignment",
        description: "Future jobs without a cleaner assigned yet.",
      };
    }
    if (ownerActiveQueue === "future_assigned") {
      return {
        title: "Assigned jobs",
        description: "Future jobs assigned to a cleaner and awaiting acceptance.",
      };
    }
    if (ownerActiveQueue === "future_declined") {
      return {
        title: "Declined jobs",
        description: "Future jobs declined by providers and needing reassignment.",
      };
    }
    if (ownerActiveQueue === "future_accepted") {
      return {
        title: "Accepted jobs",
        description: "Future jobs accepted by assigned cleaners.",
      };
    }
    if (ownerActiveQueue === "future_in_progress") {
      return {
        title: "In progress jobs",
        description: "Future-window jobs currently marked in progress.",
      };
    }
    if (ownerActiveQueue === "future_cancelled") {
      return {
        title: "Cancelled jobs",
        description: "Future jobs cancelled by owner/admin.",
      };
    }
    if (ownerActiveQueue === "future_issues") {
      return {
        title: "Future jobs with issues",
        description: "Upcoming jobs that have maintenance, restock, or damage flags.",
      };
    }
    if (ownerActiveQueue === "past_all") {
      return {
        title: "Past jobs",
        description: "All jobs scheduled before today.",
      };
    }
    if (ownerActiveQueue === "past_completed") {
      return {
        title: "Completed past jobs",
        description: "Past jobs marked completed.",
      };
    }
    if (ownerActiveQueue === "past_not_completed") {
      return {
        title: "Not completed past jobs",
        description: "Past jobs still not completed and needing follow-up.",
      };
    }
    if (ownerActiveQueue === "past_issues") {
      return {
        title: "Past jobs with issues",
        description: "Past jobs where issues were flagged.",
      };
    }
    if (ownerActiveQueue === "issues_all") {
      return {
        title: "All issue jobs",
        description: "All jobs with any maintenance, restock, or damage issue.",
      };
    }
    if (ownerActiveQueue === "issues_maintenance") {
      return {
        title: "Maintenance issues",
        description: "Jobs currently flagged with maintenance issues.",
      };
    }
    if (ownerActiveQueue === "issues_restock") {
      return {
        title: "Restock issues",
        description: "Jobs currently flagged with restock needs.",
      };
    }
    if (ownerActiveQueue === "issues_damage") {
      return {
        title: "Damage issues",
        description: "Jobs currently flagged with damage findings.",
      };
    }

    return {
      title: "Owner job queue",
      description: "Select a summary card above to open a focused job queue.",
    };
  })();

  const loadCleaningJobsForProperty = useCallback(async (property: SavedProperty) => {
    setLoadingCleaningJobsPropertyId(property.id);
    setCleaningJobsError("");
    setOwnerActiveQueue("none");

    try {
      const response = await fetch(`/api/properties/${property.id}/cleaning-jobs`);
      const data = (await response.json()) as
        | PropertyCleaningJobsResponse
        | CalendarSyncError;

      if (!response.ok) {
        setCleaningJobsError(
          (data as CalendarSyncError).error || "Failed to load cleaning jobs."
        );
        return;
      }

      setCleaningJobs((data as PropertyCleaningJobsResponse).cleaningJobs);
    } catch {
      setCleaningJobsError("Failed to load cleaning jobs.");
    } finally {
      setLoadingCleaningJobsPropertyId("");
    }
  }, []);

  const loadServiceProviders = useCallback(async () => {
    setLoadingServiceProviders(true);

    try {
      const response = await fetch("/api/service-providers");
      const data = (await response.json()) as ServiceProvidersResponse | CalendarSyncError;

      if (!response.ok) {
        setServiceProviderError(
          (data as CalendarSyncError).error || "Failed to load service providers."
        );
        return;
      }

      setServiceProviders((data as ServiceProvidersResponse).serviceProviders);
    } catch {
      setServiceProviderError("Failed to load service providers.");
    } finally {
      setLoadingServiceProviders(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadInitialData() {
      setLoadingProperties(true);
      setLoadingServiceProviders(true);

      try {
        const [propertiesResponse, providersResponse] = await Promise.all([
          fetch("/api/properties"),
          fetch("/api/service-providers"),
        ]);

        const propertiesData = (await propertiesResponse.json()) as
          | LoadPropertiesResponse
          | SavePropertyError;
        const providersData = (await providersResponse.json()) as
          | ServiceProvidersResponse
          | CalendarSyncError;

        if (!isActive) {
          return;
        }

        if (!propertiesResponse.ok) {
          setPropertyError(
            (propertiesData as SavePropertyError).error || "Failed to load properties."
          );
        } else {
          const loadedProperties = (propertiesData as LoadPropertiesResponse).properties;
          setProperties(loadedProperties);

          if (loadedProperties.length > 0) {
            const firstProperty = loadedProperties[0];
            setSelectedPropertyId(firstProperty.id);
            setLoadingEventsPropertyId(firstProperty.id);
            setItems([]);
            setError("");

            try {
              const eventsResponse = await fetch(`/api/properties/${firstProperty.id}/events`);
              const eventsData = (await eventsResponse.json()) as
                | PropertyEventsResponse
                | CalendarSyncError;

              if (!isActive) {
                return;
              }

              if (!eventsResponse.ok) {
                setError(
                  (eventsData as CalendarSyncError).error || "Unable to load saved events."
                );
              } else {
                setItems(
                  mapDbEventsToCalendarItems((eventsData as PropertyEventsResponse).events)
                );
                void loadCleaningJobsForProperty(firstProperty);
              }
            } catch {
              if (isActive) {
                setError("Unable to load saved events.");
              }
            } finally {
              if (isActive) {
                setLoadingEventsPropertyId("");
              }
            }
          }
        }

        if (!providersResponse.ok) {
          setServiceProviderError(
            (providersData as CalendarSyncError).error ||
              "Failed to load service providers."
          );
        } else {
          setServiceProviders((providersData as ServiceProvidersResponse).serviceProviders);
        }
      } catch {
        if (isActive) {
          setPropertyError("Failed to load properties.");
          setServiceProviderError("Failed to load service providers.");
        }
      } finally {
        if (isActive) {
          setLoadingProperties(false);
          setLoadingServiceProviders(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isActive = false;
    };
  }, [loadCleaningJobsForProperty]);

  async function handleSaveServiceProvider() {
    setSavingServiceProvider(true);
    setServiceProviderError("");
    setServiceProviderSuccess("");

    try {
      const response = await fetch("/api/service-providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: providerName,
          companyName,
          email,
          phone,
          serviceType,
          notes: providerNotes,
        }),
      });

      const data = (await response.json()) as
        | SaveServiceProviderResponse
        | CalendarSyncError;

      if (!response.ok) {
        setServiceProviderError(
          (data as CalendarSyncError).error || "Failed to create service provider."
        );
        return;
      }

      const createdProvider = (data as SaveServiceProviderResponse).serviceProvider;
      setServiceProviders((previous) => [createdProvider, ...previous]);
      setServiceProviderSuccess("Service provider saved.");

      setProviderName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setServiceType("cleaner");
      setProviderNotes("");
    } catch {
      setServiceProviderError("Failed to create service provider.");
    } finally {
      setSavingServiceProvider(false);
    }
  }

  async function handleSaveProperty() {
    setSavingProperty(true);
    setPropertyError("");
    setPropertySuccess("");

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: propertyName,
          address: propertyAddress,
          airbnbCalendarUrl: savedAirbnbCalendarUrl,
        }),
      });

      const data = (await response.json()) as SavePropertyResponse | SavePropertyError;

      if (!response.ok) {
        setPropertyError((data as SavePropertyError).error || "Failed to create property.");
        return;
      }

      const createdProperty = (data as SavePropertyResponse).property;
      setSavedProperty(createdProperty);
      setProperties((previous) => [createdProperty, ...previous]);
      setPropertySuccess("Property saved.");

      setPropertyName("");
      setPropertyAddress("");
      setSavedAirbnbCalendarUrl("");
    } catch {
      setPropertyError("Failed to create property.");
    } finally {
      setSavingProperty(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/calendar?url=${encodeURIComponent(calendarUrl)}`
      );
      const data = (await response.json()) as CalendarSyncResponse | CalendarSyncError;

      if (!response.ok) {
        setItems([]);
        setError((data as CalendarSyncError).error || "Unable to sync calendar.");
        return;
      }

      setItems((data as CalendarSyncResponse).items);
    } catch {
      setItems([]);
      setError("Unable to sync calendar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncSavedProperty(property: SavedProperty) {
    setSelectedPropertyId(property.id);
    setSyncingPropertyId(property.id);
    setError("");
    setItems([]);

    try {
      const response = await fetch(`/api/properties/${property.id}/sync`, {
        method: "POST",
      });
      const data = (await response.json()) as PropertySyncResponse | CalendarSyncError;

      if (!response.ok) {
        setError((data as CalendarSyncError).error || "Unable to sync calendar.");
        return;
      }

      const syncedItems = mapDbEventsToCalendarItems(
        (data as PropertySyncResponse).events
      );

      setItems(syncedItems);
      void loadCleaningJobsForProperty(property);
    } catch {
      setError("Unable to sync calendar.");
    } finally {
      setSyncingPropertyId("");
    }
  }

  async function handleViewSavedEvents(property: SavedProperty) {
    setSelectedPropertyId(property.id);
    setLoadingEventsPropertyId(property.id);
    setItems([]);
    setError("");

    try {
      const response = await fetch(`/api/properties/${property.id}/events`);
      const data = (await response.json()) as PropertyEventsResponse | CalendarSyncError;

      if (!response.ok) {
        setError((data as CalendarSyncError).error || "Unable to load saved events.");
        return;
      }

      const savedItems = mapDbEventsToCalendarItems(
        (data as PropertyEventsResponse).events
      );

      setItems(savedItems);
      void loadCleaningJobsForProperty(property);
    } catch {
      setError("Unable to load saved events.");
    } finally {
      setLoadingEventsPropertyId("");
    }
  }

  async function handleGenerateCleaningJobs(property: SavedProperty) {
    setSelectedPropertyId(property.id);
    setGeneratingJobsPropertyId(property.id);
    setCleaningJobsError("");
    setCleaningJobGenerationMessage("");

    try {
      const response = await fetch(
        `/api/properties/${property.id}/cleaning-jobs/generate`,
        {
          method: "POST",
        }
      );
      const data = (await response.json()) as
        | GenerateCleaningJobsResponse
        | CalendarSyncError;

      if (!response.ok) {
        setCleaningJobsError(
          (data as CalendarSyncError).error || "Failed to generate cleaning jobs."
        );
        return;
      }

      const result = data as GenerateCleaningJobsResponse;
      setCleaningJobGenerationMessage(
        `Created ${result.createdCount} cleaning jobs. Updated ${result.updatedCount} existing jobs. Skipped ${result.skippedCount} unchanged jobs.`
      );
      await loadCleaningJobsForProperty(property);
    } catch {
      setCleaningJobsError("Failed to generate cleaning jobs.");
    } finally {
      setGeneratingJobsPropertyId("");
    }
  }

  async function handleUpdateCleaningJobStatus(jobId: string, status: string) {
    setUpdatingCleaningJobId(jobId);
    setCleaningJobStatusError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as
        | UpdateCleaningJobStatusResponse
        | CalendarSyncError;

      if (!response.ok) {
        setCleaningJobStatusError(
          (data as CalendarSyncError).error || "Failed to update cleaning job status."
        );
        return;
      }

      const updatedJob = (data as UpdateCleaningJobStatusResponse).cleaningJob;
      setCleaningJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
              }
            : job
        )
      );
    } catch {
      setCleaningJobStatusError("Failed to update cleaning job status.");
    } finally {
      setUpdatingCleaningJobId("");
    }
  }

  async function handleAssignCleaningJobProvider(jobId: string, providerId: string | null) {
    setUpdatingProviderJobId(jobId);
    setProviderAssignmentError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/assign-provider`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerId }),
      });

      const data = (await response.json()) as
        | UpdateCleaningJobStatusResponse
        | CalendarSyncError;

      if (!response.ok) {
        setProviderAssignmentError(
          (data as CalendarSyncError).error || "Failed to assign cleaning job provider."
        );
        return;
      }

      const updatedJob = (data as UpdateCleaningJobStatusResponse).cleaningJob;
      setCleaningJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: updatedJob.assignedProvider ?? null,
              }
            : job
        )
      );
    } catch {
      setProviderAssignmentError("Failed to assign cleaning job provider.");
    } finally {
      setUpdatingProviderJobId("");
    }
  }

  async function handleLoadCleanerSchedule(providerId: string) {
    setSelectedCleanerScheduleProviderId(providerId);
    setLoadingCleanerSchedule(true);
    setCleanerScheduleError("");
    setCleanerScheduleJobs([]);

    if (!providerId) {
      setLoadingCleanerSchedule(false);
      return;
    }

    try {
      const response = await fetch(`/api/service-providers/${providerId}/cleaning-jobs`);
      const data = (await response.json()) as
        | ServiceProviderCleaningJobsResponse
        | CalendarSyncError;

      if (!response.ok) {
        setCleanerScheduleError(
          (data as CalendarSyncError).error || "Failed to load assigned cleaning jobs."
        );
        return;
      }

      setCleanerScheduleJobs((data as ServiceProviderCleaningJobsResponse).cleaningJobs);
    } catch {
      setCleanerScheduleError("Failed to load assigned cleaning jobs.");
    } finally {
      setLoadingCleanerSchedule(false);
    }
  }

  async function handleUpdateCleanerScheduleJobStatus(jobId: string, status: string) {
    setUpdatingCleanerScheduleJobId(jobId);
    setCleanerScheduleStatusError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as
        | UpdateCleaningJobStatusResponse
        | CalendarSyncError;

      if (!response.ok) {
        setCleanerScheduleStatusError(
          (data as CalendarSyncError).error || "Failed to update cleaning job status."
        );
        return;
      }

      const updatedJob = (data as UpdateCleaningJobStatusResponse).cleaningJob;

      setCleanerScheduleJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                property: job.property,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
              }
            : job
        )
      );

      setCleaningJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: updatedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );
    } catch {
      setCleanerScheduleStatusError("Failed to update cleaning job status.");
    } finally {
      setUpdatingCleanerScheduleJobId("");
    }
  }

  async function handleUpdateCleaningJobNotes(jobId: string, notes: string | null) {
    setUpdatingNotesJobId(jobId);
    setCleaningJobNotesError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/notes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });

      const data = (await response.json()) as
        | UpdateCleaningJobNotesResponse
        | CalendarSyncError;

      if (!response.ok) {
        setCleaningJobNotesError(
          (data as CalendarSyncError).error || "Failed to update cleaning job notes."
        );
        return;
      }

      const updatedJob = (data as UpdateCleaningJobNotesResponse).cleaningJob;

      setCleaningJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: updatedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      setCleanerScheduleJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                property: updatedJob.property ?? job.property,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
              }
            : job
        )
      );
    } catch {
      setCleaningJobNotesError("Failed to update cleaning job notes.");
    } finally {
      setUpdatingNotesJobId("");
    }
  }

  async function handleUpdateCleaningJobIssueFlags(
    jobId: string,
    flags: {
      maintenanceNeeded?: boolean;
      restockNeeded?: boolean;
      damageFound?: boolean;
    }
  ) {
    setUpdatingIssueFlagsJobId(jobId);
    setCleaningJobIssueFlagsError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/issue-flags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flags),
      });

      const data = (await response.json()) as
        | UpdateCleaningJobIssueFlagsResponse
        | CalendarSyncError;

      if (!response.ok) {
        setCleaningJobIssueFlagsError(
          (data as CalendarSyncError).error ||
            "Failed to update cleaning job issue flags."
        );
        return;
      }

      const updatedJob = (data as UpdateCleaningJobIssueFlagsResponse).cleaningJob;

      setCleaningJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: updatedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      setCleanerScheduleJobs((previous) =>
        previous.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                property: updatedJob.property ?? job.property,
                calendarEvent: updatedJob.calendarEvent ?? job.calendarEvent,
              }
            : job
        )
      );
    } catch {
      setCleaningJobIssueFlagsError("Failed to update cleaning job issue flags.");
    } finally {
      setUpdatingIssueFlagsJobId("");
    }
  }

  const selectedProperty = properties.find(
    (property) => property.id === selectedPropertyId
  );

  const ownerCalendarJobs: CleanerScheduleJob[] = filteredCleaningJobs.map((job) => ({
    id: job.id,
    propertyId: job.propertyId,
    calendarEventId: job.calendarEventId,
    assignedProviderId: job.assignedProviderId,
    title: job.title,
    scheduledDate: job.scheduledDate,
    status: job.status,
    sourcePlatform: job.sourcePlatform,
    cleaningType: job.cleaningType,
    acceptedAt: job.acceptedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    cancelledAt: job.cancelledAt,
    maintenanceNeeded: job.maintenanceNeeded,
    restockNeeded: job.restockNeeded,
    damageFound: job.damageFound,
    notes: job.notes,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    property: {
      id: selectedPropertyId || "selected-property",
      name: selectedProperty?.name || "Selected property",
      address: selectedProperty?.address || null,
    },
    calendarEvent: job.calendarEvent,
    assignedProvider: job.assignedProvider,
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Project Lakeview</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Owner Dashboard</h1>
        <p className="text-sm text-slate-600">
          Lakeview operations dashboard for properties, calendars, cleaning jobs, and provider workflows.
        </p>
      </header>

      <section className="space-y-4">
        <PropertyForm
          propertyName={propertyName}
          setPropertyName={setPropertyName}
          propertyAddress={propertyAddress}
          setPropertyAddress={setPropertyAddress}
          airbnbCalendarUrl={savedAirbnbCalendarUrl}
          setAirbnbCalendarUrl={setSavedAirbnbCalendarUrl}
          loading={savingProperty}
          onSubmit={handleSaveProperty}
        />

        {propertyError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {propertyError}
          </p>
        ) : null}

        {propertySuccess ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {propertySuccess}
          </p>
        ) : null}

        {savedProperty ? (
          <article className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Saved property</h3>
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Name:</span> {savedProperty.name}
            </p>
            {savedProperty.address ? (
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">Address:</span> {savedProperty.address}
              </p>
            ) : null}
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Airbnb calendar URL:</span>{" "}
              {savedProperty.airbnbCalendarUrl}
            </p>
          </article>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Saved properties</h3>

          {loadingProperties ? (
            <p className="text-sm text-slate-600">Loading saved properties...</p>
          ) : properties.length === 0 ? (
            <p className="text-sm text-slate-600">No saved properties yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {properties.map((property) => (
                <article
                  key={property.id}
                  className={`space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
                    selectedPropertyId === property.id
                      ? "ring-1 ring-slate-300 bg-slate-50"
                      : ""
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{property.name}</p>
                  {property.address ? (
                    <p className="text-sm text-slate-700">{property.address}</p>
                  ) : null}
                  <p className="text-sm text-slate-700">{property.airbnbCalendarUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSyncSavedProperty(property)}
                      disabled={syncingPropertyId === property.id}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {syncingPropertyId === property.id ? "Syncing..." : "Sync calendar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewSavedEvents(property)}
                      disabled={loadingEventsPropertyId === property.id}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingEventsPropertyId === property.id ? "Loading..." : "View saved events"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateCleaningJobs(property)}
                      disabled={generatingJobsPropertyId === property.id}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generatingJobsPropertyId === property.id ? "Generating..." : "Generate cleaning jobs"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Service providers</h3>
            <button
              type="button"
              onClick={() => void loadServiceProviders()}
              disabled={loadingServiceProviders}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingServiceProviders ? "Refreshing..." : "Refresh providers"}
            </button>
          </div>

          <ServiceProviderForm
            providerName={providerName}
            setProviderName={setProviderName}
            companyName={companyName}
            setCompanyName={setCompanyName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            serviceType={serviceType}
            setServiceType={setServiceType}
            notes={providerNotes}
            setNotes={setProviderNotes}
            loading={savingServiceProvider}
            onSubmit={handleSaveServiceProvider}
          />

          {loadingServiceProviders ? (
            <p className="text-sm text-slate-600">Loading service providers...</p>
          ) : null}

          {serviceProviderError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serviceProviderError}
            </p>
          ) : null}

          {serviceProviderSuccess ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {serviceProviderSuccess}
            </p>
          ) : null}

          {!loadingServiceProviders && serviceProviders.length === 0 ? (
            <p className="text-sm text-slate-600">No service providers saved yet.</p>
          ) : null}

          {serviceProviders.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {serviceProviders.map((provider) => (
                <article
                  key={provider.id}
                  className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">{provider.name}</p>
                  {provider.companyName ? (
                    <p className="text-sm text-slate-700">Company: {provider.companyName}</p>
                  ) : null}
                  <p className="text-sm text-slate-700">Service type: {provider.serviceType}</p>
                  {provider.email ? (
                    <p className="text-sm text-slate-700">Email: {provider.email}</p>
                  ) : null}
                  {provider.phone ? (
                    <p className="text-sm text-slate-700">Phone: {provider.phone}</p>
                  ) : null}
                  {provider.notes ? (
                    <p className="text-sm text-slate-700">Notes: {provider.notes}</p>
                  ) : null}
                  <p className="text-sm text-slate-700">
                    Status: {provider.active ? "Active" : "Inactive"}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-2">
          {selectedProperty ? (
            <p className="text-sm text-slate-700">
              Showing calendar for: <span className="font-semibold">{selectedProperty.name}</span>
            </p>
          ) : null}
          <h3 className="text-sm font-semibold text-slate-900">Upcoming stays</h3>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {items.length > 0 ? (
          <>
            <p className="text-sm font-medium text-slate-700">
              Loaded {items.length} {items.length === 1 ? "event" : "events"}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <CalendarEventCard key={item.id} item={item} />
              ))}
            </div>
          </>
        ) : null}

        {!loading && items.length === 0 ? (
          <EmptyState message="No events loaded yet." />
        ) : null}

        <section className="space-y-3">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">Job summary</h4>
              <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setFutureSummaryRange(7)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                    futureSummaryRange === 7
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Next 7 days
                </button>
                <button
                  type="button"
                  onClick={() => setFutureSummaryRange(30)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                    futureSummaryRange === 30
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Next 30 days
                </button>
                <button
                  type="button"
                  onClick={() => setFutureSummaryRange(90)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                    futureSummaryRange === 90
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Next 90 days
                </button>
              </div>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Future jobs</h5>
                <p className="text-xs font-medium text-slate-600">Next {futureSummaryRange} days</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_all")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_all"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total future</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{totalFutureJobs}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_needs_assignment")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_needs_assignment"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : futureNeedsAssignment > 0
                        ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50/80"
                        : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Needs assignment</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureNeedsAssignment}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_assigned")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_assigned"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureAssigned}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_declined")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_declined"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : futureDeclined > 0
                        ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50/80"
                        : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Declined</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureDeclined}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_accepted")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_accepted"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Accepted</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureAccepted}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_in_progress")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_in_progress"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In progress</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureInProgress}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_cancelled")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_cancelled"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cancelled</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureCancelled}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("future_issues")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "future_issues"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : futureWithIssues > 0
                        ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50/80"
                        : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">With issues</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{futureWithIssues}</p>
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Past jobs</h5>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("past_all")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "past_all"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total past</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{totalPastJobs}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("past_completed")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "past_completed"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{pastCompleted}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("past_not_completed")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "past_not_completed"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Not completed</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{pastNotCompleted}</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerActiveQueue("past_issues")}
                  className={`rounded-lg border bg-white p-3 text-left transition ${
                    ownerActiveQueue === "past_issues"
                      ? "border-slate-300 ring-2 ring-slate-300"
                      : pastWithIssues > 0
                        ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50/80"
                        : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Had issues</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{pastWithIssues}</p>
                </button>
              </div>
            </section>
          </section>

          <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">Issue summary</h4>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setOwnerActiveQueue("issues_all")}
                className={`rounded-lg border bg-white p-3 text-left transition ${
                  ownerActiveQueue === "issues_all"
                    ? "border-slate-300 ring-2 ring-slate-300"
                    : "border-amber-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total issues</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{jobsWithIssues.length}</p>
              </button>
              <button
                type="button"
                onClick={() => setOwnerActiveQueue("issues_maintenance")}
                className={`rounded-lg border bg-white p-3 text-left transition ${
                  ownerActiveQueue === "issues_maintenance"
                    ? "border-slate-300 ring-2 ring-slate-300"
                    : "border-amber-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Maintenance</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{maintenanceJobs.length}</p>
              </button>
              <button
                type="button"
                onClick={() => setOwnerActiveQueue("issues_restock")}
                className={`rounded-lg border bg-white p-3 text-left transition ${
                  ownerActiveQueue === "issues_restock"
                    ? "border-slate-300 ring-2 ring-slate-300"
                    : "border-amber-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Restock</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{restockJobs.length}</p>
              </button>
              <button
                type="button"
                onClick={() => setOwnerActiveQueue("issues_damage")}
                className={`rounded-lg border bg-white p-3 text-left transition ${
                  ownerActiveQueue === "issues_damage"
                    ? "border-slate-300 ring-2 ring-slate-300"
                    : "border-amber-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Damage</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{damageJobs.length}</p>
              </button>
            </div>

            {jobsWithIssues.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700">
                No issues flagged for this property.
              </p>
            ) : null}
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-900">Owner job queue</h4>

            {ownerActiveQueue === "none" ? (
              <p className="text-sm text-slate-600">
                Select a summary card above to open a focused job queue.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h5 className="text-sm font-semibold text-slate-900">{ownerQueueMeta.title}</h5>
                    <p className="text-sm text-slate-600">{ownerQueueMeta.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOwnerActiveQueue("none")}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Clear queue
                  </button>
                </div>

                {ownerQueueJobs.length === 0 ? (
                  <p className="text-sm text-slate-600">No jobs in this queue.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {ownerQueueJobs.map((job) => (
                      <CleaningJobCard
                        key={`queue-${ownerActiveQueue}-${job.id}`}
                        job={job}
                        onStatusChange={handleUpdateCleaningJobStatus}
                        statusUpdating={updatingCleaningJobId === job.id}
                        cleanerProviders={cleanerProviders}
                        onProviderChange={handleAssignCleaningJobProvider}
                        providerUpdating={updatingProviderJobId === job.id}
                        showCleanerActions={true}
                        onNotesChange={handleUpdateCleaningJobNotes}
                        notesUpdating={updatingNotesJobId === job.id}
                        onIssueFlagsChange={handleUpdateCleaningJobIssueFlags}
                        issueFlagsUpdating={updatingIssueFlagsJobId === job.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Cleaning jobs</h3>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="cleaningJobStatusFilter" className="text-sm text-slate-700">
                Status
              </label>
              <select
                id="cleaningJobStatusFilter"
                value={cleaningJobStatusFilter}
                onChange={(event) => setCleaningJobStatusFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="all">All</option>
                <option value="needs_assignment">Needs assignment</option>
                <option value="assigned">Assigned</option>
                <option value="declined">Declined</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <label htmlFor="cleaningJobProviderFilter" className="text-sm text-slate-700">
                Cleaner
              </label>
              <select
                id="cleaningJobProviderFilter"
                value={cleaningJobProviderFilter}
                onChange={(event) => setCleaningJobProviderFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="all">All cleaners</option>
                <option value="unassigned">Unassigned</option>
                {cleanerProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.companyName ? `${provider.name} (${provider.companyName})` : provider.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCleaningJobsView("list")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  cleaningJobsView === "list"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setCleaningJobsView("grouped")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  cleaningJobsView === "grouped"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Grouped
              </button>
              <button
                type="button"
                onClick={() => setCleaningJobsView("calendar")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  cleaningJobsView === "calendar"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Calendar
              </button>
            </div>
          </div>

          {cleaningJobGenerationMessage ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {cleaningJobGenerationMessage}
            </p>
          ) : null}

          {loadingCleaningJobsPropertyId ? (
            <p className="text-sm text-slate-600">Loading cleaning jobs...</p>
          ) : null}

          {cleaningJobsError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cleaningJobsError}
            </p>
          ) : null}

          {cleaningJobStatusError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cleaningJobStatusError}
            </p>
          ) : null}

          {providerAssignmentError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {providerAssignmentError}
            </p>
          ) : null}

          {cleaningJobNotesError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cleaningJobNotesError}
            </p>
          ) : null}

          {cleaningJobIssueFlagsError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cleaningJobIssueFlagsError}
            </p>
          ) : null}

          {!loadingCleaningJobsPropertyId && !cleaningJobsError && cleaningJobs.length === 0 ? (
            <p className="text-sm text-slate-600">No cleaning jobs generated yet.</p>
          ) : null}

          {!loadingCleaningJobsPropertyId && !cleaningJobsError && cleaningJobs.length > 0 && filteredCleaningJobs.length === 0 ? (
            <p className="text-sm text-slate-600">No cleaning jobs match this filter.</p>
          ) : null}

          {!loadingCleaningJobsPropertyId && !cleaningJobsError && filteredCleaningJobs.length > 0 ? (
            cleaningJobsView === "list" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredCleaningJobs.map((job) => (
                  <CleaningJobCard
                    key={job.id}
                    job={job}
                    onStatusChange={handleUpdateCleaningJobStatus}
                    statusUpdating={updatingCleaningJobId === job.id}
                    cleanerProviders={cleanerProviders}
                    onProviderChange={handleAssignCleaningJobProvider}
                    providerUpdating={updatingProviderJobId === job.id}
                    showCleanerActions={true}
                    onNotesChange={handleUpdateCleaningJobNotes}
                    notesUpdating={updatingNotesJobId === job.id}
                    onIssueFlagsChange={handleUpdateCleaningJobIssueFlags}
                    issueFlagsUpdating={updatingIssueFlagsJobId === job.id}
                  />
                ))}
              </div>
            ) : cleaningJobsView === "grouped" ? (
              <CleaningJobCalendar jobs={filteredCleaningJobs} />
            ) : (
              <ProviderJobCalendar jobs={ownerCalendarJobs} />
            )
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Cleaner schedule preview</h3>
          <p className="text-sm text-slate-600">
            Select a cleaner to preview their assigned cleaning schedule.
          </p>

          <div className="max-w-sm space-y-1">
            <label htmlFor="cleanerScheduleProvider" className="block text-sm font-medium text-slate-700">
              Cleaner
            </label>
            <select
              id="cleanerScheduleProvider"
              value={selectedCleanerScheduleProviderId}
              onChange={(event) => {
                void handleLoadCleanerSchedule(event.target.value);
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
            >
              <option value="">Select cleaner</option>
              {cleanerProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.companyName
                    ? `${provider.name} (${provider.companyName})`
                    : provider.name}
                </option>
              ))}
            </select>
          </div>

          {loadingCleanerSchedule ? (
            <p className="text-sm text-slate-600">Loading cleaner schedule...</p>
          ) : null}

          {cleanerScheduleError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cleanerScheduleError}
            </p>
          ) : null}

          {cleanerScheduleStatusError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cleanerScheduleStatusError}
            </p>
          ) : null}

          {selectedCleanerScheduleProviderId && !loadingCleanerSchedule ? (
            <CleanerSchedule
              jobs={cleanerScheduleJobs}
              onStatusChange={handleUpdateCleanerScheduleJobStatus}
              statusUpdatingJobId={updatingCleanerScheduleJobId}
              onNotesChange={handleUpdateCleaningJobNotes}
              notesUpdatingJobId={updatingNotesJobId}
            />
          ) : null}

          {!selectedCleanerScheduleProviderId ? (
            <p className="text-sm text-slate-600">Select a cleaner to view their assigned jobs.</p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Developer test: manual calendar sync
              </h3>
              <p className="text-sm text-slate-600">
                Use this only to test an Airbnb iCal URL without saving it to a property.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowManualSync((previous) => !previous)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {showManualSync ? "Hide manual sync" : "Show manual sync"}
            </button>
          </div>

          {showManualSync ? (
            <CalendarSyncForm
              calendarUrl={calendarUrl}
              setCalendarUrl={setCalendarUrl}
              loading={loading}
              onSubmit={handleSubmit}
            />
          ) : null}
        </section>
      </section>
    </main>
  );
}
