"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Show, SignInButton } from "@clerk/nextjs";
import AppHeader from "@/components/AppHeader";

const LocationPickerMap = dynamic(() => import("@/components/onboarding/LocationPickerMap"), {
  ssr: false,
});

type AccountType = "owner" | "provider" | "both";

type AccountProfile = {
  id: string;
  onboardingComplete: boolean;
  inviteCodeVerified: boolean;
  inviteCodeVerifiedAt: string | null;
  name: string;
  phone: string | null;
  companyName: string | null;
};

type OwnerProfile = {
  id: string;
  onboardingComplete: boolean;
  name: string;
  phone: string | null;
  companyName: string | null;
  propertyCountry: string | null;
  propertyState: string | null;
  propertyCity: string | null;
  propertyNeighborhood: string | null;
  propertyStreetAddress: string | null;
  propertyUnit: string | null;
  propertyPostalCode: string | null;
  propertyLatitude: number | null;
  propertyLongitude: number | null;
};

type ProviderCapability = {
  id: string;
  serviceType: string;
  active: boolean;
};

type ServiceProvider = {
  id: string;
  onboardingComplete: boolean;
  name: string;
  phone: string | null;
  companyName: string | null;
  capabilities: ProviderCapability[];
  primaryServiceType: string | null;
  baseAddress: string | null;
  serviceCountry: string | null;
  baseCity: string | null;
  baseState: string | null;
  serviceNeighborhood: string | null;
  baseZipCode: string | null;
  serviceRadiusMiles: number | null;
  serviceAreaNotes: string | null;
  latitude: number | null;
  longitude: number | null;
  baseRateCents: number | null;
  hourlyRateCents: number | null;
};

type GeocodeResult = {
  label: string;
  latitude: number;
  longitude: number;
  country: string;
  state: string;
  city: string;
  neighborhood: string;
  streetAddress: string;
  postalCode: string;
};

type OnboardingProfileResponse = {
  accountProfile: AccountProfile | null;
  ownerProfile: OwnerProfile | null;
  serviceProvider: ServiceProvider | null;
};

type ApiError = {
  error: string;
};

const SERVICE_OPTIONS = [
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "restock", label: "Restock" },
  { value: "inspection", label: "Inspection" },
  { value: "laundry", label: "Laundry" },
  { value: "trash_removal", label: "Trash removal" },
] as const;

const DEFAULT_MAP_CENTER = { lat: 39.5, lng: -98.35 };

