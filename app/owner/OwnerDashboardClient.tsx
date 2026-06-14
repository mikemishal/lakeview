"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PropertyForm from "@/components/PropertyForm";
import CalendarSyncForm from "@/components/CalendarSyncForm";
import CalendarEventCard from "@/components/CalendarEventCard";
import AdHocJobForm, { type AdHocJobFormPayload } from "@/components/AdHocJobForm";
import CleaningJobCard, { type CleaningJobItem as BaseCleaningJobItem } from "@/components/CleaningJobCard";
import CleaningJobCalendar from "@/components/CleaningJobCalendar";
import CleanerSchedule, { type CleanerScheduleJob } from "@/components/CleanerSchedule";
import ProviderJobCalendar from "@/components/ProviderJobCalendar";
import ServiceProviderForm from "@/components/ServiceProviderForm";
import EmptyState from "@/components/EmptyState";
import NotificationPanel, { type AppNotification } from "@/components/NotificationPanel";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  CalendarEventItem,
  CalendarSyncResponse,
  CalendarSyncError,
} from "@/lib/calendar/calendarTypes";

type CleaningJobItem = BaseCleaningJobItem & {
  ownerSelfAssigned: boolean;
  jobSource: string;
  requestedServiceType: string;
  priority: string;
  dueTime: string | null;
  estimatedDurationMinutes: number | null;
  ownerInstructions: string | null;
};

type SavedProperty = {
  id: string;
  name: string;
  address: string | null;
  airbnbCalendarUrl: string;
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

type PropertyFormState = {
  propertyName: string;
  propertyAddress: string;
  savedAirbnbCalendarUrl: string;
  listingUrl: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  maxGuests: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  floorNumber: string;
  hasElevator: boolean;
  parkingInfo: string;
  accessNotes: string;
  cleaningNotes: string;
  supplyLocation: string;
  laundryLocation: string;
  trashInstructions: string;
  petInfo: string;
  providerInstructions: string;
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
  primaryServiceType: string | null;
  notes: string | null;
  active: boolean;
  baseAddress: string | null;
  baseCity: string | null;
  baseState: string | null;
  baseZipCode: string | null;
  serviceRadiusMiles: number | null;
  serviceAreaNotes: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  baseRateCents: number | null;
  hourlyRateCents: number | null;
  capabilities: {
    id: string;
    providerId: string;
    serviceType: string;
    active: boolean;
  }[];
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

type NotificationsResponse = {
  notifications: AppNotification[];
};

type OwnerProfileSummary = {
  id: string;
  name: string;
  companyName: string | null;
};

type AccountProfileSummary = {
  id: string;
  inviteCodeVerified: boolean;
};

type OnboardingProfileResponse = {
  accountProfile: AccountProfileSummary | null;
  ownerProfile: OwnerProfileSummary | null;
  serviceProvider: { id: string } | null;
};

type CurrentOwnerResponse = {
  ownerProfile: OwnerProfileSummary | null;
};

type FocusedOwnerCleaningJobResponse = {
  cleaningJob: CleaningJobItem & {
    property?: CleanerScheduleJob["property"];
  };
};

type OwnerActiveQueue =
  | "none"
  | "notification_job"
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

type OwnerDashboardTab =
  | "overview"
  | "jobs"
  | "calendar"
  | "properties"
  | "providers"
  | "developer";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  restock: "Restock",
  inspection: "Inspection",
  laundry: "Laundry",
  trash_removal: "Trash removal",
};

function normalizeProviderServiceType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "cleaner") {
    return "cleaning";
  }

  return normalized;
}

function formatServiceTypeLabel(value: string | null | undefined): string {
  const normalized = normalizeProviderServiceType(value);
  return SERVICE_TYPE_LABELS[normalized] ?? normalized;
}

function formatCentsToDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return "";
  }

  return `$${(cents / 100).toFixed(2)}`;
}

function providerCanClean(provider: ServiceProvider): boolean {
  const legacyType = normalizeProviderServiceType(provider.serviceType);
  const primaryType = normalizeProviderServiceType(provider.primaryServiceType);
  const hasCleaningCapability = provider.capabilities.some(
    (capability) => capability.active && normalizeProviderServiceType(capability.serviceType) === "cleaning"
  );

  return legacyType === "cleaning" || primaryType === "cleaning" || hasCleaningCapability;
}

function parseDollarStringToCents(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return "invalid";
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return "invalid";
  }

  return Math.round(parsed * 100);
}

function parseNullableFloatString(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return "invalid";
  }

  return parsed;
}

function parseNullableIntString(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^-?\d+$/.test(trimmed)) {
    return "invalid";
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : "invalid";
}

function formatBedroomBathroomSummary(property: SavedProperty): string {
  const bedroomsLabel = property.bedrooms !== null ? `${property.bedrooms} bd` : "";
  const bathroomsLabel = property.bathrooms !== null ? `${property.bathrooms} ba` : "";
  return [bedroomsLabel, bathroomsLabel].filter((value) => value.length > 0).join(" / ");
}

function propertyToFormState(property: SavedProperty): PropertyFormState {
  return {
    propertyName: property.name,
    propertyAddress: property.address ?? "",
    savedAirbnbCalendarUrl: property.airbnbCalendarUrl,
    listingUrl: property.listingUrl ?? "",
    propertyType: property.propertyType ?? "",
    bedrooms: property.bedrooms !== null ? String(property.bedrooms) : "",
    bathrooms: property.bathrooms !== null ? String(property.bathrooms) : "",
    squareFeet: property.squareFeet !== null ? String(property.squareFeet) : "",
    maxGuests: property.maxGuests !== null ? String(property.maxGuests) : "",
    defaultCheckInTime: property.defaultCheckInTime ?? "",
    defaultCheckOutTime: property.defaultCheckOutTime ?? "",
    floorNumber: property.floorNumber ?? "",
    hasElevator: property.hasElevator,
    parkingInfo: property.parkingInfo ?? "",
    accessNotes: property.accessNotes ?? "",
    cleaningNotes: property.cleaningNotes ?? "",
    supplyLocation: property.supplyLocation ?? "",
    laundryLocation: property.laundryLocation ?? "",
    trashInstructions: property.trashInstructions ?? "",
    petInfo: property.petInfo ?? "",
    providerInstructions: property.providerInstructions ?? "",
  };
}

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

function formatLongDateLabel(value: string | Date): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return trimmed;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return trimmed;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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

