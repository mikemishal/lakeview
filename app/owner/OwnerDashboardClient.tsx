"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PropertyForm from "@/components/PropertyForm";
import CalendarSyncForm from "@/components/CalendarSyncForm";
import AdHocJobForm, { type AdHocJobFormPayload } from "@/components/AdHocJobForm";
import CleaningJobCard, { type CleaningJobItem as BaseCleaningJobItem } from "@/components/CleaningJobCard";
import { type CleanerScheduleJob } from "@/components/CleanerSchedule";
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
  calendarLastSyncedAt: string | null;
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
  property: SavedProperty;
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

type UpdateCleaningJobPriceResponse = {
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

type TeamProviderAreaStatus = "in_area" | "out_of_area" | "unknown";

type OwnerTeamMember = {
  id: string;
  ownerProfileId: string;
  serviceProviderId: string;
  isActive: boolean;
  cleaningFlatRateCents: number | null;
  cleaningHourlyRateCents: number | null;
  pricingNotes: string | null;
  createdAt: string;
  updatedAt: string;
  distanceMiles: number | null;
  thresholdMiles: number;
  areaStatus: TeamProviderAreaStatus;
  serviceProvider: ServiceProvider;
};

type AvailableTeamProvider = {
  provider: ServiceProvider;
  distanceMiles: number | null;
  thresholdMiles: number;
  areaStatus: TeamProviderAreaStatus;
};

type OwnerTeamProvidersResponse = {
  teamMembers: OwnerTeamMember[];
  availableProviders: AvailableTeamProvider[];
};

type TeamProviderResponse = {
  teamMember: OwnerTeamMember;
};

type NotificationsResponse = {
  notifications: AppNotification[];
};

type OwnerProfileSummary = {
  id: string;
  name: string;
  companyName: string | null;
  propertyLatitude: number | null;
  propertyLongitude: number | null;
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

function getProviderOfferedServiceTypes(provider: ServiceProvider): string[] {
  const capabilityTypes = provider.capabilities
    .filter((capability) => capability.active)
    .map((capability) => normalizeProviderServiceType(capability.serviceType));

  const fallbackTypes = [
    normalizeProviderServiceType(provider.serviceType),
    normalizeProviderServiceType(provider.primaryServiceType),
  ].filter((value) => Boolean(value));

  return Array.from(new Set([...capabilityTypes, ...fallbackTypes]));
}

function getAreaStatusLabel(status: TeamProviderAreaStatus): string {
  if (status === "in_area") {
    return "Services your area";
  }

  if (status === "out_of_area") {
    return "Outside service area";
  }

  return "Location unknown";
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

function formatDateTimeLabel(value: string | Date): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const dateLabel = parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeLabel = parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} at ${timeLabel}`;
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
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyError, setPropertyError] = useState("");
  const [propertySuccess, setPropertySuccess] = useState("");
  const [showAddPropertyForm, setShowAddPropertyForm] = useState(false);
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
  const [expandedPropertyEventsId, setExpandedPropertyEventsId] = useState<string | null>(null);
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
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [generatingJobsPropertyId, setGeneratingJobsPropertyId] = useState("");
  const [cleaningJobGenerationMessage, setCleaningJobGenerationMessage] = useState("");
  const [ownerActiveQueue, setOwnerActiveQueue] = useState<OwnerActiveQueue>("none");
  const [futureSummaryRange] = useState<7 | 30 | 90>(30);
  const [showJobSummary, setShowJobSummary] = useState(false);
  const [showIssuesSummary, setShowIssuesSummary] = useState(false);
  const [showJobs, setShowJobs] = useState(false);
  const [cleaningJobStatusFilter, setCleaningJobStatusFilter] = useState("all");
  const [cleaningJobProviderFilter, setCleaningJobProviderFilter] = useState("all");
  const [cleaningJobTypeFilter, setCleaningJobTypeFilter] = useState("all");
  const [cleaningJobPropertyFilter, setCleaningJobPropertyFilter] = useState("all");
  const [cleaningJobDateFilter, setCleaningJobDateFilter] = useState("all");
  const [openedJobId, setOpenedJobId] = useState<string | null>(null);
  const [openedJobEditMode, setOpenedJobEditMode] = useState(false);
  const [openedJobNotesDraft, setOpenedJobNotesDraft] = useState("");
  const [openedJobPriceDraft, setOpenedJobPriceDraft] = useState("");
  const [openedJobPriceNotesDraft, setOpenedJobPriceNotesDraft] = useState("");
  const [openedJobAssignmentDraft, setOpenedJobAssignmentDraft] = useState<string | null>(null);
  const [savingOpenedJob, setSavingOpenedJob] = useState(false);
  const [openedJobEditError, setOpenedJobEditError] = useState("");
  const [openedJobEditSuccess, setOpenedJobEditSuccess] = useState("");
  const [showManualSync, setShowManualSync] = useState(false);

  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [loadingServiceProviders, setLoadingServiceProviders] = useState(true);
  const [savingServiceProvider, setSavingServiceProvider] = useState(false);
  const [serviceProviderError, setServiceProviderError] = useState("");
  const [serviceProviderSuccess, setServiceProviderSuccess] = useState("");
  const [teamMembers, setTeamMembers] = useState<OwnerTeamMember[]>([]);
  const [availableTeamProviders, setAvailableTeamProviders] = useState<AvailableTeamProvider[]>(
    []
  );
  const [loadingTeamProviders, setLoadingTeamProviders] = useState(true);
  const [teamProviderError, setTeamProviderError] = useState("");
  const [teamProviderSuccess, setTeamProviderSuccess] = useState("");
  const [activeAddProviderId, setActiveAddProviderId] = useState<string | null>(null);
  const [activeEditProviderId, setActiveEditProviderId] = useState<string | null>(null);
  const [teamFlatRateDollars, setTeamFlatRateDollars] = useState("");
  const [teamHourlyRateDollars, setTeamHourlyRateDollars] = useState("");
  const [teamPricingNotes, setTeamPricingNotes] = useState("");
  const [savingTeamProviderId, setSavingTeamProviderId] = useState("");
  const [showProviderCreationForm, setShowProviderCreationForm] = useState(false);

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
  const [, setLoadingFocusedOwnerNotificationJob] = useState(false);
  const [, setFocusedOwnerNotificationJobError] = useState("");
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

  // Get team providers filtered by service type
  function getTeamProvidersForServiceType(serviceType: string): Array<{
    id: string;
    name: string;
    companyName: string | null;
    cleaningFlatRateCents: number | null;
    cleaningHourlyRateCents: number | null;
  }> {
    const normalized = normalizeProviderServiceType(serviceType);
    return teamMembers
      .filter((member) => {
        if (!member.isActive) return false;
        const provider = member.serviceProvider;
        const offeredServices = getProviderOfferedServiceTypes(provider);
        return offeredServices.includes(normalized);
      })
      .map((member) => ({
        id: member.serviceProviderId,
        name: member.serviceProvider.name,
        companyName: member.serviceProvider.companyName,
        cleaningFlatRateCents: member.cleaningFlatRateCents,
        cleaningHourlyRateCents: member.cleaningHourlyRateCents,
      }));
  }

  // Build providers list for AdHocJobForm (includes team members with pricing + regular providers)
  const adHocJobProviders = (() => {
    return serviceProviders.map((provider) => {
      const teamMember = teamMembers.find(m => m.serviceProviderId === provider.id && m.isActive);
      return {
        ...provider,
        cleaningFlatRateCents: teamMember?.cleaningFlatRateCents ?? null,
        cleaningHourlyRateCents: teamMember?.cleaningHourlyRateCents ?? null,
      };
    });
  })();

  // Determine dashboard filter and label from URL.
  // Keep backward compatibility with existing `dashboardFilter` and support `filter` links.
  const dashboardFilter = searchParams.get("dashboardFilter") ?? searchParams.get("filter");
  const dashboardFilterConfig = (() => {
    switch (dashboardFilter) {
      case "today":
        return { active: "today", label: "Today", status: "all", provider: "all", date: "today" };
      case "needs-assignment":
        return { active: "needs-assignment", label: "Needs Assignment", status: "needs_assignment", provider: "all", date: "all" };
      case "pending-acceptance":
        return { active: "pending-acceptance", label: "Pending Acceptance", status: "pending_acceptance", provider: "all", date: "all" };
      case "upcoming":
        return { active: "upcoming", label: "Upcoming", status: "all", provider: "all", date: "upcoming" };
      case "urgent-issues":
        return { active: "urgent-issues", label: "Urgent Issues", status: "all", provider: "all", date: "all" };
      default:
        return { active: null, label: "", status: "all", provider: "all", date: "all" };
    }
  })();

  // Apply dashboard filter to internal state
  const effectiveDashboardFilterActive = dashboardFilterConfig.active;
  const effectiveDashboardFilterLabel = dashboardFilterConfig.label;
  const effectiveCleaningJobStatusFilter = dashboardFilterConfig.active ? dashboardFilterConfig.status : cleaningJobStatusFilter;
  const effectiveCleaningJobProviderFilter = dashboardFilterConfig.active ? dashboardFilterConfig.provider : cleaningJobProviderFilter;
  const effectiveCleaningJobDateFilter = dashboardFilterConfig.active ? dashboardFilterConfig.date : cleaningJobDateFilter;
  const effectiveShowJobs = dashboardFilterConfig.active ? true : showJobs;

  // Date calculations for filtering
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

  const filteredCleaningJobs = (() => {
    let result = cleaningJobs;

    // Apply dashboard filter if active
    if (effectiveDashboardFilterActive === "today") {
      result = result.filter((job) => toDateOnly(job.scheduledDate) === todayDateOnly);
    } else if (effectiveDashboardFilterActive === "urgent-issues") {
      result = result.filter(
        (job) => job.maintenanceNeeded || job.restockNeeded || job.damageFound
      );
    } else if (effectiveDashboardFilterActive === "upcoming") {
      result = futureJobsInRange;
    }

    // Apply status filter
    if (effectiveCleaningJobStatusFilter !== "all") {
      result = result.filter((job) => job.status === effectiveCleaningJobStatusFilter);
    }

    // Apply provider filter
    if (effectiveCleaningJobProviderFilter === "unassigned") {
      result = result.filter((job) => job.assignedProviderId === null);
    } else if (effectiveCleaningJobProviderFilter !== "all") {
      result = result.filter((job) => job.assignedProviderId === effectiveCleaningJobProviderFilter);
    }

    // Apply type filter
    if (cleaningJobTypeFilter !== "all") {
      result = result.filter(
        (job) => normalizeProviderServiceType(job.requestedServiceType) === cleaningJobTypeFilter
      );
    }

    // Apply property filter
    if (cleaningJobPropertyFilter !== "all") {
      result = result.filter((job) => job.propertyId === cleaningJobPropertyFilter);
    }

    // Apply date filter
    if (effectiveCleaningJobDateFilter === "today") {
      result = result.filter((job) => toDateOnly(job.scheduledDate) === todayDateOnly);
    } else if (effectiveCleaningJobDateFilter === "upcoming") {
      result = result.filter((job) => toDateOnly(job.scheduledDate) > todayDateOnly);
    } else if (effectiveCleaningJobDateFilter === "past") {
      result = result.filter((job) => toDateOnly(job.scheduledDate) < todayDateOnly);
    }

    return result;
  })();

  const providerFilterOptions = (() => {
    const options = new Map<string, string>();

    teamMembers
      .filter((member) => member.isActive)
      .forEach((member) => {
        const label = member.serviceProvider.companyName
          ? `${member.serviceProvider.name} (${member.serviceProvider.companyName})`
          : member.serviceProvider.name;
        options.set(member.serviceProviderId, label);
      });

    cleaningJobs.forEach((job) => {
      if (job.assignedProviderId && job.assignedProvider) {
        const label = job.assignedProvider.companyName
          ? `${job.assignedProvider.name} (${job.assignedProvider.companyName})`
          : job.assignedProvider.name;
        options.set(job.assignedProviderId, label);
      }
    });

    return Array.from(options.entries()).map(([id, label]) => ({ id, label }));
  })();

  const openedJob = openedJobId ? cleaningJobs.find((job) => job.id === openedJobId) ?? null : null;
  const openedJobTeamProviders = openedJob
    ? getTeamProvidersForServiceType(openedJob.requestedServiceType)
    : [];
  const openedJobAssignedTeamProvider = openedJob?.assignedProviderId
    ? openedJobTeamProviders.find((provider) => provider.id === openedJob.assignedProviderId) ?? null
    : null;
  const openedJobQuotedPrice =
    openedJob?.quotedPrice && Number.isFinite(Number(openedJob.quotedPrice))
      ? Number(openedJob.quotedPrice)
      : null;
  const openedJobHasCustomPrice =
    openedJob?.quotedPriceSource === "custom_job_price" ||
    openedJob?.quotedPriceSource === "manual_override";

  const futureNeedsAssignmentJobs = futureJobsAll.filter(
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

  const jobSummaryItems = [
    { key: "future_all", label: "Total future", value: totalFutureJobs, tone: "pending" as const },
    { key: "future_needs_assignment", label: "Needs provider", value: futureNeedsAssignment, tone: "pending" as const },
    { key: "future_assigned", label: "Assigned", value: futureAssigned, tone: "pending" as const },
    { key: "future_declined", label: "Declined", value: futureDeclined, tone: "urgent" as const },
    { key: "future_accepted", label: "Accepted", value: futureAccepted, tone: "good" as const },
    { key: "future_in_progress", label: "In progress", value: futureInProgress, tone: "pending" as const },
    { key: "future_cancelled", label: "Cancelled", value: futureCancelled, tone: "urgent" as const },
    { key: "future_issues", label: "With issues", value: futureWithIssues, tone: "urgent" as const },
    { key: "past_all", label: "Total past", value: totalPastJobs, tone: "pending" as const },
    { key: "past_completed", label: "Completed", value: pastCompleted, tone: "good" as const },
    { key: "past_not_completed", label: "Not completed", value: pastNotCompleted, tone: "pending" as const },
    { key: "past_issues", label: "Had issues", value: pastWithIssues, tone: "urgent" as const },
  ];

  const issuesSummaryItems = [
    { key: "issues_all", label: "Total issues", value: jobsWithIssues.length, tone: "urgent" as const },
    { key: "issues_maintenance", label: "Maintenance", value: maintenanceJobs.length, tone: "pending" as const },
    { key: "issues_restock", label: "Restock", value: restockJobs.length, tone: "pending" as const },
    { key: "issues_damage", label: "Damage", value: damageJobs.length, tone: "urgent" as const },
  ];

  const visibleJobSummaryItems = jobSummaryItems.filter(
    (item) => typeof item.value === "number" && item.value > 0
  );
  const visibleIssuesSummaryItems = issuesSummaryItems.filter(
    (item) => typeof item.value === "number" && item.value > 0
  );

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
      setItems([]);
      setError("");
      void loadCleaningJobsForProperty(firstProperty.id, { silent: true });
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

  const loadTeamProviders = useCallback(async () => {
    if (!currentOwnerProfile || inviteCodeBlocked) {
      setLoadingTeamProviders(false);
      return;
    }

    setLoadingTeamProviders(true);
    setTeamProviderError("");

    try {
      const response = await fetch("/api/owner-team/providers");
      const data = (await response.json()) as OwnerTeamProvidersResponse | CalendarSyncError;

      if (!response.ok) {
        setTeamProviderError((data as CalendarSyncError).error || "Failed to load team providers.");
        return;
      }

      setTeamMembers((data as OwnerTeamProvidersResponse).teamMembers);
      setAvailableTeamProviders((data as OwnerTeamProvidersResponse).availableProviders);
    } catch {
      setTeamProviderError("Failed to load team providers.");
    } finally {
      setLoadingTeamProviders(false);
    }
  }, [currentOwnerProfile, inviteCodeBlocked]);

  function resetTeamPricingForm() {
    setTeamFlatRateDollars("");
    setTeamHourlyRateDollars("");
    setTeamPricingNotes("");
  }

  function startAddProvider(providerId: string) {
    setActiveEditProviderId(null);
    setActiveAddProviderId(providerId);
    resetTeamPricingForm();
    setTeamProviderError("");
    setTeamProviderSuccess("");
  }

  function startEditProvider(member: OwnerTeamMember) {
    setActiveAddProviderId(null);
    setActiveEditProviderId(member.serviceProviderId);
    setTeamFlatRateDollars(
      member.cleaningFlatRateCents !== null ? (member.cleaningFlatRateCents / 100).toFixed(2) : ""
    );
    setTeamHourlyRateDollars(
      member.cleaningHourlyRateCents !== null ? (member.cleaningHourlyRateCents / 100).toFixed(2) : ""
    );
    setTeamPricingNotes(member.pricingNotes ?? "");
    setTeamProviderError("");
    setTeamProviderSuccess("");
  }

  function closeProviderPricingPanel() {
    setActiveAddProviderId(null);
    setActiveEditProviderId(null);
    resetTeamPricingForm();
  }

  async function handleAddProviderToTeam(providerId: string) {
    setSavingTeamProviderId(providerId);
    setTeamProviderError("");
    setTeamProviderSuccess("");

    try {
      const flatRateCents = parseDollarStringToCents(teamFlatRateDollars);
      const hourlyRateCents = parseDollarStringToCents(teamHourlyRateDollars);

      if (flatRateCents === "invalid" || hourlyRateCents === "invalid") {
        setTeamProviderError("Please enter valid dollar amounts for pricing fields.");
        return;
      }

      const response = await fetch("/api/owner-team/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceProviderId: providerId,
          cleaningFlatRateCents: flatRateCents,
          cleaningHourlyRateCents: hourlyRateCents,
          pricingNotes: teamPricingNotes,
        }),
      });

      const data = (await response.json()) as TeamProviderResponse | CalendarSyncError;

      if (!response.ok) {
        setTeamProviderError((data as CalendarSyncError).error || "Failed to add provider to team.");
        return;
      }

      setTeamProviderSuccess("Provider added to your team.");
      closeProviderPricingPanel();
      await loadTeamProviders();
    } catch {
      setTeamProviderError("Failed to add provider to team.");
    } finally {
      setSavingTeamProviderId("");
    }
  }

  async function handleSaveTeamProviderPricing(providerId: string) {
    setSavingTeamProviderId(providerId);
    setTeamProviderError("");
    setTeamProviderSuccess("");

    try {
      const flatRateCents = parseDollarStringToCents(teamFlatRateDollars);
      const hourlyRateCents = parseDollarStringToCents(teamHourlyRateDollars);

      if (flatRateCents === "invalid" || hourlyRateCents === "invalid") {
        setTeamProviderError("Please enter valid dollar amounts for pricing fields.");
        return;
      }

      const response = await fetch(`/api/owner-team/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaningFlatRateCents: flatRateCents,
          cleaningHourlyRateCents: hourlyRateCents,
          pricingNotes: teamPricingNotes,
        }),
      });

      const data = (await response.json()) as TeamProviderResponse | CalendarSyncError;

      if (!response.ok) {
        setTeamProviderError((data as CalendarSyncError).error || "Failed to update provider pricing.");
        return;
      }

      setTeamProviderSuccess("Provider pricing updated.");
      closeProviderPricingPanel();
      await loadTeamProviders();
    } catch {
      setTeamProviderError("Failed to update provider pricing.");
    } finally {
      setSavingTeamProviderId("");
    }
  }

  async function handleDeactivateTeamProvider(providerId: string) {
    setSavingTeamProviderId(providerId);
    setTeamProviderError("");
    setTeamProviderSuccess("");

    try {
      const response = await fetch(`/api/owner-team/providers/${providerId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok) {
        setTeamProviderError(data.error || "Failed to deactivate provider.");
        return;
      }

      setTeamProviderSuccess("Provider removed from your active team.");
      closeProviderPricingPanel();
      await loadTeamProviders();
    } catch {
      setTeamProviderError("Failed to deactivate provider.");
    } finally {
      setSavingTeamProviderId("");
    }
  }

  async function handleActivateTeamProvider(providerId: string) {
    setSavingTeamProviderId(providerId);
    setTeamProviderError("");
    setTeamProviderSuccess("");

    try {
      const response = await fetch(`/api/owner-team/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      const data = (await response.json()) as TeamProviderResponse | CalendarSyncError;

      if (!response.ok) {
        setTeamProviderError((data as CalendarSyncError).error || "Failed to activate provider.");
        return;
      }

      setTeamProviderSuccess("Provider reactivated.");
      await loadTeamProviders();
    } catch {
      setTeamProviderError("Failed to activate provider.");
    } finally {
      setSavingTeamProviderId("");
    }
  }

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
      void loadTeamProviders();
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
    loadTeamProviders,
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
      setProperties((previous) => [createdProperty, ...previous]);
      setPropertySuccess("Property saved.");
      setShowAddPropertyForm(false);

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
    setExpandedPropertyEventsId(property.id);
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

      const syncedProperty = (data as PropertySyncResponse).property;

      setProperties((previous) =>
        previous.map((currentProperty) =>
          currentProperty.id === syncedProperty.id ? syncedProperty : currentProperty
        )
      );

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
    if (expandedPropertyEventsId === property.id) {
      setExpandedPropertyEventsId(null);
      setItems([]);
      setError("");
      return;
    }

    setExpandedPropertyEventsId(property.id);
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

  async function handleAssignCleaningJobProvider(jobId: string, providerId: string | null): Promise<boolean> {
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
        return false;
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
      return true;
    } catch {
      setProviderAssignmentError("Failed to assign cleaning job provider.");
      return false;
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

  async function handleUpdateCleaningJobNotes(jobId: string, notes: string | null): Promise<boolean> {
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
        return false;
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
      return true;
    } catch {
      setCleaningJobNotesError("Failed to update cleaning job notes.");
      return false;
    } finally {
      setUpdatingNotesJobId("");
    }
  }

  async function handleUpdateCleaningJobPrice(
    jobId: string,
    quotedPrice: string | null,
    quotedPriceNotes: string | null
  ): Promise<boolean> {
    const response = await fetch(`/api/cleaning-jobs/${jobId}/price`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quotedPrice, quotedPriceNotes }),
    });

    const data = (await response.json()) as
      | UpdateCleaningJobPriceResponse
      | CalendarSyncError;

    if (!response.ok) {
      setOpenedJobEditError(
        (data as CalendarSyncError).error || "Failed to update job price."
      );
      return false;
    }

    const updatedJob = (data as UpdateCleaningJobPriceResponse).cleaningJob;

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

    return true;
  }

  async function handleSaveOpenedJobChanges() {
    if (!openedJob) {
      return;
    }

    setSavingOpenedJob(true);
    setOpenedJobEditError("");
    setOpenedJobEditSuccess("");

    try {
      if (openedJobAssignmentDraft !== openedJob.assignedProviderId) {
        const success = await handleAssignCleaningJobProvider(
          openedJob.id,
          openedJobAssignmentDraft
        );
        if (!success) {
          setSavingOpenedJob(false);
          return;
        }
      }

      const normalizedNotes = openedJobNotesDraft.trim() || null;
      if ((openedJob.notes ?? null) !== normalizedNotes) {
        const success = await handleUpdateCleaningJobNotes(openedJob.id, normalizedNotes);
        if (!success) {
          setSavingOpenedJob(false);
          return;
        }
      }

      const trimmedPrice = openedJobPriceDraft.trim();
      const normalizedPrice = trimmedPrice.length === 0 ? null : trimmedPrice;
      const normalizedPriceNotes = openedJobPriceNotesDraft.trim() || null;

      const currentPrice = openedJob.quotedPrice ? Number(openedJob.quotedPrice).toFixed(2) : "";
      const draftPrice = normalizedPrice ? Number(normalizedPrice).toFixed(2) : "";
      const shouldUpdatePrice =
        currentPrice !== draftPrice ||
        (openedJob.quotedPriceNotes ?? null) !== normalizedPriceNotes;

      if (shouldUpdatePrice) {
        const success = await handleUpdateCleaningJobPrice(
          openedJob.id,
          normalizedPrice,
          normalizedPriceNotes
        );
        if (!success) {
          setSavingOpenedJob(false);
          return;
        }
      }

      setOpenedJobEditMode(false);
      setOpenedJobEditSuccess("Job updated successfully.");
    } catch {
      setOpenedJobEditError("Failed to save job updates.");
    } finally {
      setSavingOpenedJob(false);
    }
  }

  function handleCancelOpenedJobEdit() {
    if (!openedJob) {
      return;
    }

    setOpenedJobNotesDraft(openedJob.notes ?? "");
    setOpenedJobPriceDraft(openedJob.quotedPrice ? Number(openedJob.quotedPrice).toFixed(2) : "");
    setOpenedJobPriceNotesDraft(openedJob.quotedPriceNotes ?? "");
    setOpenedJobAssignmentDraft(openedJob.assignedProviderId);
    setOpenedJobEditMode(false);
    setOpenedJobEditError("");
  }

  function handleOpenJobDetails(selectedJob: CleaningJobItem) {
    setOpenedJobId(selectedJob.id);
    setOpenedJobEditMode(false);
    setOpenedJobNotesDraft(selectedJob.notes ?? "");
    setOpenedJobPriceDraft(
      selectedJob.quotedPrice ? Number(selectedJob.quotedPrice).toFixed(2) : ""
    );
    setOpenedJobPriceNotesDraft(selectedJob.quotedPriceNotes ?? "");
    setOpenedJobAssignmentDraft(selectedJob.assignedProviderId);
    setOpenedJobEditError("");
    setOpenedJobEditSuccess("");
  }

  function handleCloseJobDetails() {
    setOpenedJobId(null);
    setOpenedJobEditMode(false);
    setOpenedJobNotesDraft("");
    setOpenedJobPriceDraft("");
    setOpenedJobPriceNotesDraft("");
    setOpenedJobAssignmentDraft(null);
    setOpenedJobEditError("");
    setOpenedJobEditSuccess("");
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
              <Link
                href="?tab=jobs&dashboardFilter=today"
                className="rounded-xl border border-[#E5E0D8] border-l-[3px] border-l-[#1A6B60] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2] cursor-pointer"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Today&apos;s jobs</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{todayJobs.length}</p>
              </Link>

              <Link
                href="?tab=jobs&dashboardFilter=needs-assignment"
                className={`rounded-xl border border-[#E5E0D8] border-l-[3px] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2] cursor-pointer ${
                  futureNeedsAssignment > 0 ? "border-l-[#D97706]" : "border-l-[#1A6B60]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Needs assignment</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{futureNeedsAssignment}</p>
              </Link>

              <Link
                href="?tab=jobs&dashboardFilter=urgent-issues"
                className={`rounded-xl border border-[#E5E0D8] border-l-[3px] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2] cursor-pointer ${
                  jobsWithIssues.length > 0 ? "border-l-red-600" : "border-l-[#1A6B60]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Urgent issues</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{jobsWithIssues.length}</p>
              </Link>

              <Link
                href="?tab=jobs&dashboardFilter=upcoming"
                className="rounded-xl border border-[#E5E0D8] border-l-[3px] border-l-[#1A6B60] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2] cursor-pointer"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A7060]">Upcoming jobs</p>
                <p className="mt-2 text-[32px] leading-none font-semibold text-[#1A1208]">{futureJobsInRange.length}</p>
              </Link>
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
              <section className="space-y-1" style={{ fontFamily: "Georgia, Palatino, serif" }}>
                <h2 className="font-serif text-3xl font-bold text-[#0D1B2A]">Properties</h2>
                <p className="text-base text-[#7A7060]">Manage homes, calendar sync, and upcoming stays.</p>
              </section>

              <section className="rounded-[14px] border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ fontFamily: "Georgia, Palatino, serif" }}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-semibold text-[#0D1B2A]">Add property</h3>
                    <p className="text-sm text-[#7A7060]">Connect a property and import its Airbnb calendar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddPropertyForm(true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#B8860B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#9F7408]"
                  >
                    + Add Property
                  </button>
                </div>
              </section>

              {showAddPropertyForm ? (
                <div className="space-y-3 rounded-[14px] border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style={{ fontFamily: "Georgia, Palatino, serif" }}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-serif text-xl font-semibold text-[#0D1B2A]">Add Property</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddPropertyForm(false)}
                      className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
                    >
                      Cancel
                    </button>
                  </div>

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
          submitLabel="Save Property"
          onSubmit={handleSaveProperty}
                />
              </div>
            ) : null}

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

        {error ? (
          <p className="rounded-lg border border-[#F2C2BD] bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]">
            {error}
          </p>
        ) : null}

            <section className="space-y-3">
          <h3 className="font-serif text-xl font-semibold text-[#0D1B2A]" style={{ fontFamily: "Georgia, Palatino, serif" }}>Saved properties</h3>

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
                  className={`space-y-3 rounded-[14px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                    selectedPropertyId === property.id
                      ? "ring-1 ring-[#B8860B]/30"
                      : ""
                  }`}
                  style={{ fontFamily: "Georgia, Palatino, serif" }}
                >
                  <div className="space-y-1">
                    <p className="font-serif text-lg font-semibold text-[#0D1B2A]">{property.name}</p>
                    {property.address ? (
                      <p className="text-sm text-[#7A7060]">{property.address}</p>
                    ) : null}
                  </div>

                  <p className="text-sm text-[#1A1208]">
                    Airbnb calendar · {property.calendarLastSyncedAt ? "Synced" : "Needs sync"}
                  </p>

                  <p className="text-sm text-[#7A7060]">
                    Last sync: {property.calendarLastSyncedAt ? formatDateTimeLabel(property.calendarLastSyncedAt) : "Not synced yet"}
                  </p>

                  {property.address ? (
                    <p className="text-sm text-[#7A7060]">{property.address}</p>
                  ) : null}
                  {formatBedroomBathroomSummary(property) ? (
                    <p className="text-sm text-[#7A7060]">{formatBedroomBathroomSummary(property)}</p>
                  ) : null}
                  {property.maxGuests !== null ? (
                    <p className="text-sm text-[#7A7060]">Max guests: {property.maxGuests}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEditingProperty(property)}
                      className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
                    >
                      Edit property
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSyncSavedProperty(property)}
                      disabled={syncingPropertyId === property.id}
                      className="rounded-[10px] bg-[#0D1B2A] px-3 py-2 text-sm font-medium text-[#FAF7F2] transition hover:bg-[#13293D] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {syncingPropertyId === property.id ? "Syncing..." : "Sync Calendar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewSavedEvents(property)}
                      disabled={loadingEventsPropertyId === property.id}
                      className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingEventsPropertyId === property.id
                        ? "Loading..."
                        : expandedPropertyEventsId === property.id
                          ? "Hide events"
                          : "View loaded events"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateCleaningJobs(property)}
                      disabled={generatingJobsPropertyId === property.id}
                      className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generatingJobsPropertyId === property.id ? "Generating..." : "Generate cleaning jobs"}
                    </button>
                  </div>

                  {expandedPropertyEventsId === property.id ? (
                    <div className="space-y-2 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] p-3">
                      <p className="text-sm font-semibold text-[#0D1B2A]">Loaded events</p>
                      {selectedPropertyId === property.id && items.length > 0 ? (
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="rounded-[10px] border border-[#E5E0D8] bg-white p-3">
                              <p className="text-sm font-semibold text-[#1A1208]">{item.summary || "Reservation"}</p>
                              <p className="text-xs text-[#7A7060]">
                                {formatLongDateLabel(item.checkInDate)} to {formatLongDateLabel(item.checkOutDate)}
                              </p>
                              <p className="text-xs text-[#7A7060]">Source: {item.source || "Airbnb"}</p>
                            </div>
                          ))}
                        </div>
                      ) : loadingEventsPropertyId === property.id ? (
                        <p className="text-sm text-[#7A7060]">Loading events...</p>
                      ) : (
                        <p className="text-sm text-[#7A7060]">No loaded events for this property.</p>
                      )}
                    </div>
                  ) : null}

                  {editingPropertyId === property.id ? (
                    <div className="mt-3 space-y-3 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] p-3">
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
                        submitLabel="Save Property"
                        onSubmit={handleUpdateProperty}
                      />

                      <button
                        type="button"
                        onClick={handleCancelEditingProperty}
                        disabled={updatingProperty}
                        className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-60"
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
          <section className="space-y-5" style={{ fontFamily: "Georgia, Palatino, serif" }}>
            <div className="space-y-1">
              <h2 className="font-serif text-3xl font-bold text-[#0D1B2A]">My Team</h2>
              <p className="text-base text-[#7A7060]">
                Choose trusted providers for cleaning, maintenance, restock, inspections, laundry, and trash.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadTeamProviders()}
                disabled={loadingTeamProviders}
                className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingTeamProviders ? "Refreshing..." : "Refresh team"}
              </button>

              <button
                type="button"
                onClick={() => setShowProviderCreationForm((previous) => !previous)}
                className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#7A7060] transition hover:bg-[#FAF7F2]"
              >
                {showProviderCreationForm ? "Hide advanced provider creation" : "Advanced: Create provider profile"}
              </button>
            </div>

            {teamProviderError ? (
              <p className="rounded-lg border border-[#F2C2BD] bg-[#FDECEC] px-4 py-3 text-sm text-[#B42318]">
                {teamProviderError}
              </p>
            ) : null}

            {teamProviderSuccess ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {teamProviderSuccess}
              </p>
            ) : null}

            <section className="space-y-3">
              <h3 className="font-serif text-xl font-semibold text-[#0D1B2A]">My Team</h3>

              {loadingTeamProviders ? (
                <EmptyState
                  variant="loading"
                  title="Loading your team"
                  message="Fetching owner team providers."
                />
              ) : teamMembers.length === 0 ? (
                <div className="rounded-[12px] border-2 border-dashed border-[#E5E0D8] bg-[#FAF7F2] p-6 text-center">
                  <h4 className="font-serif text-lg font-semibold text-[#0D1B2A]">No providers on your team yet.</h4>
                  <p className="mt-1 text-sm text-[#7A7060]">Add service providers below to start assigning work.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {teamMembers.map((member) => {
                    const provider = member.serviceProvider;
                    const offeredServices = getProviderOfferedServiceTypes(provider);
                    const isEditingPricing = activeEditProviderId === provider.id;

                    return (
                      <article
                        key={member.id}
                        className="space-y-3 rounded-[14px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      >
                        <div className="space-y-1">
                          <p className="font-serif text-lg font-semibold text-[#0D1B2A]">{provider.name}</p>
                          <p className="text-sm text-[#7A7060]">Status: {member.isActive ? "Active" : "Inactive"}</p>
                          <p
                            className={`text-sm font-medium ${
                              member.areaStatus === "in_area"
                                ? "text-[#1A6B60]"
                                : member.areaStatus === "out_of_area"
                                  ? "text-[#D97706]"
                                  : "text-[#7A7060]"
                            }`}
                          >
                            {getAreaStatusLabel(member.areaStatus)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {offeredServices.map((serviceType) => (
                            <span
                              key={`${member.id}-${serviceType}`}
                              className="rounded-full bg-[#0D1B2A] px-2.5 py-1 text-xs font-medium text-[#FAF7F2]"
                            >
                              {formatServiceTypeLabel(serviceType)}
                            </span>
                          ))}
                        </div>

                        {(provider.baseCity || provider.baseState || provider.baseZipCode) ? (
                          <p className="text-sm text-[#7A7060]">
                            Service area: {[provider.baseCity, provider.baseState, provider.baseZipCode].filter(Boolean).join(", ")}
                          </p>
                        ) : null}

                        {provider.serviceRadiusMiles !== null ? (
                          <p className="text-sm text-[#7A7060]">Radius: {provider.serviceRadiusMiles} miles</p>
                        ) : null}

                        {provider.email ? (
                          <p className="text-sm text-[#7A7060]">Email: {provider.email}</p>
                        ) : provider.phone ? (
                          <p className="text-sm text-[#7A7060]">Phone: {provider.phone}</p>
                        ) : null}

                        <p className="text-sm text-[#1A1208]">
                          Cleaning price: {member.cleaningFlatRateCents !== null ? formatCentsToDollars(member.cleaningFlatRateCents) : "Not set"}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditProvider(member)}
                            className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
                          >
                            Edit price
                          </button>

                          {member.isActive ? (
                            <button
                              type="button"
                              onClick={() => void handleDeactivateTeamProvider(provider.id)}
                              disabled={savingTeamProviderId === provider.id}
                              className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#D97706] transition hover:bg-[#FFF4E5] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Remove from team
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleActivateTeamProvider(provider.id)}
                              disabled={savingTeamProviderId === provider.id}
                              className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#1A6B60] transition hover:bg-[#E8F4F1] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Activate
                            </button>
                          )}
                        </div>

                        {isEditingPricing ? (
                          <div className="space-y-3 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] p-3">
                            <p className="text-sm font-semibold text-[#0D1B2A]">Edit cleaning price</p>
                            <label className="block space-y-1">
                              <span className="text-sm text-[#1A1208]">Cleaning flat rate ($)</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={teamFlatRateDollars}
                                onChange={(event) => setTeamFlatRateDollars(event.target.value)}
                                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                                placeholder="150.00"
                              />
                            </label>

                            <label className="block space-y-1">
                              <span className="text-sm text-[#1A1208]">Cleaning hourly rate ($)</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={teamHourlyRateDollars}
                                onChange={(event) => setTeamHourlyRateDollars(event.target.value)}
                                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                                placeholder="Optional"
                              />
                            </label>

                            <label className="block space-y-1">
                              <span className="text-sm text-[#1A1208]">Pricing notes</span>
                              <textarea
                                rows={2}
                                value={teamPricingNotes}
                                onChange={(event) => setTeamPricingNotes(event.target.value)}
                                className="w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                                placeholder="Optional"
                              />
                            </label>

                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={closeProviderPricingPanel}
                                className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveTeamProviderPricing(provider.id)}
                                disabled={savingTeamProviderId === provider.id}
                                className="rounded-[10px] bg-[#0D1B2A] px-3 py-2 text-sm font-medium text-[#FAF7F2] transition hover:bg-[#13293D] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Save Price
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="font-serif text-xl font-semibold text-[#0D1B2A]">Available Providers</h3>

              {loadingTeamProviders ? null : availableTeamProviders.length === 0 ? (
                <div className="rounded-[12px] border-2 border-dashed border-[#E5E0D8] bg-[#FAF7F2] p-6 text-center">
                  <h4 className="font-serif text-lg font-semibold text-[#0D1B2A]">No available providers found.</h4>
                  <p className="mt-1 text-sm text-[#7A7060]">Providers will appear here when they are active and service your area.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {availableTeamProviders.map((available) => {
                    const provider = available.provider;
                    const offeredServices = getProviderOfferedServiceTypes(provider);
                    const isAdding = activeAddProviderId === provider.id;
                    const isOutOfArea = available.areaStatus === "out_of_area";

                    return (
                      <article
                        key={provider.id}
                        className="space-y-3 rounded-[14px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      >
                        <div className="space-y-1">
                          <p className="font-serif text-lg font-semibold text-[#0D1B2A]">{provider.name}</p>
                          <p
                            className={`text-sm font-medium ${
                              available.areaStatus === "in_area"
                                ? "text-[#1A6B60]"
                                : available.areaStatus === "out_of_area"
                                  ? "text-[#D97706]"
                                  : "text-[#7A7060]"
                            }`}
                          >
                            {getAreaStatusLabel(available.areaStatus)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {offeredServices.map((serviceType) => (
                            <span
                              key={`${provider.id}-${serviceType}`}
                              className="rounded-full bg-[#0D1B2A] px-2.5 py-1 text-xs font-medium text-[#FAF7F2]"
                            >
                              {formatServiceTypeLabel(serviceType)}
                            </span>
                          ))}
                        </div>

                        {(provider.baseCity || provider.baseState || provider.baseZipCode) ? (
                          <p className="text-sm text-[#7A7060]">
                            Service area: {[provider.baseCity, provider.baseState, provider.baseZipCode].filter(Boolean).join(", ")}
                          </p>
                        ) : null}

                        {provider.serviceRadiusMiles !== null ? (
                          <p className="text-sm text-[#7A7060]">Radius: {provider.serviceRadiusMiles} miles</p>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => startAddProvider(provider.id)}
                          disabled={isOutOfArea}
                          className={`rounded-[10px] px-3 py-2 text-sm font-medium transition ${
                            isOutOfArea
                              ? "cursor-not-allowed border border-[#E5E0D8] bg-white text-[#7A7060] opacity-60"
                              : "bg-[#0D1B2A] text-[#FAF7F2] hover:bg-[#13293D]"
                          }`}
                        >
                          {isOutOfArea ? "Outside service area" : "Add to Team"}
                        </button>

                        {isAdding ? (
                          <div className="space-y-3 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] p-3">
                            <p className="text-sm font-semibold text-[#0D1B2A]">Add {provider.name} to your team</p>
                            <label className="block space-y-1">
                              <span className="text-sm text-[#1A1208]">Cleaning flat rate ($)</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={teamFlatRateDollars}
                                onChange={(event) => setTeamFlatRateDollars(event.target.value)}
                                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                                placeholder="150.00"
                              />
                            </label>

                            <label className="block space-y-1">
                              <span className="text-sm text-[#1A1208]">Cleaning hourly rate ($)</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={teamHourlyRateDollars}
                                onChange={(event) => setTeamHourlyRateDollars(event.target.value)}
                                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                                placeholder="Optional"
                              />
                            </label>

                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={closeProviderPricingPanel}
                                className="rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleAddProviderToTeam(provider.id)}
                                disabled={savingTeamProviderId === provider.id}
                                className="rounded-[10px] bg-[#0D1B2A] px-3 py-2 text-sm font-medium text-[#FAF7F2] transition hover:bg-[#13293D] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Add to Team
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {showProviderCreationForm ? (
              <section className="space-y-3 rounded-[14px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <h3 className="text-sm font-semibold text-[#0D1B2A]">Advanced provider profile creation</h3>

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
              </section>
            ) : null}
          </section>
        ) : null}

        {ownerActiveTab === "properties" ? null : null}

        {ownerActiveTab === "overview" || ownerActiveTab === "jobs" ? (
          <section className="space-y-3">
          {ownerActiveTab === "jobs" ? null : null}

          {ownerActiveTab === "jobs" ? null : null}

          {ownerActiveTab === "jobs" ? null : null}

          {ownerActiveTab === "jobs" ? (
            <>
              <div className="space-y-1">
                <h2 className="font-serif text-3xl font-bold text-[#0D1B2A]">Jobs</h2>
                <p className="text-base text-[#7A7060]">
                  Manage assignments, pricing, and service work.
                </p>
              </div>

              <div className="rounded-[14px] border border-[#E5E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl font-semibold text-[#0D1B2A]">Create ad hoc job</h3>
                    <p className="max-w-2xl text-sm text-[#7A7060]">
                      Cleaning, maintenance, restock, or one-time work.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateJob(true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#B8860B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#9F7408]"
                  >
                    <span className="hidden sm:inline">+ New Job</span>
                    <span className="sm:hidden">+ New</span>
                  </button>
                </div>
              </div>

              {showCreateJob ? (
                <div ref={adHocJobFormRef} className="scroll-mt-4 space-y-3 rounded-[14px] border border-[#E5E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-[#0D1B2A]">Create a new job</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateJob(false);
                        setAdHocJobError("");
                        setAdHocJobSuccess("");
                      }}
                      className="rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-1.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>

                  {adHocJobError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {adHocJobError}
                    </p>
                  ) : null}

                  {adHocJobSuccess ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {adHocJobSuccess}
                    </p>
                  ) : null}

                  <AdHocJobForm
                    properties={properties}
                    providers={adHocJobProviders}
                    loading={creatingAdHocJob}
                    onSubmit={handleCreateAdHocJob}
                    onCancel={() => {
                      setShowCreateJob(false);
                      setAdHocJobError("");
                      setAdHocJobSuccess("");
                    }}
                  />
                </div>
              ) : null}

              <section className="mt-6 rounded-[14px] border border-[#E5E0D8] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-semibold text-[#0D1B2A]">Find Jobs</h3>
                  <p className="text-sm text-[#7A7060]">Filter first, then view matching jobs.</p>
                </div>

                {effectiveDashboardFilterActive ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-2">
                    <span className="inline-flex rounded-full bg-[#E8F4F1] px-3 py-1 text-xs font-medium text-[#1A6B60]">
                      Dashboard filter: {effectiveDashboardFilterLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("dashboardFilter");
                        params.delete("filter");
                        params.delete("view");
                        params.set("tab", "jobs");
                        const queryString = params.toString();
                        router.push(queryString ? `/owner?${queryString}` : "/owner?tab=jobs", {
                          scroll: false,
                        });
                        setShowJobs(false);
                        setCleaningJobStatusFilter("all");
                        setCleaningJobProviderFilter("all");
                        setCleaningJobTypeFilter("all");
                        setCleaningJobPropertyFilter("all");
                        setCleaningJobDateFilter("all");
                      }}
                      className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2]"
                    >
                      Clear filter
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label htmlFor="cleaningJobStatusFilter" className="block text-sm font-medium text-[#0D1B2A]">
                      Status
                    </label>
                    <select
                      id="cleaningJobStatusFilter"
                      value={cleaningJobStatusFilter}
                      onChange={(event) => setCleaningJobStatusFilter(event.target.value)}
                      className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                    >
                      <option value="all">All</option>
                      <option value="needs_assignment">Needs Assignment</option>
                      <option value="assigned">Assigned</option>
                      <option value="pending_acceptance">Pending Acceptance</option>
                      <option value="in_progress">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Canceled</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="cleaningJobProviderFilter" className="block text-sm font-medium text-[#0D1B2A]">
                      Provider
                    </label>
                    <select
                      id="cleaningJobProviderFilter"
                      value={cleaningJobProviderFilter}
                      onChange={(event) => setCleaningJobProviderFilter(event.target.value)}
                      className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                    >
                      <option value="all">All</option>
                      <option value="unassigned">Unassigned</option>
                      {providerFilterOptions.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="cleaningJobTypeFilter" className="block text-sm font-medium text-[#0D1B2A]">
                      Type
                    </label>
                    <select
                      id="cleaningJobTypeFilter"
                      value={cleaningJobTypeFilter}
                      onChange={(event) => setCleaningJobTypeFilter(event.target.value)}
                      className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                    >
                      <option value="all">All</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="restock">Restock</option>
                      <option value="inspection">Inspection</option>
                      <option value="laundry">Laundry</option>
                      <option value="trash_removal">Trash</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="cleaningJobPropertyFilter" className="block text-sm font-medium text-[#0D1B2A]">
                      Property
                    </label>
                    <select
                      id="cleaningJobPropertyFilter"
                      value={cleaningJobPropertyFilter}
                      onChange={(event) => setCleaningJobPropertyFilter(event.target.value)}
                      className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                    >
                      <option value="all">All</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="cleaningJobDateFilter" className="block text-sm font-medium text-[#0D1B2A]">
                      Date
                    </label>
                    <select
                      id="cleaningJobDateFilter"
                      value={cleaningJobDateFilter}
                      onChange={(event) => setCleaningJobDateFilter(event.target.value)}
                      className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                    >
                      <option value="all">All</option>
                      <option value="today">Today</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowJobs(true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0D1B2A] px-5 py-2.5 text-sm font-medium text-white shadow-[0_6px_16px_rgba(13,27,42,0.16)] transition hover:bg-[#14243A]"
                  >
                    View Jobs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCleaningJobStatusFilter("all");
                      setCleaningJobProviderFilter("all");
                      setCleaningJobTypeFilter("all");
                      setCleaningJobPropertyFilter("all");
                      setCleaningJobDateFilter("all");
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-5 py-2.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-white"
                  >
                    Reset Filters
                  </button>
                </div>
              </section>

              {cleaningJobGenerationMessage ? (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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

              {effectiveShowJobs ? (
                <section className="mt-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-semibold text-[#0D1B2A]">Matching Jobs</h3>
                    <p className="text-sm text-[#7A7060]">Showing jobs that match your filters.</p>
                    <p className="text-sm font-medium text-[#1A1208]">
                      {filteredCleaningJobs.length} job{filteredCleaningJobs.length === 1 ? "" : "s"} found
                    </p>
                  </div>

                  {!loadingCleaningJobsPropertyId && !cleaningJobsError && cleaningJobs.length === 0 ? (
                    <EmptyState
                      title="No jobs assigned yet"
                      message="Create your first job to begin dispatching work."
                      actionLabel="Create your first job"
                      onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    />
                  ) : null}

                  {!loadingCleaningJobsPropertyId && !cleaningJobsError && cleaningJobs.length > 0 && filteredCleaningJobs.length === 0 ? (
                    <div className="rounded-[12px] border-2 border-dashed border-[#E5E0D8] bg-[#FAF7F2] p-6 text-center">
                      <h4 className="font-serif text-lg font-semibold text-[#0D1B2A]">No matching jobs</h4>
                      <p className="mt-1 text-sm text-[#7A7060]">Adjust the filters or create a new ad hoc job.</p>
                    </div>
                  ) : null}

                  {!loadingCleaningJobsPropertyId && !cleaningJobsError && filteredCleaningJobs.length > 0 ? (
                    <div className="space-y-3">
                      {filteredCleaningJobs.map((job) => (
                        <CleaningJobCard
                          key={job.id}
                          job={job}
                          onOpen={handleOpenJobDetails}
                          onStatusChange={handleUpdateCleaningJobStatus}
                          statusUpdating={updatingCleaningJobId === job.id}
                          cleanerProviders={getTeamProvidersForServiceType(job.requestedServiceType)}
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

                  {openedJob ? (
                    <section className="rounded-[12px] border border-[#E5E0D8] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="font-serif text-lg font-semibold text-[#0D1B2A]">Job Details</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          {!openedJobEditMode ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenedJobEditMode(true);
                                setOpenedJobEditError("");
                                setOpenedJobEditSuccess("");
                              }}
                              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#0D1B2A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#14243A]"
                            >
                              Edit Job
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleCloseJobDetails}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-4 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-white"
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      {openedJobEditError ? (
                        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {openedJobEditError}
                        </p>
                      ) : null}

                      {openedJobEditSuccess ? (
                        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          {openedJobEditSuccess}
                        </p>
                      ) : null}

                      <div className="mt-4 grid gap-3 text-sm text-[#7A7060] sm:grid-cols-2">
                        <p><span className="font-medium text-[#1A1208]">Property:</span> {openedJob.property?.name ?? "Unknown"}</p>
                        <p><span className="font-medium text-[#1A1208]">Service:</span> {formatServiceTypeLabel(openedJob.requestedServiceType)}</p>
                        <p><span className="font-medium text-[#1A1208]">Scheduled:</span> {formatLongDateLabel(openedJob.scheduledDate)}</p>
                        {openedJob.dueTime ? <p><span className="font-medium text-[#1A1208]">Time:</span> {openedJob.dueTime}</p> : null}
                        <p><span className="font-medium text-[#1A1208]">Status:</span> {openedJob.status.replace(/_/g, " ")}</p>
                        <p><span className="font-medium text-[#1A1208]">Assigned provider:</span> {openedJob.assignedProvider?.name ?? "Unassigned"}</p>
                        <p><span className="font-medium text-[#1A1208]">Priority:</span> {openedJob.priority}</p>
                        {openedJob.estimatedDurationMinutes !== null ? (
                          <p><span className="font-medium text-[#1A1208]">Duration:</span> {openedJob.estimatedDurationMinutes} min</p>
                        ) : null}
                        {openedJob.createdAt ? (
                          <p><span className="font-medium text-[#1A1208]">Created:</span> {formatLongDateLabel(openedJob.createdAt)}</p>
                        ) : null}
                        {(openedJob.maintenanceNeeded || openedJob.restockNeeded || openedJob.damageFound) ? (
                          <p><span className="font-medium text-[#1A1208]">Issues:</span> Reported</p>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] p-4">
                        <h5 className="text-sm font-semibold text-[#0D1B2A]">Assignment</h5>
                        {!openedJobEditMode ? (
                          <>
                            <p className="text-sm text-[#7A7060]">
                              {openedJob.assignedProvider
                                ? `${openedJob.assignedProvider.name}${openedJob.assignedProvider.companyName ? ` (${openedJob.assignedProvider.companyName})` : ""}`
                                : "Unassigned"}
                            </p>
                            <p className="text-xs text-[#7A7060]">
                              {openedJob.assignedProviderId ? "Change Assignment is available in Edit Job mode." : "Assign Provider is available in Edit Job mode."}
                            </p>
                          </>
                        ) : (
                          <>
                            <label className="space-y-1 text-sm text-[#7A7060]">
                              <span className="block font-medium text-[#1A1208]">
                                {openedJob.assignedProviderId ? "Change Assignment" : "Assign Provider"}
                              </span>
                              <select
                                value={openedJobAssignmentDraft ?? ""}
                                onChange={(event) => setOpenedJobAssignmentDraft(event.target.value || null)}
                                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                              >
                                <option value="">Unassigned</option>
                                {(() => {
                                  const options = [...openedJobTeamProviders];
                                  if (
                                    openedJob.assignedProviderId &&
                                    openedJob.assignedProvider &&
                                    !options.some((provider) => provider.id === openedJob.assignedProviderId)
                                  ) {
                                    options.unshift({
                                      id: openedJob.assignedProviderId,
                                      name: `${openedJob.assignedProvider.name} (legacy assignment)`,
                                      companyName: openedJob.assignedProvider.companyName,
                                      cleaningFlatRateCents: null,
                                      cleaningHourlyRateCents: null,
                                    });
                                  }

                                  return options.map((provider) => {
                                    const label = provider.companyName
                                      ? `${provider.name} (${provider.companyName})`
                                      : provider.name;
                                    const priceLabel =
                                      openedJob.requestedServiceType === "cleaning"
                                        ? provider.cleaningFlatRateCents !== null && provider.cleaningFlatRateCents !== undefined
                                          ? ` — $${(provider.cleaningFlatRateCents / 100).toFixed(2)}`
                                          : " — Price not set"
                                        : "";
                                    return (
                                      <option key={provider.id} value={provider.id}>
                                        {label}
                                        {priceLabel}
                                      </option>
                                    );
                                  });
                                })()}
                              </select>
                            </label>

                            {openedJobTeamProviders.length === 0 ? (
                              <div className="space-y-2 rounded-[10px] border border-dashed border-[#E5E0D8] bg-white p-3">
                                <p className="text-sm text-[#D97706]">No team providers available</p>
                                <p className="text-xs text-[#7A7060]">Add a provider to My Team or choose a different service type.</p>
                                <button
                                  type="button"
                                  onClick={() => updateOwnerTab("providers")}
                                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-1.5 text-xs font-medium text-[#0D1B2A] transition hover:bg-white"
                                >
                                  Go to My Team
                                </button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className="mt-4 space-y-3 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] p-4">
                        <h5 className="text-sm font-semibold text-[#0D1B2A]">Price</h5>
                        <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#1A1208]">Job price:</span> {openedJobQuotedPrice !== null ? `$${openedJobQuotedPrice.toFixed(2)}` : <span className="text-[#D97706]">Price not set</span>}</p>
                        {openedJob.requestedServiceType === "cleaning" ? (
                          <p className="text-sm text-[#7A7060]"><span className="font-medium text-[#1A1208]">Team default:</span> {openedJobAssignedTeamProvider?.cleaningFlatRateCents !== null && openedJobAssignedTeamProvider?.cleaningFlatRateCents !== undefined ? `$${(openedJobAssignedTeamProvider.cleaningFlatRateCents / 100).toFixed(2)}` : "Not set"}</p>
                        ) : (
                          <p className="text-sm text-[#7A7060]">Price setup later for this service type.</p>
                        )}

                        {openedJobEditMode ? (
                          <>
                            <label className="space-y-1 text-sm text-[#7A7060]">
                              <span className="block font-medium text-[#1A1208]">Custom price for this job</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={openedJobPriceDraft}
                                onChange={(event) => setOpenedJobPriceDraft(event.target.value)}
                                placeholder="e.g. 150.00"
                                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                              />
                            </label>
                            <label className="space-y-1 text-sm text-[#7A7060]">
                              <span className="block font-medium text-[#1A1208]">Price notes (optional)</span>
                              <input
                                type="text"
                                value={openedJobPriceNotesDraft}
                                onChange={(event) => setOpenedJobPriceNotesDraft(event.target.value)}
                                className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                              />
                            </label>
                            <p className="text-xs text-[#7A7060]">This changes only this job, not the provider&apos;s default team price.</p>
                            {openedJobHasCustomPrice && openedJobAssignmentDraft !== openedJob.assignedProviderId ? (
                              <p className="text-xs text-[#1A6B60]">Custom job price preserved</p>
                            ) : null}
                          </>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-2 rounded-[10px] border border-[#E5E0D8] bg-[#FAF7F2] p-4">
                        <h5 className="text-sm font-semibold text-[#0D1B2A]">Notes / Instructions</h5>
                        {!openedJobEditMode ? (
                          <p className="text-sm text-[#7A7060]">{openedJob.notes || openedJob.ownerInstructions || "No notes provided."}</p>
                        ) : (
                          <textarea
                            value={openedJobNotesDraft}
                            onChange={(event) => setOpenedJobNotesDraft(event.target.value)}
                            rows={3}
                            className="w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-sm text-[#1A1208] outline-none transition focus:border-[#B8860B]"
                          />
                        )}
                      </div>

                      {openedJobEditMode ? (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCancelOpenedJobEdit}
                            disabled={savingOpenedJob}
                            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-5 py-2.5 text-sm font-medium text-[#0D1B2A] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveOpenedJobChanges()}
                            disabled={savingOpenedJob}
                            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0D1B2A] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#14243A] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingOpenedJob ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </section>
              ) : null}

              <section className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowJobSummary((previous) => !previous)}
                  className="w-full rounded-[12px] border border-[#E5E0D8] bg-white px-4 py-3 text-left shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0D1B2A]">Job Summary</span>
                      {visibleJobSummaryItems.length > 0 ? (
                        <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#E8F4F1] px-2 text-xs font-semibold text-[#0F6A5F]">
                          {visibleJobSummaryItems.length}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-sm text-[#7A7060]">{showJobSummary ? "^" : "v"}</span>
                  </div>
                </button>

                {showJobSummary ? (
                  visibleJobSummaryItems.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleJobSummaryItems.map((item) => {
                        const toneClasses =
                          item.tone === "good"
                            ? "bg-[#E8F4F1] text-[#0F6A5F]"
                            : item.tone === "urgent"
                              ? "bg-[#FDECEC] text-[#B42318]"
                              : "bg-[#FFF4E5] text-[#9A5B00]";

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setOwnerActiveQueue(item.key as OwnerActiveQueue)}
                            className={`w-full rounded-[12px] border border-[#E5E0D8] px-3 py-2 text-left transition hover:bg-[#FAF7F2] ${
                              ownerActiveQueue === item.key ? "bg-[#FAF7F2]" : "bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-[#0D1B2A]">{item.label}</span>
                              <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${toneClasses}`}>
                                {item.value}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-[12px] border border-[#E5E0D8] bg-[#FAF7F2] px-4 py-3 text-sm text-[#7A7060]">
                      No job activity to summarize.
                    </p>
                  )
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowIssuesSummary((previous) => !previous)}
                  className="w-full rounded-[12px] border border-[#E5E0D8] bg-white px-4 py-3 text-left shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition hover:bg-[#FAF7F2]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0D1B2A]">Issues Summary</span>
                      {visibleIssuesSummaryItems.length > 0 ? (
                        <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#FFF4E5] px-2 text-xs font-semibold text-[#9A5B00]">
                          {visibleIssuesSummaryItems.length}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-sm text-[#7A7060]">{showIssuesSummary ? "^" : "v"}</span>
                  </div>
                </button>

                {showIssuesSummary ? (
                  visibleIssuesSummaryItems.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleIssuesSummaryItems.map((item) => {
                        const toneClasses =
                          item.tone === "urgent"
                            ? "bg-[#FDECEC] text-[#B42318]"
                            : "bg-[#FFF4E5] text-[#9A5B00]";

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setOwnerActiveQueue(item.key as OwnerActiveQueue)}
                            className={`w-full rounded-[12px] border border-[#E5E0D8] px-3 py-2 text-left transition hover:bg-[#FAF7F2] ${
                              ownerActiveQueue === item.key ? "bg-[#FAF7F2]" : "bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-[#0D1B2A]">{item.label}</span>
                              <span className={`rounded-full px-2 py-0.5 text-sm font-semibold ${toneClasses}`}>
                                {item.value}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-[12px] border border-[#E5E0D8] bg-[#FAF7F2] px-4 py-3 text-sm text-[#7A7060]">
                      No issues reported.
                    </p>
                  )
                ) : null}
              </section>

            </>
          ) : null}
          </section>
        ) : null}

        {ownerActiveTab === "calendar" ? (
          <section className="space-y-3 rounded-[14px] border border-[#E5E0D8] bg-white p-6 shadow-[0_10px_24px_rgba(13,27,42,0.18)]">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[#0D1B2A]">Calendar</h3>
              <p className="text-sm text-[#7A7060]">
                Turnovers, cleanings, and scheduled work
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