function parseNullableInt(value: string): number | null | "invalid" {
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

function parseDollarToCents(value: string): number | null | "invalid" {
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

function formatCentsToDollars(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return (value / 100).toFixed(2);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [serviceProvider, setServiceProvider] = useState<ServiceProvider | null>(null);

  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [ownerCountry, setOwnerCountry] = useState("");
  const [ownerState, setOwnerState] = useState("");
  const [ownerCity, setOwnerCity] = useState("");
  const [ownerNeighborhood, setOwnerNeighborhood] = useState("");
  const [ownerStreetAddress, setOwnerStreetAddress] = useState("");
  const [ownerUnit, setOwnerUnit] = useState("");
  const [ownerPostalCode, setOwnerPostalCode] = useState("");
  const [ownerLatitude, setOwnerLatitude] = useState<number | null>(null);
  const [ownerLongitude, setOwnerLongitude] = useState<number | null>(null);
  const [ownerLocationQuery, setOwnerLocationQuery] = useState("");

  const [providerCapabilities, setProviderCapabilities] = useState<string[]>(["cleaning"]);
  const [providerPrimaryService, setProviderPrimaryService] = useState("cleaning");
  const [providerBaseAddress, setProviderBaseAddress] = useState("");
  const [providerCountry, setProviderCountry] = useState("");
  const [providerBaseCity, setProviderBaseCity] = useState("");
  const [providerBaseState, setProviderBaseState] = useState("");
  const [providerNeighborhood, setProviderNeighborhood] = useState("");
  const [providerBaseZipCode, setProviderBaseZipCode] = useState("");
  const [providerLatitude, setProviderLatitude] = useState<number | null>(null);
  const [providerLongitude, setProviderLongitude] = useState<number | null>(null);
  const [providerLocationQuery, setProviderLocationQuery] = useState("");
  const [providerServiceRadiusMiles, setProviderServiceRadiusMiles] = useState("");
  const [providerServiceAreaNotes, setProviderServiceAreaNotes] = useState("");
  const [providerBaseRateDollars, setProviderBaseRateDollars] = useState("");
  const [providerHourlyRateDollars, setProviderHourlyRateDollars] = useState("");
  const [isGeocodeLoading, setIsGeocodeLoading] = useState(false);

  const hasOwnerProfile = Boolean(ownerProfile?.onboardingComplete);
  const hasProviderProfile = Boolean(serviceProvider?.onboardingComplete);
  const hasBothProfiles = hasOwnerProfile && hasProviderProfile;

  const shouldShowOwnerFields = selectedAccountType === "owner" || selectedAccountType === "both";
  const shouldShowProviderFields =
    selectedAccountType === "provider" || selectedAccountType === "both";
  const requiresInviteCode = accountProfile?.inviteCodeVerified !== true;

  const primaryServiceOptions = useMemo(
    () => SERVICE_OPTIONS.filter((option) => providerCapabilities.includes(option.value)),
    [providerCapabilities]
  );

  const effectivePrimaryService = providerCapabilities.includes(providerPrimaryService)
    ? providerPrimaryService
    : providerCapabilities[0] ?? "cleaning";

  const ownerMapCenter =
    ownerLatitude !== null && ownerLongitude !== null
      ? { lat: ownerLatitude, lng: ownerLongitude }
      : DEFAULT_MAP_CENTER;

  const providerMapCenter =
    providerLatitude !== null && providerLongitude !== null
      ? { lat: providerLatitude, lng: providerLongitude }
      : DEFAULT_MAP_CENTER;

  const applyOwnerGeocode = useCallback((location: GeocodeResult) => {
    setOwnerCountry(location.country);
    setOwnerState(location.state);
    setOwnerCity(location.city);
    setOwnerNeighborhood(location.neighborhood);
    setOwnerStreetAddress(location.streetAddress);
    setOwnerPostalCode(location.postalCode);
    setOwnerLatitude(location.latitude);
    setOwnerLongitude(location.longitude);
  }, []);

  const applyProviderGeocode = useCallback((location: GeocodeResult) => {
    setProviderCountry(location.country);
    setProviderBaseState(location.state);
    setProviderBaseCity(location.city);
    setProviderNeighborhood(location.neighborhood);
    setProviderBaseAddress(location.streetAddress);
    setProviderBaseZipCode(location.postalCode);
    setProviderLatitude(location.latitude);
    setProviderLongitude(location.longitude);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodeResult | null> => {
    const response = await fetch(`/api/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`);
    const data = (await response.json()) as { result?: GeocodeResult; error?: string };

    if (!response.ok || !data.result) {
      return null;
    }

    return data.result;
  }, []);

  const geocodeAddress = useCallback(async (query: string): Promise<GeocodeResult | null> => {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const data = (await response.json()) as { results?: GeocodeResult[]; error?: string };

    if (!response.ok || !data.results || data.results.length === 0) {
      return null;
    }

    return data.results[0];
  }, []);

  const loadProfileState = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/profile");
      const data = (await response.json()) as OnboardingProfileResponse | ApiError;

      if (!response.ok) {
        setError((data as ApiError).error || "Failed to load onboarding profile.");
        return;
      }

      const result = data as OnboardingProfileResponse;
      setAccountProfile(result.accountProfile);
      setOwnerProfile(result.ownerProfile);
      setServiceProvider(result.serviceProvider);

      const defaultName =
        result.accountProfile?.name || result.ownerProfile?.name || result.serviceProvider?.name || "";
      const defaultCompanyName =
        result.accountProfile?.companyName ||
        result.ownerProfile?.companyName ||
        result.serviceProvider?.companyName ||
        "";
      const defaultPhone =
        result.accountProfile?.phone || result.ownerProfile?.phone || result.serviceProvider?.phone || "";

      setName(defaultName);
      setCompanyName(defaultCompanyName);
      setPhone(defaultPhone);

      if (result.ownerProfile) {
        setOwnerCountry(result.ownerProfile.propertyCountry ?? "");
        setOwnerState(result.ownerProfile.propertyState ?? "");
        setOwnerCity(result.ownerProfile.propertyCity ?? "");
        setOwnerNeighborhood(result.ownerProfile.propertyNeighborhood ?? "");
        setOwnerStreetAddress(result.ownerProfile.propertyStreetAddress ?? "");
        setOwnerUnit(result.ownerProfile.propertyUnit ?? "");
        setOwnerPostalCode(result.ownerProfile.propertyPostalCode ?? "");
        setOwnerLatitude(result.ownerProfile.propertyLatitude ?? null);
        setOwnerLongitude(result.ownerProfile.propertyLongitude ?? null);
      }

      if (result.accountProfile?.inviteCodeVerified) {
        setInviteCode("");
      }

      if (result.serviceProvider) {
        const defaultCapabilities = result.serviceProvider.capabilities
          .filter((capability) => capability.active)
          .map((capability) => capability.serviceType);

        setProviderCapabilities(defaultCapabilities.length > 0 ? defaultCapabilities : ["cleaning"]);
        setProviderPrimaryService(
          result.serviceProvider.primaryServiceType ?? defaultCapabilities[0] ?? "cleaning"
        );
        setProviderBaseAddress(result.serviceProvider.baseAddress ?? "");
        setProviderCountry(result.serviceProvider.serviceCountry ?? "");
        setProviderBaseCity(result.serviceProvider.baseCity ?? "");
        setProviderBaseState(result.serviceProvider.baseState ?? "");
        setProviderNeighborhood(result.serviceProvider.serviceNeighborhood ?? "");
        setProviderBaseZipCode(result.serviceProvider.baseZipCode ?? "");
        setProviderLatitude(result.serviceProvider.latitude ?? null);
        setProviderLongitude(result.serviceProvider.longitude ?? null);
        setProviderServiceRadiusMiles(
          result.serviceProvider.serviceRadiusMiles !== null &&
            result.serviceProvider.serviceRadiusMiles !== undefined
            ? String(result.serviceProvider.serviceRadiusMiles)
            : ""
        );
        setProviderServiceAreaNotes(result.serviceProvider.serviceAreaNotes ?? "");
        setProviderBaseRateDollars(formatCentsToDollars(result.serviceProvider.baseRateCents));
        setProviderHourlyRateDollars(formatCentsToDollars(result.serviceProvider.hourlyRateCents));
      }
    } catch {
      setError("Failed to load onboarding profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfileState();
  }, [loadProfileState]);

  function toggleCapability(serviceType: string, checked: boolean) {
    setProviderCapabilities((previous) => {
      if (checked) {
        return previous.includes(serviceType) ? previous : [...previous, serviceType];
      }

      return previous.filter((value) => value !== serviceType);
    });
  }

  async function handleFindOwnerLocation() {
    const query = ownerLocationQuery.trim();
    if (!query) {
      setError("Enter an owner address or city to search.");
      return;
    }

    setError("");
    setIsGeocodeLoading(true);
    try {
      const location = await geocodeAddress(query);
      if (!location) {
        setError("No matching owner location found.");
        return;
      }

      applyOwnerGeocode(location);
    } catch {
      setError("Failed to geocode owner location.");
    } finally {
      setIsGeocodeLoading(false);
    }
  }

  async function handleFindProviderLocation() {
    const query = providerLocationQuery.trim();
    if (!query) {
      setError("Enter a provider base address or city to search.");
      return;
    }

    setError("");
    setIsGeocodeLoading(true);
    try {
      const location = await geocodeAddress(query);
      if (!location) {
        setError("No matching provider location found.");
        return;
      }

      applyProviderGeocode(location);
    } catch {
      setError("Failed to geocode provider location.");
    } finally {
      setIsGeocodeLoading(false);
    }
  }

  async function handleOwnerMapPick(lat: number, lng: number) {
    setOwnerLatitude(lat);
    setOwnerLongitude(lng);

    try {
      const location = await reverseGeocode(lat, lng);
      if (location) {
        applyOwnerGeocode(location);
      }
    } catch {
      // Keep map-selected coordinates even if reverse geocoding fails.
    }
  }

  async function handleProviderMapPick(lat: number, lng: number) {
    setProviderLatitude(lat);
    setProviderLongitude(lng);

    try {
      const location = await reverseGeocode(lat, lng);
      if (location) {
        applyProviderGeocode(location);
      }
    } catch {
      // Keep map-selected coordinates even if reverse geocoding fails.
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    if (!selectedAccountType) {
      setError("Choose an account type.");
      setSaving(false);
      return;
    }

    const submissionAccountType = selectedAccountType;

    const trimmedName = name.trim();
    const trimmedInviteCode = inviteCode.trim();

    if (!trimmedName) {
      setError("Name is required.");
      setSaving(false);
      return;
    }

    if (requiresInviteCode && !trimmedInviteCode) {
      setError("Invite code is required.");
      setSaving(false);
      return;
    }

    let serviceRadiusMiles: number | null | "invalid" = null;
    let baseRateCents: number | null | "invalid" = null;
    let hourlyRateCents: number | null | "invalid" = null;

    if (shouldShowProviderFields) {
      if (providerCapabilities.length === 0) {
        setError("At least one valid service capability is required.");
        setSaving(false);
        return;
      }

      serviceRadiusMiles = parseNullableInt(providerServiceRadiusMiles);
      baseRateCents = parseDollarToCents(providerBaseRateDollars);
      hourlyRateCents = parseDollarToCents(providerHourlyRateDollars);

      if (
        serviceRadiusMiles === "invalid" ||
        baseRateCents === "invalid" ||
        hourlyRateCents === "invalid"
      ) {
        setError("Invalid numeric field value.");
        setSaving(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountType: submissionAccountType,
          inviteCode: requiresInviteCode ? trimmedInviteCode : undefined,
          name: trimmedName,
          companyName,
          phone,
          propertyCountry: shouldShowOwnerFields ? ownerCountry : undefined,
          propertyState: shouldShowOwnerFields ? ownerState : undefined,
          propertyCity: shouldShowOwnerFields ? ownerCity : undefined,
          propertyNeighborhood: shouldShowOwnerFields ? ownerNeighborhood : undefined,
          propertyStreetAddress: shouldShowOwnerFields ? ownerStreetAddress : undefined,
          propertyUnit: shouldShowOwnerFields ? ownerUnit : undefined,
          propertyPostalCode: shouldShowOwnerFields ? ownerPostalCode : undefined,
          propertyLatitude: shouldShowOwnerFields ? ownerLatitude : undefined,
          propertyLongitude: shouldShowOwnerFields ? ownerLongitude : undefined,
          capabilities: shouldShowProviderFields ? providerCapabilities : undefined,
          primaryServiceType: shouldShowProviderFields ? effectivePrimaryService : undefined,
          baseAddress: shouldShowProviderFields ? providerBaseAddress : undefined,
          serviceCountry: shouldShowProviderFields ? providerCountry : undefined,
          baseCity: shouldShowProviderFields ? providerBaseCity : undefined,
          baseState: shouldShowProviderFields ? providerBaseState : undefined,
          serviceNeighborhood: shouldShowProviderFields ? providerNeighborhood : undefined,
          baseZipCode: shouldShowProviderFields ? providerBaseZipCode : undefined,
          latitude: shouldShowProviderFields ? providerLatitude : undefined,
          longitude: shouldShowProviderFields ? providerLongitude : undefined,
          serviceRadiusMiles: shouldShowProviderFields ? serviceRadiusMiles : undefined,
          serviceAreaNotes: shouldShowProviderFields ? providerServiceAreaNotes : undefined,
          baseRateCents: shouldShowProviderFields ? baseRateCents : undefined,
          hourlyRateCents: shouldShowProviderFields ? hourlyRateCents : undefined,
        }),
      });

      const data = (await response.json()) as ApiError;
      if (!response.ok) {
        setError(data.error || "Failed to save onboarding profile.");
        return;
      }

      const redirectPath = submissionAccountType === "provider" ? "/provider" : "/owner";
      router.push(redirectPath);
      return;
    } catch {
      setError("Failed to save onboarding profile.");
    } finally {
      setSaving(false);
    }
  }

  const submitLabel =
    selectedAccountType === "owner"
      ? "Create owner profile"
      : selectedAccountType === "provider"
      ? "Create provider profile"
      : "Create owner and provider profiles";

  const roleContext = hasBothProfiles
    ? "both"
    : hasOwnerProfile
    ? "owner"
    : hasProviderProfile
    ? "provider"
    : undefined;

  return (
    <>
      <AppHeader
        currentSection="onboarding"
        roleContext={roleContext}
        showProfilesLink
        showOwnerLink={hasOwnerProfile}
        showProviderLink={hasProviderProfile}
        showPropertiesLink={hasOwnerProfile}
        showJobsLink={hasOwnerProfile || hasProviderProfile}
      />
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#e2e8f0_55%,_#cbd5e1_100%)] px-4 py-12">
        <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/40">
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Project Lakeview
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Account onboarding</h1>
            <p className="text-sm text-slate-600">Complete your role setup once, then start working.</p>
          </div>

          <Show when="signed-out">
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-700">Sign in to set up owner or provider access.</p>
              <SignInButton mode="modal">
                <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
                  Sign in
                </button>
              </SignInButton>
            </div>
          </Show>

          <Show when="signed-in">
            {loading ? <p className="mt-6 text-sm text-slate-600">Loading onboarding profile...</p> : null}

            {error ? (
              <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {successMessage}
              </p>
            ) : null}

            {!loading ? (
              <div className="mt-6 space-y-4">
                {hasBothProfiles ? (
                  <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">
                      Your account is set up for owner and provider access.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/owner"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        Owner Dashboard
                      </Link>
                      <Link
                        href="/provider"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        Provider Dashboard
                      </Link>
                    </div>
                  </section>
                ) : null}

                {hasOwnerProfile && !hasProviderProfile ? (
                  <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Your owner profile is complete.</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/owner"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        Owner Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelectedAccountType("provider")}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Add provider access
                      </button>
                    </div>
                  </section>
                ) : null}

                {!hasOwnerProfile && hasProviderProfile ? (
                  <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Your provider profile is complete.</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/provider"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        Provider Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelectedAccountType("owner")}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Add owner access
                      </button>
                    </div>
                  </section>
                ) : null}

                {!hasOwnerProfile && !hasProviderProfile ? (
                  <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Choose account type</h2>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAccountType("owner")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                          selectedAccountType === "owner"
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Owner
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAccountType("provider")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                          selectedAccountType === "provider"
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Provider
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAccountType("both")}
                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                          selectedAccountType === "both"
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Both
                      </button>
                    </div>
                  </section>
                ) : null}

                {selectedAccountType && !hasBothProfiles ? (
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <h2 className="text-lg font-semibold text-slate-900">
                      {selectedAccountType === "owner"
                        ? "Owner setup"
                        : selectedAccountType === "provider"
                        ? "Provider setup"
                        : "Owner and provider setup"}
                    </h2>

                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Name"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />

                    {requiresInviteCode ? (
                      <label className="block space-y-1">
                        <span className="text-sm font-medium text-slate-900">Invite code</span>
                        <input
                          value={inviteCode}
                          onChange={(event) => setInviteCode(event.target.value)}
                          placeholder="Enter invite code"
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                        />
                        <span className="text-xs text-slate-600">
                          This test environment requires an invite code.
                        </span>
                      </label>
                    ) : null}

                    <input
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      placeholder="Company name (optional)"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Phone (optional)"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                    />

                    {shouldShowOwnerFields ? (
                      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                        <h3 className="text-sm font-semibold text-slate-900">Owner property location</h3>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={ownerLocationQuery}
                            onChange={(event) => setOwnerLocationQuery(event.target.value)}
                            placeholder="Search property address or city"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <button
                            type="button"
                            onClick={() => void handleFindOwnerLocation()}
                            disabled={isGeocodeLoading}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Find on map
                          </button>
                        </div>
                        <LocationPickerMap
                          center={ownerMapCenter}
                          markerPosition={
                            ownerLatitude !== null && ownerLongitude !== null
                              ? { lat: ownerLatitude, lng: ownerLongitude }
                              : null
                          }
                          onPickLocation={(lat, lng) => {
                            void handleOwnerMapPick(lat, lng);
                          }}
                        />
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            value={ownerCountry}
                            onChange={(event) => setOwnerCountry(event.target.value)}
                            placeholder="Country"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={ownerState}
                            onChange={(event) => setOwnerState(event.target.value)}
                            placeholder="State"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={ownerCity}
                            onChange={(event) => setOwnerCity(event.target.value)}
                            placeholder="City"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={ownerNeighborhood}
                            onChange={(event) => setOwnerNeighborhood(event.target.value)}
                            placeholder="Neighborhood"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={ownerStreetAddress}
                            onChange={(event) => setOwnerStreetAddress(event.target.value)}
                            placeholder="Street address"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 md:col-span-2"
                          />
                          <input
                            value={ownerUnit}
                            onChange={(event) => setOwnerUnit(event.target.value)}
                            placeholder="Unit or apt (optional)"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={ownerPostalCode}
                            onChange={(event) => setOwnerPostalCode(event.target.value)}
                            placeholder="Postal code"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                        </div>
                      </section>
                    ) : null}

                    {shouldShowProviderFields ? (
                      <>
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium text-slate-900">Capabilities</legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {SERVICE_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={providerCapabilities.includes(option.value)}
                                  onChange={(event) =>
                                    toggleCapability(option.value, event.target.checked)
                                  }
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <label className="block space-y-1">
                          <span className="text-sm font-medium text-slate-900">Primary service</span>
                          <select
                            value={effectivePrimaryService}
                            onChange={(event) => setProviderPrimaryService(event.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          >
                            {primaryServiceOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="grid gap-2 md:grid-cols-3">
                          <input
                            value={providerCountry}
                            onChange={(event) => setProviderCountry(event.target.value)}
                            placeholder="Country"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={providerBaseCity}
                            onChange={(event) => setProviderBaseCity(event.target.value)}
                            placeholder="Base city"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={providerBaseState}
                            onChange={(event) => setProviderBaseState(event.target.value)}
                            placeholder="Base state"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={providerBaseZipCode}
                            onChange={(event) => setProviderBaseZipCode(event.target.value)}
                            placeholder="Base ZIP"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                        </div>

                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            value={providerNeighborhood}
                            onChange={(event) => setProviderNeighborhood(event.target.value)}
                            placeholder="Neighborhood"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={providerBaseAddress}
                            onChange={(event) => setProviderBaseAddress(event.target.value)}
                            placeholder="Base street address"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={providerLocationQuery}
                            onChange={(event) => setProviderLocationQuery(event.target.value)}
                            placeholder="Search provider base location"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <button
                            type="button"
                            onClick={() => void handleFindProviderLocation()}
                            disabled={isGeocodeLoading}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Find on map
                          </button>
                        </div>

                        <LocationPickerMap
                          center={providerMapCenter}
                          markerPosition={
                            providerLatitude !== null && providerLongitude !== null
                              ? { lat: providerLatitude, lng: providerLongitude }
                              : null
                          }
                          radiusMiles={
                            providerServiceRadiusMiles.trim()
                              ? Number(providerServiceRadiusMiles)
                              : null
                          }
                          onPickLocation={(lat, lng) => {
                            void handleProviderMapPick(lat, lng);
                          }}
                        />

                        <input
                          value={providerServiceRadiusMiles}
                          onChange={(event) => setProviderServiceRadiusMiles(event.target.value)}
                          placeholder="Service radius miles"
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                        />
                        <textarea
                          value={providerServiceAreaNotes}
                          onChange={(event) => setProviderServiceAreaNotes(event.target.value)}
                          placeholder="Service area notes"
                          rows={2}
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                        />

                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            value={providerBaseRateDollars}
                            onChange={(event) => setProviderBaseRateDollars(event.target.value)}
                            placeholder="Base rate ($)"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                          <input
                            value={providerHourlyRateDollars}
                            onChange={(event) => setProviderHourlyRateDollars(event.target.value)}
                            placeholder="Hourly rate ($)"
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                          />
                        </div>
                      </>
                    ) : null}

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving..." : submitLabel}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </Show>
        </section>
      </main>
    </>
  );
}