const POLLING_INTERVAL_MS = 10_000;

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDevelopment = process.env.NODE_ENV !== "production";

  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [savedAirbnbCalendarUrl, setSavedAirbnbCalendarUrl] = useState("");
  const [listingUrl, setListingUrl] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [defaultCheckInTime, setDefaultCheckInTime] = useState("");
  const [defaultCheckOutTime, setDefaultCheckOutTime] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [hasElevator, setHasElevator] = useState(false);
  const [parkingInfo, setParkingInfo] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [supplyLocation, setSupplyLocation] = useState("");
  const [laundryLocation, setLaundryLocation] = useState("");
  const [trashInstructions, setTrashInstructions] = useState("");
  const [petInfo, setPetInfo] = useState("");
  const [providerInstructions, setProviderInstructions] = useState("");
  const [savingProperty, setSavingProperty] = useState(false);
  const [savedProperty, setSavedProperty] = useState<SavedProperty | null>(null);
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyError, setPropertyError] = useState("");
  const [propertySuccess, setPropertySuccess] = useState("");
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingPropertyForm, setEditingPropertyForm] = useState<PropertyFormState>({
    propertyName: "",
    propertyAddress: "",
    savedAirbnbCalendarUrl: "",
    listingUrl: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    maxGuests: "",
    defaultCheckInTime: "",
    defaultCheckOutTime: "",
    floorNumber: "",
    hasElevator: false,
    parkingInfo: "",
    accessNotes: "",
    cleaningNotes: "",
    supplyLocation: "",
    laundryLocation: "",
    trashInstructions: "",
    petInfo: "",
    providerInstructions: "",
  });
  const [updatingProperty, setUpdatingProperty] = useState(false);
  const [updatePropertyError, setUpdatePropertyError] = useState("");
  const [updatePropertySuccess, setUpdatePropertySuccess] = useState("");

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
  const [selfAssigningJobId, setSelfAssigningJobId] = useState("");
  const [ownerSelfAssignError, setOwnerSelfAssignError] = useState("");
  const [creatingAdHocJob, setCreatingAdHocJob] = useState(false);
  const [adHocJobError, setAdHocJobError] = useState("");
  const [adHocJobSuccess, setAdHocJobSuccess] = useState("");
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
  const [capabilities, setCapabilities] = useState<string[]>(["cleaning"]);
  const [primaryServiceType, setPrimaryServiceType] = useState("cleaning");
  const [baseAddress, setBaseAddress] = useState("");
  const [baseCity, setBaseCity] = useState("");
  const [baseState, setBaseState] = useState("");
  const [baseZipCode, setBaseZipCode] = useState("");
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState("");
  const [serviceAreaNotes, setServiceAreaNotes] = useState("");
  const [baseRateDollars, setBaseRateDollars] = useState("");
  const [hourlyRateDollars, setHourlyRateDollars] = useState("");
  const [providerNotes, setProviderNotes] = useState("");

  const [updatingProviderJobId, setUpdatingProviderJobId] = useState("");
  const [providerAssignmentError, setProviderAssignmentError] = useState("");
  const [selectedCleanerScheduleProviderId, setSelectedCleanerScheduleProviderId] =
    useState("");
  const [cleanerScheduleJobs, setCleanerScheduleJobs] = useState<CleanerScheduleJob[]>([]);
  const [loadingCleanerSchedule, setLoadingCleanerSchedule] = useState(false);
  const [cleanerScheduleError, setCleanerScheduleError] = useState("");
  const [updatingNotesJobId, setUpdatingNotesJobId] = useState("");
  const [cleaningJobNotesError, setCleaningJobNotesError] = useState("");
  const [updatingIssueFlagsJobId, setUpdatingIssueFlagsJobId] = useState("");
  const [cleaningJobIssueFlagsError, setCleaningJobIssueFlagsError] = useState("");
  const [ownerNotifications, setOwnerNotifications] = useState<AppNotification[]>([]);
  const [loadingOwnerNotifications, setLoadingOwnerNotifications] = useState(true);
  const [ownerNotificationsError, setOwnerNotificationsError] = useState("");
  const [currentAccountProfile, setCurrentAccountProfile] =
    useState<AccountProfileSummary | null>(null);
  const [loadingOwnerAccess, setLoadingOwnerAccess] = useState(true);
  const [currentOwnerProfile, setCurrentOwnerProfile] = useState<OwnerProfileSummary | null>(null);
  const [currentServiceProvider, setCurrentServiceProvider] = useState<{ id: string } | null>(null);
  const [claimingLegacyProperties, setClaimingLegacyProperties] = useState(false);
  const [legacyPropertiesClaimMessage, setLegacyPropertiesClaimMessage] = useState("");
  const [legacyPropertiesClaimError, setLegacyPropertiesClaimError] = useState("");
  const [focusedOwnerNotificationJob, setFocusedOwnerNotificationJob] =
    useState<CleaningJobItem | null>(null);
  const [loadingFocusedOwnerNotificationJob, setLoadingFocusedOwnerNotificationJob] =
    useState(false);
  const [focusedOwnerNotificationJobError, setFocusedOwnerNotificationJobError] = useState("");
  const ownerRefreshInFlightRef = useRef(false);
  const adHocJobFormRef = useRef<HTMLDivElement | null>(null);
  const [adHocJobFocusToken, setAdHocJobFocusToken] = useState(0);
  const inviteCodeBlocked = Boolean(
    currentAccountProfile && !currentAccountProfile.inviteCodeVerified
  );

  function isValidOwnerTab(value: string | null): value is OwnerDashboardTab {
    return (
      value === "overview" ||
      value === "jobs" ||
      value === "calendar" ||
      value === "properties" ||
      value === "providers" ||
      (isDevelopment && value === "developer")
    );
  }

  const ownerTabParam = searchParams.get("tab");
  const ownerActiveTab: OwnerDashboardTab = isValidOwnerTab(ownerTabParam)
    ? ownerTabParam
    : "overview";

  const updateOwnerTab = useCallback(
    (nextTab: OwnerDashboardTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);

      const queryString = params.toString();
      router.replace(queryString ? `/owner?${queryString}` : "/owner", { scroll: false });
    },
    [router, searchParams]
  );

  const cleanerProviders = serviceProviders
    .filter((provider) => provider.active && providerCanClean(provider))
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
  const todayJobs = cleaningJobs.filter((job) => toDateOnly(job.scheduledDate) === todayDateOnly);
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
  const ownerGreetingName = currentOwnerProfile?.name?.trim() ?? "";
  const ownerGreeting = ownerGreetingName ? `Good morning, ${ownerGreetingName}` : "Good morning, there";
  const todayLongDate = formatLongDateLabel(new Date());
  const nextCheckoutJob = futureJobsAll
    .filter((job) => job.status !== "cancelled" && job.status !== "completed")
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
  const nextCheckoutPropertyName = nextCheckoutJob
    ? properties.find((property) => property.id === nextCheckoutJob.propertyId)?.name || nextCheckoutJob.title
    : "";
  const nextCheckoutDate = nextCheckoutJob ? formatLongDateLabel(nextCheckoutJob.scheduledDate) : "";
  const nextCheckoutTime = nextCheckoutJob ? formatTimeLabel(nextCheckoutJob.dueTime) : "";
  const nextCheckoutProviderLabel = nextCheckoutJob
    ? nextCheckoutJob.assignedProvider
      ? nextCheckoutJob.assignedProvider.companyName
        ? `${nextCheckoutJob.assignedProvider.name} (${nextCheckoutJob.assignedProvider.companyName})`
        : nextCheckoutJob.assignedProvider.name
      : nextCheckoutJob.ownerSelfAssigned
      ? "Self-assigned by owner"
      : "Unassigned"
    : "";
  const nextCheckoutNeedsAssignment = Boolean(
    nextCheckoutJob && !nextCheckoutJob.assignedProviderId && !nextCheckoutJob.ownerSelfAssigned
  );
  const ownerNotificationJobQueue = focusedOwnerNotificationJob
    ? [focusedOwnerNotificationJob]
    : [];

  const ownerQueueJobs = (() => {
    if (ownerActiveQueue === "notification_job") {
      return ownerNotificationJobQueue;
    }
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
    if (ownerActiveQueue === "notification_job") {
      return {
        title: "Notification job",
        description: "This job was opened from a notification.",
      };
    }
    if (ownerActiveQueue === "future_all") {
      return {
        title: "Future jobs",
        description: `All jobs scheduled in the next ${futureSummaryRange} days.`,
      };
    }
    if (ownerActiveQueue === "future_needs_assignment") {
      return {
        title: "Needs provider",
        description: "Future jobs that still need a provider.",
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

  const loadCleaningJobsForProperty = useCallback(
    async (propertyId: string, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        setLoadingCleaningJobsPropertyId(propertyId);
        setCleaningJobsError("");
        setOwnerActiveQueue("none");
        setFocusedOwnerNotificationJob(null);
        setLoadingFocusedOwnerNotificationJob(false);
        setFocusedOwnerNotificationJobError("");
      }

      try {
        const response = await fetch(`/api/properties/${propertyId}/cleaning-jobs`);
        const data = (await response.json()) as
          | PropertyCleaningJobsResponse
          | CalendarSyncError;

        if (!response.ok) {
          const message =
            (data as CalendarSyncError).error || "Failed to load cleaning jobs.";

          if (silent) {
            console.error(message);
          } else {
            setCleaningJobsError(message);
          }
          return;
        }

        setCleaningJobs((data as PropertyCleaningJobsResponse).cleaningJobs);
      } catch {
        if (silent) {
          console.error("Failed to load cleaning jobs.");
        } else {
          setCleaningJobsError("Failed to load cleaning jobs.");
        }
      } finally {
        if (!silent) {
          setLoadingCleaningJobsPropertyId("");
        }
      }
    },
    []
  );

  async function handleCreateAdHocJob(payload: AdHocJobFormPayload) {
    setCreatingAdHocJob(true);
    setAdHocJobError("");
    setAdHocJobSuccess("");

    try {
      const response = await fetch("/api/jobs/ad-hoc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as
        | { cleaningJob: CleaningJobItem }
        | CalendarSyncError;

      if (!response.ok) {
        const message = (data as CalendarSyncError).error || "Failed to create ad hoc job.";
        setAdHocJobError(message);
        throw new Error(message);
      }

      const createdJob = (data as { cleaningJob: CleaningJobItem }).cleaningJob;
      setAdHocJobSuccess("Ad hoc job created.");

      if (!selectedPropertyId) {
        setSelectedPropertyId(createdJob.propertyId);
      }

      if (!selectedPropertyId || selectedPropertyId === createdJob.propertyId) {
        await loadCleaningJobsForProperty(createdJob.propertyId, { silent: true });
      }

      setCleaningJobs((previous) => {
        if (selectedPropertyId && selectedPropertyId !== createdJob.propertyId) {
          return previous;
        }

        return previous.some((job) => job.id === createdJob.id)
          ? previous.map((job) => (job.id === createdJob.id ? createdJob : job))
          : [createdJob, ...previous];
      });
    } catch (error) {
      if (error instanceof Error && error.message) {
        setAdHocJobError(error.message);
      } else {
        setAdHocJobError("Failed to create ad hoc job.");
      }
      throw error;
    } finally {
      setCreatingAdHocJob(false);
    }
  }

  const loadOwnerNotifications = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!currentOwnerProfile) {
      if (!silent) {
        setLoadingOwnerNotifications(false);
        setOwnerNotificationsError("");
      }
      return;
    }

    if (!silent) {
      setLoadingOwnerNotifications(true);
      setOwnerNotificationsError("");
    }

    try {
      const response = await fetch("/api/notifications?audienceType=owner&unreadOnly=true");
      const data = (await response.json()) as NotificationsResponse | CalendarSyncError;

      if (!response.ok) {
        const message = (data as CalendarSyncError).error || "Failed to load notifications.";

        if (silent) {
          if (!(response.status === 403 && message === "Owner profile is required.")) {
            console.error(message);
          }
        } else {
          setOwnerNotificationsError(message);
        }
        return;
      }

      setOwnerNotifications((data as NotificationsResponse).notifications);
    } catch {
      if (silent) {
        console.error("Failed to load notifications.");
      } else {
        setOwnerNotificationsError("Failed to load notifications.");
      }
    } finally {
      if (!silent) {
        setLoadingOwnerNotifications(false);
      }
    }
  }, [currentOwnerProfile]);

  const loadProperties = useCallback(async () => {
    if (!currentOwnerProfile) {
      setLoadingProperties(false);
      return;
    }

    setLoadingProperties(true);
    setPropertyError("");

    try {
      const propertiesResponse = await fetch("/api/properties");
      const propertiesData = (await propertiesResponse.json()) as
        | LoadPropertiesResponse
        | SavePropertyError;

      if (!propertiesResponse.ok) {
        setPropertyError(
          (propertiesData as SavePropertyError).error || "Failed to load properties."
        );
        return;
      }

      const loadedProperties = (propertiesData as LoadPropertiesResponse).properties;
      setProperties(loadedProperties);

      if (loadedProperties.length === 0) {
        return;
      }

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

        if (!eventsResponse.ok) {
          setError(
            (eventsData as CalendarSyncError).error || "Unable to load saved events."
          );
        } else {
          setItems(
            mapDbEventsToCalendarItems((eventsData as PropertyEventsResponse).events)
          );
          void loadCleaningJobsForProperty(firstProperty.id);
        }
      } catch {
        setError("Unable to load saved events.");
      } finally {
        setLoadingEventsPropertyId("");
      }
    } catch {
      setPropertyError("Failed to load properties.");
    } finally {
      setLoadingProperties(false);
    }
  }, [currentOwnerProfile, loadCleaningJobsForProperty]);

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
      try {
        const [currentOwnerResponse, onboardingResponse] = await Promise.all([
          fetch("/api/current-owner"),
          fetch("/api/onboarding/profile"),
        ]);

        let resolvedOwnerProfile: OwnerProfileSummary | null = null;

        if (currentOwnerResponse.ok) {
          const currentOwnerData = (await currentOwnerResponse.json()) as CurrentOwnerResponse;
          resolvedOwnerProfile = currentOwnerData.ownerProfile;
        }

        const onboardingData = (await onboardingResponse.json()) as
          | OnboardingProfileResponse
          | CalendarSyncError;

        if (!isActive) {
          return;
        }

        if (!onboardingResponse.ok) {
          setCurrentAccountProfile(null);
          setCurrentServiceProvider(null);
        } else {
          setCurrentAccountProfile((onboardingData as OnboardingProfileResponse).accountProfile);
          setCurrentServiceProvider((onboardingData as OnboardingProfileResponse).serviceProvider);
        }

        if (!resolvedOwnerProfile && onboardingResponse.ok) {
          resolvedOwnerProfile = (onboardingData as OnboardingProfileResponse).ownerProfile;
        }

        setCurrentOwnerProfile(resolvedOwnerProfile);
      } catch {
        if (isActive) {
          setCurrentAccountProfile(null);
          setCurrentOwnerProfile(null);
          setCurrentServiceProvider(null);
        }
      } finally {
        if (isActive) {
          setLoadingOwnerAccess(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadOwnerDashboardData() {
      if (!currentOwnerProfile || inviteCodeBlocked) {
        if (isActive) {
          setLoadingProperties(false);
          setLoadingOwnerNotifications(false);
          setLoadingServiceProviders(false);
        }
        return;
      }

      if (!isActive) {
        return;
      }

      void loadProperties();
      void loadServiceProviders();
      void loadOwnerNotifications();
    }

    void loadOwnerDashboardData();

    return () => {
      isActive = false;
    };
  }, [
    currentOwnerProfile,
    inviteCodeBlocked,
    loadOwnerNotifications,
    loadProperties,
    loadServiceProviders,
  ]);

  const refreshOwnerDashboardData = useCallback(async () => {
    if (!currentOwnerProfile || inviteCodeBlocked || ownerRefreshInFlightRef.current) {
      return;
    }

    ownerRefreshInFlightRef.current = true;

    try {
      await loadOwnerNotifications({ silent: true });

      if (selectedPropertyId) {
        await loadCleaningJobsForProperty(selectedPropertyId, { silent: true });
      }

      if (focusedOwnerNotificationJob?.id) {
        try {
          const response = await fetch(`/api/cleaning-jobs/${focusedOwnerNotificationJob.id}`);
          const data = (await response.json()) as FocusedOwnerCleaningJobResponse | CalendarSyncError;

          if (!response.ok) {
            console.error((data as CalendarSyncError).error || "Failed to load cleaning job.");
          } else {
            const refreshedJob = (data as FocusedOwnerCleaningJobResponse).cleaningJob;
            setFocusedOwnerNotificationJob(refreshedJob);
            setCleaningJobs((previous) =>
              previous.map((job) =>
                job.id === refreshedJob.id
                  ? {
                      ...job,
                      ...refreshedJob,
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
      ownerRefreshInFlightRef.current = false;
    }
  }, [
    currentOwnerProfile,
    focusedOwnerNotificationJob?.id,
    inviteCodeBlocked,
    loadCleaningJobsForProperty,
    loadOwnerNotifications,
    selectedPropertyId,
  ]);

  useEffect(() => {
    if (!currentOwnerProfile || inviteCodeBlocked) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshOwnerDashboardData();
    }, POLLING_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    currentOwnerProfile,
    focusedOwnerNotificationJob?.id,
    inviteCodeBlocked,
    refreshOwnerDashboardData,
    selectedPropertyId,
  ]);

  useEffect(() => {
    if (ownerActiveTab !== "jobs" || adHocJobFocusToken === 0) {
      return;
    }

    const formElement = adHocJobFormRef.current;
    if (!formElement) {
      return;
    }

    formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    const focusable = formElement.querySelector("input, select, textarea, button") as HTMLElement | null;
    focusable?.focus();
  }, [adHocJobFocusToken, ownerActiveTab]);

  async function handleSaveServiceProvider() {
    setSavingServiceProvider(true);
    setServiceProviderError("");
    setServiceProviderSuccess("");

    try {
      const baseRateCents = parseDollarStringToCents(baseRateDollars);
      const hourlyRateCents = parseDollarStringToCents(hourlyRateDollars);

      if (baseRateCents === "invalid" || hourlyRateCents === "invalid") {
        setServiceProviderError("Please enter valid dollar amounts for pricing fields.");
        return;
      }

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
          serviceType: primaryServiceType,
          primaryServiceType,
          capabilities,
          notes: providerNotes,
          baseAddress,
          baseCity,
          baseState,
          baseZipCode,
          serviceRadiusMiles,
          serviceAreaNotes,
          baseRateCents,
          hourlyRateCents,
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
      setCapabilities(["cleaning"]);
      setPrimaryServiceType("cleaning");
      setBaseAddress("");
      setBaseCity("");
      setBaseState("");
      setBaseZipCode("");
      setServiceRadiusMiles("");
      setServiceAreaNotes("");
      setBaseRateDollars("");
      setHourlyRateDollars("");
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
      const parsedBedrooms = parseNullableFloatString(bedrooms);
      const parsedBathrooms = parseNullableFloatString(bathrooms);
      const parsedSquareFeet = parseNullableIntString(squareFeet);
      const parsedMaxGuests = parseNullableIntString(maxGuests);

      if (
        parsedBedrooms === "invalid" ||
        parsedBathrooms === "invalid" ||
        parsedSquareFeet === "invalid" ||
        parsedMaxGuests === "invalid"
      ) {
        setPropertyError("Invalid property numeric field value.");
        return;
      }

      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: propertyName,
          address: propertyAddress,
          airbnbCalendarUrl: savedAirbnbCalendarUrl,
          listingUrl,
          propertyType,
          bedrooms: parsedBedrooms,
          bathrooms: parsedBathrooms,
          squareFeet: parsedSquareFeet,
          maxGuests: parsedMaxGuests,
          defaultCheckInTime,
          defaultCheckOutTime,
          floorNumber,
          hasElevator,
          parkingInfo,
          accessNotes,
          cleaningNotes,
          supplyLocation,
          laundryLocation,
          trashInstructions,
          petInfo,
          providerInstructions,
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
      setListingUrl("");
      setPropertyType("");
      setBedrooms("");
      setBathrooms("");
      setSquareFeet("");
      setMaxGuests("");
      setDefaultCheckInTime("");
      setDefaultCheckOutTime("");
      setFloorNumber("");
      setHasElevator(false);
      setParkingInfo("");
      setAccessNotes("");
      setCleaningNotes("");
      setSupplyLocation("");
      setLaundryLocation("");
      setTrashInstructions("");
      setPetInfo("");
      setProviderInstructions("");
    } catch {
      setPropertyError("Failed to create property.");
    } finally {
      setSavingProperty(false);
    }
  }

  function handleStartEditingProperty(property: SavedProperty) {
    setEditingPropertyId(property.id);
    setEditingPropertyForm(propertyToFormState(property));
    setUpdatePropertyError("");
    setUpdatePropertySuccess("");
  }

  function handleCancelEditingProperty() {
    setEditingPropertyId(null);
    setUpdatePropertyError("");
    setUpdatePropertySuccess("");
  }

  async function handleUpdateProperty() {
    if (!editingPropertyId) {
      return;
    }

    setUpdatingProperty(true);
    setUpdatePropertyError("");
    setUpdatePropertySuccess("");

    try {
      const parsedBedrooms = parseNullableFloatString(editingPropertyForm.bedrooms);
      const parsedBathrooms = parseNullableFloatString(editingPropertyForm.bathrooms);
      const parsedSquareFeet = parseNullableIntString(editingPropertyForm.squareFeet);
      const parsedMaxGuests = parseNullableIntString(editingPropertyForm.maxGuests);

      if (
        parsedBedrooms === "invalid" ||
        parsedBathrooms === "invalid" ||
        parsedSquareFeet === "invalid" ||
        parsedMaxGuests === "invalid"
      ) {
        setUpdatePropertyError("Invalid property numeric field value.");
        return;
      }

      const response = await fetch(`/api/properties/${editingPropertyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingPropertyForm.propertyName,
          address: editingPropertyForm.propertyAddress,
          airbnbCalendarUrl: editingPropertyForm.savedAirbnbCalendarUrl,
          listingUrl: editingPropertyForm.listingUrl,
          propertyType: editingPropertyForm.propertyType,
          bedrooms: parsedBedrooms,
          bathrooms: parsedBathrooms,
          squareFeet: parsedSquareFeet,
          maxGuests: parsedMaxGuests,
          defaultCheckInTime: editingPropertyForm.defaultCheckInTime,
          defaultCheckOutTime: editingPropertyForm.defaultCheckOutTime,
          floorNumber: editingPropertyForm.floorNumber,
          hasElevator: editingPropertyForm.hasElevator,
          parkingInfo: editingPropertyForm.parkingInfo,
          accessNotes: editingPropertyForm.accessNotes,
          cleaningNotes: editingPropertyForm.cleaningNotes,
          supplyLocation: editingPropertyForm.supplyLocation,
          laundryLocation: editingPropertyForm.laundryLocation,
          trashInstructions: editingPropertyForm.trashInstructions,
          petInfo: editingPropertyForm.petInfo,
          providerInstructions: editingPropertyForm.providerInstructions,
        }),
      });

      const data = (await response.json()) as SavePropertyResponse | SavePropertyError;

      if (!response.ok) {
        setUpdatePropertyError((data as SavePropertyError).error || "Failed to update property.");
        return;
      }

      const updatedProperty = (data as SavePropertyResponse).property;

      setProperties((previous) =>
        previous.map((property) => (property.id === updatedProperty.id ? updatedProperty : property))
      );

      setSavedProperty((previous) =>
        previous && previous.id === updatedProperty.id ? updatedProperty : previous
      );

      setUpdatePropertySuccess("Property updated.");
      setEditingPropertyId(null);
    } catch {
      setUpdatePropertyError("Failed to update property.");
    } finally {
      setUpdatingProperty(false);
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
      void loadCleaningJobsForProperty(property.id);
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
      void loadCleaningJobsForProperty(property.id);
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
      await loadCleaningJobsForProperty(property.id);
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
        body: JSON.stringify({ status, actorType: "owner" }),
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
                assignedProvider: updatedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      setFocusedOwnerNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? currentJob.assignedProvider,
            }
          : currentJob
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

      setFocusedOwnerNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? null,
            }
          : currentJob
      );
    } catch {
      setProviderAssignmentError("Failed to assign cleaning job provider.");
    } finally {
      setUpdatingProviderJobId("");
    }
  }

  async function handleOwnerSelfAssignCleaningJob(jobId: string) {
    setSelfAssigningJobId(jobId);
    setOwnerSelfAssignError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${jobId}/self-assign`, {
        method: "PATCH",
      });

      const data = (await response.json()) as
        | UpdateCleaningJobStatusResponse
        | CalendarSyncError;

      if (!response.ok) {
        setOwnerSelfAssignError(
          (data as CalendarSyncError).error || "Failed to self-assign cleaning job."
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

      setFocusedOwnerNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? null,
            }
          : currentJob
      );
    } catch {
      setOwnerSelfAssignError("Failed to self-assign cleaning job.");
    } finally {
      setSelfAssigningJobId("");
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

      setFocusedOwnerNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? currentJob.assignedProvider,
            }
          : currentJob
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

      setFocusedOwnerNotificationJob((currentJob) =>
        currentJob?.id === jobId
          ? {
              ...currentJob,
              ...updatedJob,
              calendarEvent: updatedJob.calendarEvent ?? currentJob.calendarEvent,
              assignedProvider: updatedJob.assignedProvider ?? currentJob.assignedProvider,
            }
          : currentJob
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

  async function handleMarkOwnerNotificationRead(notificationId: string) {
    setOwnerNotificationsError("");

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      const data = (await response.json()) as
        | { notification: AppNotification }
        | CalendarSyncError;

      if (!response.ok) {
        setOwnerNotificationsError(
          (data as CalendarSyncError).error || "Failed to mark notification as read."
        );
        return;
      }

      setOwnerNotifications((previous) =>
        previous.filter((notification) => notification.id !== notificationId)
      );
    } catch {
      setOwnerNotificationsError("Failed to mark notification as read.");
    }
  }

  async function handleMarkAllOwnerNotificationsRead() {
    setOwnerNotificationsError("");

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audienceType: "owner",
        }),
      });

      const data = (await response.json()) as { updatedCount: number } | CalendarSyncError;

      if (!response.ok) {
        setOwnerNotificationsError(
          (data as CalendarSyncError).error || "Failed to mark notifications as read."
        );
        return;
      }

      setOwnerNotifications([]);
    } catch {
      setOwnerNotificationsError("Failed to mark notifications as read.");
    }
  }

  async function handleOwnerNotificationClick(notification: AppNotification) {
    if (!notification.cleaningJobId) {
      return;
    }

    setOwnerActiveQueue("notification_job");
    setFocusedOwnerNotificationJob(null);
    setLoadingFocusedOwnerNotificationJob(true);
    setFocusedOwnerNotificationJobError("");

    try {
      const response = await fetch(`/api/cleaning-jobs/${notification.cleaningJobId}`);
      const data = (await response.json()) as FocusedOwnerCleaningJobResponse | CalendarSyncError;

      if (!response.ok) {
        setFocusedOwnerNotificationJobError(
          (data as CalendarSyncError).error || "Failed to load cleaning job."
        );
        return;
      }

      const loadedJob = (data as FocusedOwnerCleaningJobResponse).cleaningJob;
      setFocusedOwnerNotificationJob(loadedJob);

      if (loadedJob.propertyId !== selectedPropertyId) {
        setSelectedPropertyId(loadedJob.propertyId);
      }

      setCleaningJobs((previous) =>
        previous.map((job) =>
          job.id === loadedJob.id
            ? {
                ...job,
                ...loadedJob,
                calendarEvent: loadedJob.calendarEvent ?? job.calendarEvent,
                assignedProvider: loadedJob.assignedProvider ?? job.assignedProvider,
              }
            : job
        )
      );

      await handleMarkOwnerNotificationRead(notification.id);
    } catch {
      setFocusedOwnerNotificationJobError("Failed to load cleaning job.");
    } finally {
      setLoadingFocusedOwnerNotificationJob(false);
    }
  }

  async function handleClaimLegacyProperties() {
    setClaimingLegacyProperties(true);
    setLegacyPropertiesClaimError("");
    setLegacyPropertiesClaimMessage("");

    try {
      const response = await fetch("/api/current-owner/claim-legacy-properties", {
        method: "PATCH",
      });
      const data = (await response.json()) as { updatedCount: number } | CalendarSyncError;

      if (!response.ok) {
        setLegacyPropertiesClaimError(
          (data as CalendarSyncError).error || "Failed to claim legacy properties."
        );
        return;
      }

      const updatedCount = (data as { updatedCount: number }).updatedCount;
      setLegacyPropertiesClaimMessage(`Claimed ${updatedCount} legacy properties.`);

      const propertiesResponse = await fetch("/api/properties");
      const propertiesData = (await propertiesResponse.json()) as LoadPropertiesResponse | SavePropertyError;

      if (propertiesResponse.ok) {
        const refreshedProperties = (propertiesData as LoadPropertiesResponse).properties;
        setProperties(refreshedProperties);

        if (!selectedPropertyId && refreshedProperties.length > 0) {
          const firstProperty = refreshedProperties[0];
          setSelectedPropertyId(firstProperty.id);
          void loadCleaningJobsForProperty(firstProperty.id, { silent: true });
        }
      }
    } catch {
      setLegacyPropertiesClaimError("Failed to claim legacy properties.");
    } finally {
      setClaimingLegacyProperties(false);
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
    ownerSelfAssigned: job.ownerSelfAssigned ?? false,
    jobSource: job.jobSource ?? "calendar_sync",
    requestedServiceType: job.requestedServiceType ?? "cleaning",
    priority: job.priority ?? "normal",
    dueTime: job.dueTime ?? null,
    estimatedDurationMinutes: job.estimatedDurationMinutes ?? null,
    ownerInstructions: job.ownerInstructions ?? null,
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
      listingUrl: selectedProperty?.listingUrl || null,
      propertyType: selectedProperty?.propertyType || null,
      bedrooms: selectedProperty?.bedrooms ?? null,
      bathrooms: selectedProperty?.bathrooms ?? null,
      squareFeet: selectedProperty?.squareFeet ?? null,
      maxGuests: selectedProperty?.maxGuests ?? null,
      defaultCheckInTime: selectedProperty?.defaultCheckInTime || null,
      defaultCheckOutTime: selectedProperty?.defaultCheckOutTime || null,
      floorNumber: selectedProperty?.floorNumber || null,
      hasElevator: selectedProperty?.hasElevator ?? false,
      parkingInfo: selectedProperty?.parkingInfo || null,
      accessNotes: selectedProperty?.accessNotes || null,
      cleaningNotes: selectedProperty?.cleaningNotes || null,
      supplyLocation: selectedProperty?.supplyLocation || null,
      laundryLocation: selectedProperty?.laundryLocation || null,
      trashInstructions: selectedProperty?.trashInstructions || null,
      petInfo: selectedProperty?.petInfo || null,
      providerInstructions: selectedProperty?.providerInstructions || null,
    },
    calendarEvent: job.calendarEvent,
    assignedProvider: job.assignedProvider,
  }));
  const ownerJobsTabView = cleaningJobsView === "calendar" ? "grouped" : cleaningJobsView;

  return (
    <>
    <AppHeader
      currentSection="owner"
      roleContext={currentServiceProvider ? "both" : "owner"}
      showProfilesLink
      showOwnerLink={Boolean(currentOwnerProfile && !inviteCodeBlocked)}
      showProviderLink={Boolean(currentOwnerProfile && currentServiceProvider && !inviteCodeBlocked)}
      showPropertiesLink={Boolean(currentOwnerProfile && !inviteCodeBlocked)}
      showJobsLink={Boolean(currentOwnerProfile && !inviteCodeBlocked)}
    />
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-4">
        <section className="overflow-hidden rounded-[14px] border border-[#E5E0D8] bg-[#0D1B2A] p-6 shadow-[0_10px_24px_rgba(13,27,42,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B8860B]">Owner dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#FAF7F2] sm:text-4xl">{ownerGreeting}</h1>
          <p className="mt-2 text-sm text-[#E9DFCF]">{todayLongDate}</p>
          <div className="mt-4 h-px w-20 bg-[#B8860B]/70" aria-hidden="true" />
          {currentOwnerProfile ? (
            <p className="mt-4 text-sm text-[#F5EBDD]">
              Signed in as{" "}
              <span className="font-semibold text-[#FAF7F2]">
                {currentOwnerProfile.companyName
                  ? `${currentOwnerProfile.name} (${currentOwnerProfile.companyName})`
                  : currentOwnerProfile.name}
              </span>
            </p>
          ) : null}
        </section>

        {currentOwnerProfile && !inviteCodeBlocked ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {([
                { id: "overview", label: "Dashboard" },
                { id: "jobs", label: "Jobs" },
                { id: "calendar", label: "Calendar" },
                { id: "properties", label: "Properties" },
                { id: "providers", label: "My Team" },
                ...(isDevelopment ? ([{ id: "developer", label: "Developer" }] as const) : []),
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateOwnerTab(tab.id)}
                  className={`min-h-11 rounded-md px-4 py-2.5 text-sm font-medium transition ${
                    ownerActiveTab === tab.id
                      ? "rounded-full bg-[#B8860B] text-[#0D1B2A]"
                      : "rounded-full border border-[#E5E0D8] bg-white text-[#7A7060] hover:bg-[#FAF7F2] hover:text-[#0D1B2A]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <details className="text-xs text-[#7A7060]">
              <summary className="cursor-pointer select-none">Dashboard tools</summary>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    void refreshOwnerDashboardData();
                  }}
                  className="rounded-md border border-[#E5E0D8] bg-white px-3 py-2 text-xs font-medium text-[#7A7060] transition hover:bg-[#FAF7F2]"
                >
                  Refresh now
                </button>
              </div>
            </details>
          </div>
        ) : null}
      </header>

      {loadingOwnerAccess ? (
        <EmptyState
          variant="loading"
          title="Loading dashboard"
          message="Checking your account access and owner profile."
        />
      ) : !currentAccountProfile ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Account profile required</h2>
          <p className="mt-1 text-sm text-amber-800">
            Complete onboarding to finish account setup before using the Owner Dashboard.
          </p>
          <Link
            href="/onboarding"
            className="mt-3 inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Go to onboarding
          </Link>
        </section>
      ) : inviteCodeBlocked ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Invite code required</h2>
          <p className="mt-1 text-sm text-amber-800">
            Complete onboarding with a valid invite code before using the Owner Dashboard.
          </p>
          <Link
            href="/onboarding"
            className="mt-3 inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Go to onboarding
          </Link>
        </section>
      ) : !currentOwnerProfile ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Owner profile required</h2>
          <p className="mt-1 text-sm text-amber-800">Complete owner onboarding before using the Owner Dashboard.</p>
          <Link
            href="/onboarding"
            className="mt-3 inline-flex rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Go to onboarding
          </Link>
        </section>
      ) : (
        <>
      {ownerActiveTab === "overview" ? (
        <>
          <section className="space-y-6">
            <section className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0D1B2A]">Today at a Glance</p>
              <p className="text-sm text-[#7A7060]">A quick snapshot of today&apos;s owner operations.</p>
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  updateOwnerTab("jobs");
                  setOwnerActiveQueue("future_all");
                }}
                className="rounded-xl border border-[#E5E0D8] border-l-[3px] border-l-[#1A6B60] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Today&apos;s jobs</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{todayJobs.length}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateOwnerTab("jobs");
                  setOwnerActiveQueue("future_needs_assignment");
                }}
                className={`rounded-xl border border-[#E5E0D8] border-l-[3px] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2] ${
                  futureNeedsAssignment > 0 ? "border-l-[#D97706]" : "border-l-[#1A6B60]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Needs assignment</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{futureNeedsAssignment}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateOwnerTab("jobs");
                  setOwnerActiveQueue("issues_all");
                }}
                className={`rounded-xl border border-[#E5E0D8] border-l-[3px] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2] ${
                  jobsWithIssues.length > 0 ? "border-l-red-600" : "border-l-[#1A6B60]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Urgent issues</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{jobsWithIssues.length}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateOwnerTab("jobs");
                  setOwnerActiveQueue("future_all");
                }}
                className="rounded-xl border border-[#E5E0D8] border-l-[3px] border-l-[#1A6B60] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Upcoming jobs</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{futureJobsInRange.length}</p>
              </button>
            </div>

            {nextCheckoutJob ? (
              <section className="rounded-xl border border-[#13293D] bg-[#0D1B2A] p-5 shadow-[0_10px_20px_rgba(13,27,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B8860B]">Next checkout</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-[#FAF7F2]">{nextCheckoutPropertyName}</h3>
                    <p className="text-sm text-[#E9DFCF]">
                      {nextCheckoutDate}
                      {nextCheckoutTime ? ` at ${nextCheckoutTime}` : ""}
                    </p>
                    <p className="text-sm text-[#E9DFCF]">
                      Assignment: <span className="font-medium text-[#FAF7F2]">{nextCheckoutProviderLabel}</span>
                    </p>
                  </div>

                  {nextCheckoutNeedsAssignment ? (
                    <button
                      type="button"
                      onClick={() => {
                        updateOwnerTab("jobs");
                        setOwnerActiveQueue("future_needs_assignment");
                      }}
                      className="min-h-11 rounded-md bg-[#B8860B] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      Assign Now
                    </button>
                  ) : null}
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-[#E5E0D8] bg-white p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <h3 className="text-base font-semibold text-[#1A1208]">Next checkout</h3>
                <p className="mt-1 text-sm text-[#7A7060]">No upcoming checkout jobs yet. Add a property calendar or create a new job to get started.</p>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-[#1A1208]">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    updateOwnerTab("jobs");
                    setAdHocJobFocusToken((previous) => previous + 1);
                  }}
                  className="flex min-h-24 items-center gap-3 rounded-xl border border-[#E5E0D8] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D1B2A] text-sm font-semibold text-white">NJ</span>
                  <span>
                    <span className="block text-base font-semibold text-[#1A1208]">New Job</span>
                    <span className="block text-sm text-[#7A7060]">Create a cleaning or turnover task</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updateOwnerTab("properties")}
                  className="flex min-h-24 items-center gap-3 rounded-xl border border-[#E5E0D8] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#1A6B60] text-sm font-semibold text-white">AP</span>
                  <span>
                    <span className="block text-base font-semibold text-[#1A1208]">Add Property</span>
                    <span className="block text-sm text-[#7A7060]">Save a new listing and calendar</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updateOwnerTab("providers")}
                  className="flex min-h-24 items-center gap-3 rounded-xl border border-[#E5E0D8] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#D97706] text-sm font-semibold text-white">PR</span>
                  <span>
                    <span className="block text-base font-semibold text-[#1A1208]">Add Provider</span>
                    <span className="block text-sm text-[#7A7060]">Invite or register a service provider</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updateOwnerTab("calendar")}
                  className="flex min-h-24 items-center gap-3 rounded-xl border border-[#E5E0D8] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D1B2A] text-sm font-semibold text-white">CL</span>
                  <span>
                    <span className="block text-base font-semibold text-[#1A1208]">Calendar</span>
                    <span className="block text-sm text-[#7A7060]">View upcoming scheduled jobs</span>
                  </span>
                </button>
              </div>
            </section>

            <div>
              <NotificationPanel
                title="Owner notifications"
                notifications={ownerNotifications}
                loading={loadingOwnerNotifications}
                error={ownerNotificationsError}
                onRetry={() => {
                  void loadOwnerNotifications();
                }}
                onMarkRead={handleMarkOwnerNotificationRead}
                onMarkAllRead={handleMarkAllOwnerNotificationsRead}
                onNotificationClick={handleOwnerNotificationClick}
              />
            </div>
          </section>
        </>
      ) : null}

      <section className="space-y-4">
        {ownerActiveTab === "properties" ? (
          <>
            <PropertyForm
          propertyName={propertyName}
          setPropertyName={setPropertyName}
          propertyAddress={propertyAddress}
          setPropertyAddress={setPropertyAddress}
          airbnbCalendarUrl={savedAirbnbCalendarUrl}
          setAirbnbCalendarUrl={setSavedAirbnbCalendarUrl}
          listingUrl={listingUrl}
          setListingUrl={setListingUrl}
          propertyType={propertyType}
          setPropertyType={setPropertyType}
          bedrooms={bedrooms}
          setBedrooms={setBedrooms}
          bathrooms={bathrooms}
          setBathrooms={setBathrooms}
          squareFeet={squareFeet}
          setSquareFeet={setSquareFeet}
          maxGuests={maxGuests}
          setMaxGuests={setMaxGuests}
          defaultCheckInTime={defaultCheckInTime}
          setDefaultCheckInTime={setDefaultCheckInTime}
          defaultCheckOutTime={defaultCheckOutTime}
          setDefaultCheckOutTime={setDefaultCheckOutTime}
          floorNumber={floorNumber}
          setFloorNumber={setFloorNumber}
          hasElevator={hasElevator}
          setHasElevator={setHasElevator}
          parkingInfo={parkingInfo}
          setParkingInfo={setParkingInfo}
          accessNotes={accessNotes}
          setAccessNotes={setAccessNotes}
          cleaningNotes={cleaningNotes}
          setCleaningNotes={setCleaningNotes}
          supplyLocation={supplyLocation}
          setSupplyLocation={setSupplyLocation}
          laundryLocation={laundryLocation}
          setLaundryLocation={setLaundryLocation}
          trashInstructions={trashInstructions}
          setTrashInstructions={setTrashInstructions}
          petInfo={petInfo}
          setPetInfo={setPetInfo}
          providerInstructions={providerInstructions}
          setProviderInstructions={setProviderInstructions}
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

        {updatePropertySuccess ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {updatePropertySuccess}
          </p>
        ) : null}

        {updatePropertyError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {updatePropertyError}
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
            {savedProperty.listingUrl ? (
              <p className="text-sm text-slate-700">
                <span className="font-medium text-slate-900">Listing URL:</span>{" "}
                <a
                  href={savedProperty.listingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 underline"
                >
                  {savedProperty.listingUrl}
                </a>
              </p>
            ) : null}
          </article>
        ) : null}

            <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Saved properties</h3>

          {loadingProperties ? (
            <EmptyState
              variant="loading"
              title="Loading properties"
              message="Fetching your property list."
            />
          ) : properties.length === 0 ? (
            <EmptyState
              title="No properties yet"
              message="Add your first property to start syncing reservations and generating cleaning jobs."
              actionLabel="Add your first property"
              onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
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
                  {property.listingUrl ? (
                    <p className="text-sm text-slate-700">
                      <a
                        href={property.listingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 underline"
                      >
                        Listing
                      </a>
                    </p>
                  ) : null}
                  {formatBedroomBathroomSummary(property) ? (
                    <p className="text-sm text-slate-700">{formatBedroomBathroomSummary(property)}</p>
                  ) : null}
                  {property.squareFeet !== null ? (
                    <p className="text-sm text-slate-700">Square feet: {property.squareFeet}</p>
                  ) : null}
                  {property.maxGuests !== null ? (
                    <p className="text-sm text-slate-700">Max guests: {property.maxGuests}</p>
                  ) : null}
                  {property.defaultCheckInTime || property.defaultCheckOutTime ? (
                    <p className="text-sm text-slate-700">
                      Check-in/out: {property.defaultCheckInTime || "-"} / {property.defaultCheckOutTime || "-"}
                    </p>
                  ) : null}
                  {property.parkingInfo ? (
                    <p className="text-sm text-slate-700">Parking: {property.parkingInfo}</p>
                  ) : null}
                  {property.cleaningNotes ? (
                    <p className="text-sm text-slate-700">Cleaning notes: {property.cleaningNotes}</p>
                  ) : null}
                  <p className="text-sm text-slate-700">{property.airbnbCalendarUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEditingProperty(property)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit property
                    </button>
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

                  {editingPropertyId === property.id ? (
                    <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <PropertyForm
                        mode="edit"
                        propertyName={editingPropertyForm.propertyName}
                        setPropertyName={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, propertyName: value }))
                        }
                        propertyAddress={editingPropertyForm.propertyAddress}
                        setPropertyAddress={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, propertyAddress: value }))
                        }
                        airbnbCalendarUrl={editingPropertyForm.savedAirbnbCalendarUrl}
                        setAirbnbCalendarUrl={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, savedAirbnbCalendarUrl: value }))
                        }
                        listingUrl={editingPropertyForm.listingUrl}
                        setListingUrl={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, listingUrl: value }))
                        }
                        propertyType={editingPropertyForm.propertyType}
                        setPropertyType={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, propertyType: value }))
                        }
                        bedrooms={editingPropertyForm.bedrooms}
                        setBedrooms={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, bedrooms: value }))
                        }
                        bathrooms={editingPropertyForm.bathrooms}
                        setBathrooms={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, bathrooms: value }))
                        }
                        squareFeet={editingPropertyForm.squareFeet}
                        setSquareFeet={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, squareFeet: value }))
                        }
                        maxGuests={editingPropertyForm.maxGuests}
                        setMaxGuests={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, maxGuests: value }))
                        }
                        defaultCheckInTime={editingPropertyForm.defaultCheckInTime}
                        setDefaultCheckInTime={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, defaultCheckInTime: value }))
                        }
                        defaultCheckOutTime={editingPropertyForm.defaultCheckOutTime}
                        setDefaultCheckOutTime={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, defaultCheckOutTime: value }))
                        }
                        floorNumber={editingPropertyForm.floorNumber}
                        setFloorNumber={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, floorNumber: value }))
                        }
                        hasElevator={editingPropertyForm.hasElevator}
                        setHasElevator={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, hasElevator: value }))
                        }
                        parkingInfo={editingPropertyForm.parkingInfo}
                        setParkingInfo={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, parkingInfo: value }))
                        }
                        accessNotes={editingPropertyForm.accessNotes}
                        setAccessNotes={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, accessNotes: value }))
                        }
                        cleaningNotes={editingPropertyForm.cleaningNotes}
                        setCleaningNotes={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, cleaningNotes: value }))
                        }
                        supplyLocation={editingPropertyForm.supplyLocation}
                        setSupplyLocation={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, supplyLocation: value }))
                        }
                        laundryLocation={editingPropertyForm.laundryLocation}
                        setLaundryLocation={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, laundryLocation: value }))
                        }
                        trashInstructions={editingPropertyForm.trashInstructions}
                        setTrashInstructions={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, trashInstructions: value }))
                        }
                        petInfo={editingPropertyForm.petInfo}
                        setPetInfo={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, petInfo: value }))
                        }
                        providerInstructions={editingPropertyForm.providerInstructions}
                        setProviderInstructions={(value) =>
                          setEditingPropertyForm((previous) => ({ ...previous, providerInstructions: value }))
                        }
                        loading={updatingProperty}
                        onSubmit={handleUpdateProperty}
                      />

                      <button
                        type="button"
                        onClick={handleCancelEditingProperty}
                        disabled={updatingProperty}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
            </section>
          </>
        ) : null}

        {ownerActiveTab === "providers" ? (
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
            capabilities={capabilities}
            setCapabilities={setCapabilities}
            primaryServiceType={primaryServiceType}
            setPrimaryServiceType={setPrimaryServiceType}
            baseAddress={baseAddress}
            setBaseAddress={setBaseAddress}
            baseCity={baseCity}
            setBaseCity={setBaseCity}
            baseState={baseState}
            setBaseState={setBaseState}
            baseZipCode={baseZipCode}
            setBaseZipCode={setBaseZipCode}
            serviceRadiusMiles={serviceRadiusMiles}
            setServiceRadiusMiles={setServiceRadiusMiles}
            serviceAreaNotes={serviceAreaNotes}
            setServiceAreaNotes={setServiceAreaNotes}
            baseRateDollars={baseRateDollars}
            setBaseRateDollars={setBaseRateDollars}
            hourlyRateDollars={hourlyRateDollars}
            setHourlyRateDollars={setHourlyRateDollars}
            notes={providerNotes}
            setNotes={setProviderNotes}
            loading={savingServiceProvider}
            onSubmit={handleSaveServiceProvider}
          />

          {loadingServiceProviders ? (
            <EmptyState
              variant="loading"
              title="Loading providers"
              message="Fetching available providers."
            />
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
            <EmptyState
              title="No providers assigned"
              message="Assign a provider to start routing jobs."
              actionLabel="Assign a provider"
              onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
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
                  <p className="text-sm text-slate-700">
                    Primary service: {formatServiceTypeLabel(provider.primaryServiceType ?? provider.serviceType)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {provider.capabilities
                      .filter((capability) => capability.active)
                      .map((capability) => (
                        <span
                          key={capability.id}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
                        >
                          {formatServiceTypeLabel(capability.serviceType)}
                        </span>
                      ))}
                  </div>
                  {provider.email ? (
                    <p className="text-sm text-slate-700">Email: {provider.email}</p>
                  ) : null}
                  {provider.phone ? (
                    <p className="text-sm text-slate-700">Phone: {provider.phone}</p>
                  ) : null}
                  {provider.baseCity || provider.baseState || provider.baseZipCode ? (
                    <p className="text-sm text-slate-700">
                      Service area: {[provider.baseCity, provider.baseState, provider.baseZipCode]
                        .filter((value) => Boolean(value))
                        .join(", ")}
                    </p>
                  ) : null}
                  {provider.serviceRadiusMiles !== null ? (
                    <p className="text-sm text-slate-700">Radius: {provider.serviceRadiusMiles} miles</p>
                  ) : null}
                  {provider.serviceAreaNotes ? (
                    <p className="text-sm text-slate-700">Area notes: {provider.serviceAreaNotes}</p>
                  ) : null}
                  {provider.baseRateCents !== null ? (
                    <p className="text-sm text-slate-700">Base rate: {formatCentsToDollars(provider.baseRateCents)}</p>
                  ) : null}
                  {provider.hourlyRateCents !== null ? (
                    <p className="text-sm text-slate-700">Hourly rate: {formatCentsToDollars(provider.hourlyRateCents)}</p>
                  ) : null}
                  {provider.ratingAverage !== null ? (
                    <p className="text-sm text-slate-700">
                      Rating: {provider.ratingAverage.toFixed(1)} ({provider.ratingCount})
                    </p>
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
        ) : null}

        {ownerActiveTab === "properties" ? (
          <>
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
          </>
        ) : null}

        {ownerActiveTab === "overview" || ownerActiveTab === "jobs" ? (
          <section className="space-y-3">
          {ownerActiveTab === "jobs" ? (
            <section className="hidden space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm md:block">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">Job summary</h4>
              <div className="flex flex-wrap rounded-md border border-slate-300 bg-white p-1">
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
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Needs provider</p>
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
          ) : null}

          {ownerActiveTab === "jobs" ? (
            <section className="hidden space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm md:block">
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
          ) : null}

          {ownerActiveTab === "jobs" ? (
            <section
            className={`hidden space-y-3 rounded-xl p-4 shadow-sm md:block ${
              ownerActiveQueue === "notification_job"
                ? "border border-indigo-200 bg-indigo-50/60 ring-1 ring-indigo-200"
                : "border border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">Owner job queue</h4>
              <button
                type="button"
                onClick={() => {
                  updateOwnerTab("jobs");
                  setAdHocJobFocusToken((previous) => previous + 1);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Create ad hoc job
              </button>
            </div>

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
                    onClick={() => {
                      setOwnerActiveQueue("none");
                      setFocusedOwnerNotificationJob(null);
                      setFocusedOwnerNotificationJobError("");
                      setLoadingFocusedOwnerNotificationJob(false);
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    {ownerActiveQueue === "notification_job"
                      ? "Close notification job"
                      : "Clear queue"}
                  </button>
                </div>

                {ownerActiveQueue === "notification_job" && loadingFocusedOwnerNotificationJob ? (
                  <p className="text-sm text-slate-600">Loading job...</p>
                ) : null}

                {ownerActiveQueue === "notification_job" && focusedOwnerNotificationJobError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {focusedOwnerNotificationJobError}
                  </p>
                ) : null}

                {ownerActiveQueue === "notification_job" && !loadingFocusedOwnerNotificationJob && !focusedOwnerNotificationJobError && !focusedOwnerNotificationJob ? (
                  <p className="text-sm text-slate-600">
                    This job is not currently loaded for the selected property.
                  </p>
                ) : null}

                {ownerQueueJobs.length > 0 ? (
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
                        showOwnerActions={true}
                        onOwnerSelfAssign={handleOwnerSelfAssignCleaningJob}
                        ownerSelfAssigning={selfAssigningJobId === job.id}
                        onNotesChange={handleUpdateCleaningJobNotes}
                        notesUpdating={updatingNotesJobId === job.id}
                        onIssueFlagsChange={handleUpdateCleaningJobIssueFlags}
                        issueFlagsUpdating={updatingIssueFlagsJobId === job.id}
                      />
                    ))}
                  </div>
                ) : null}

                {ownerActiveQueue !== "notification_job" && ownerQueueJobs.length === 0 ? (
                  <p className="text-sm text-slate-600">No jobs assigned yet.</p>
                ) : null}
              </>
            )}
            </section>
          ) : null}

          {ownerActiveTab === "jobs" ? (
            <>
              <div ref={adHocJobFormRef} className="scroll-mt-4">
                {adHocJobError ? (
                  <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {adHocJobError}
                  </p>
                ) : null}

                {adHocJobSuccess ? (
                  <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {adHocJobSuccess}
                  </p>
                ) : null}

                <AdHocJobForm
                  properties={properties}
                  providers={serviceProviders}
                  loading={creatingAdHocJob}
                  onSubmit={handleCreateAdHocJob}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Cleaning jobs</h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <label htmlFor="cleaningJobStatusFilter" className="text-sm text-slate-700">
                Status
              </label>
              <select
                id="cleaningJobStatusFilter"
                value={cleaningJobStatusFilter}
                onChange={(event) => setCleaningJobStatusFilter(event.target.value)}
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="all">All</option>
                <option value="needs_assignment">Needs provider</option>
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
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="all">All cleaners</option>
                <option value="unassigned">Needs provider</option>
                {cleanerProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.companyName ? `${provider.name} (${provider.companyName})` : provider.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setCleaningJobsView("list")}
                className={`min-h-11 rounded-md px-4 py-2.5 text-sm font-medium transition ${
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
                className={`min-h-11 rounded-md px-4 py-2.5 text-sm font-medium transition ${
                  cleaningJobsView === "grouped"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Grouped
              </button>
              <button
                type="button"
                onClick={() => updateOwnerTab("calendar")}
                className="min-h-11 rounded-md bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
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
            <EmptyState
              variant="loading"
              title="Loading jobs"
              message="Fetching cleaning jobs for this property."
            />
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

              {ownerSelfAssignError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {ownerSelfAssignError}
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
            <EmptyState
              title="No jobs assigned yet"
              message="Create your first job to begin dispatching work."
              actionLabel="Create your first job"
              onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
              ) : null}

              {!loadingCleaningJobsPropertyId && !cleaningJobsError && cleaningJobs.length > 0 && filteredCleaningJobs.length === 0 ? (
            <p className="text-sm text-slate-600">No cleaning jobs match this filter.</p>
              ) : null}

              {!loadingCleaningJobsPropertyId && !cleaningJobsError && filteredCleaningJobs.length > 0 ? (
                ownerJobsTabView === "list" ? (
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
                    showOwnerActions={true}
                    onOwnerSelfAssign={handleOwnerSelfAssignCleaningJob}
                    ownerSelfAssigning={selfAssigningJobId === job.id}
                    onNotesChange={handleUpdateCleaningJobNotes}
                    notesUpdating={updatingNotesJobId === job.id}
                    onIssueFlagsChange={handleUpdateCleaningJobIssueFlags}
                    issueFlagsUpdating={updatingIssueFlagsJobId === job.id}
                  />
                ))}
              </div>
                ) : (
              <CleaningJobCalendar jobs={filteredCleaningJobs} />
                )
              ) : null}
            </>
          ) : null}
          </section>
        ) : null}

        {ownerActiveTab === "jobs" ? (
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

          {selectedCleanerScheduleProviderId && !loadingCleanerSchedule ? (
            <CleanerSchedule
              jobs={cleanerScheduleJobs}
              onNotesChange={handleUpdateCleaningJobNotes}
              notesUpdatingJobId={updatingNotesJobId}
            />
          ) : null}

          {!selectedCleanerScheduleProviderId ? (
            <p className="text-sm text-slate-600">Select a cleaner to view their assigned jobs.</p>
          ) : null}
          </section>
        ) : null}

        {ownerActiveTab === "calendar" ? (
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Cleaning calendar</h3>
              <p className="text-sm text-slate-600">
                Calendar view for the current job filters and selected property.
              </p>
            </div>
            <ProviderJobCalendar jobs={ownerCalendarJobs} />
          </section>
        ) : null}

        {isDevelopment && ownerActiveTab === "developer" ? (
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

          {currentOwnerProfile ? (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900">Legacy data tools</h4>
                <p className="text-sm text-slate-600">
                  Attach existing unowned properties to this owner profile.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleClaimLegacyProperties();
                }}
                disabled={claimingLegacyProperties}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {claimingLegacyProperties ? "Claiming..." : "Claim legacy properties"}
              </button>

              {legacyPropertiesClaimMessage ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {legacyPropertiesClaimMessage}
                </p>
              ) : null}

              {legacyPropertiesClaimError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {legacyPropertiesClaimError}
                </p>
              ) : null}
            </section>
          ) : null}
          </section>
        ) : null}
      </section>
      </>
      )}
    </main>
    <MobileBottomNav
      mode="owner"
      activeTab={ownerActiveTab === "developer" ? "overview" : ownerActiveTab}
      showRoleSwitch={Boolean(currentServiceProvider)}
    />
    </>
  );
}
