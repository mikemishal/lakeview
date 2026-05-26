"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Show, SignInButton } from "@clerk/nextjs";

type OwnerProfile = {
  id: string;
  onboardingComplete: boolean;
};

type ProviderCapability = {
  id: string;
  serviceType: string;
  active: boolean;
};

type ServiceProvider = {
  id: string;
  onboardingComplete: boolean;
  capabilities: ProviderCapability[];
};

type OnboardingProfileResponse = {
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

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [serviceProvider, setServiceProvider] = useState<ServiceProvider | null>(null);
  const [accountType, setAccountType] = useState<"owner" | "provider" | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [ownerCompanyName, setOwnerCompanyName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  const [providerName, setProviderName] = useState("");
  const [providerCompanyName, setProviderCompanyName] = useState("");
  const [providerPhone, setProviderPhone] = useState("");
  const [providerCapabilities, setProviderCapabilities] = useState<string[]>(["cleaning"]);
  const [providerPrimaryService, setProviderPrimaryService] = useState("cleaning");
  const [providerBaseCity, setProviderBaseCity] = useState("");
  const [providerBaseState, setProviderBaseState] = useState("");
  const [providerBaseZipCode, setProviderBaseZipCode] = useState("");
  const [providerServiceRadiusMiles, setProviderServiceRadiusMiles] = useState("");
  const [providerServiceAreaNotes, setProviderServiceAreaNotes] = useState("");
  const [providerBaseRateDollars, setProviderBaseRateDollars] = useState("");
  const [providerHourlyRateDollars, setProviderHourlyRateDollars] = useState("");

  const hasOwnerProfile = Boolean(ownerProfile?.onboardingComplete);
  const hasProviderProfile = Boolean(serviceProvider?.onboardingComplete);

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/onboarding/profile");
        const data = (await response.json()) as OnboardingProfileResponse | ApiError;

        if (!response.ok) {
          if (isActive) {
            setError((data as ApiError).error || "Failed to load onboarding profile.");
          }
          return;
        }

        if (!isActive) {
          return;
        }

        const result = data as OnboardingProfileResponse;
        setOwnerProfile(result.ownerProfile);
        setServiceProvider(result.serviceProvider);
      } catch {
        if (isActive) {
          setError("Failed to load onboarding profile.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const primaryServiceOptions = useMemo(
    () => SERVICE_OPTIONS.filter((option) => providerCapabilities.includes(option.value)),
    [providerCapabilities]
  );

  const effectivePrimaryService = providerCapabilities.includes(providerPrimaryService)
    ? providerPrimaryService
    : providerCapabilities[0] ?? "cleaning";

  function toggleCapability(serviceType: string, checked: boolean) {
    setProviderCapabilities((previous) => {
      if (checked) {
        return previous.includes(serviceType) ? previous : [...previous, serviceType];
      }

      return previous.filter((value) => value !== serviceType);
    });
  }

  async function handleOwnerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountType: "owner",
          name: ownerName,
          companyName: ownerCompanyName,
          phone: ownerPhone,
        }),
      });

      const data = (await response.json()) as ApiError;
      if (!response.ok) {
        setError(data.error || "Failed to save onboarding profile.");
        return;
      }

      router.push("/owner");
    } catch {
      setError("Failed to save onboarding profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleProviderSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    if (providerCapabilities.length === 0) {
      setError("At least one valid service capability is required.");
      setSaving(false);
      return;
    }

    const serviceRadiusMiles = parseNullableInt(providerServiceRadiusMiles);
    const baseRateCents = parseDollarToCents(providerBaseRateDollars);
    const hourlyRateCents = parseDollarToCents(providerHourlyRateDollars);

    if (
      serviceRadiusMiles === "invalid" ||
      baseRateCents === "invalid" ||
      hourlyRateCents === "invalid"
    ) {
      setError("Invalid numeric field value.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountType: "provider",
          name: providerName,
          companyName: providerCompanyName,
          phone: providerPhone,
          capabilities: providerCapabilities,
          primaryServiceType: effectivePrimaryService,
          baseCity: providerBaseCity,
          baseState: providerBaseState,
          baseZipCode: providerBaseZipCode,
          serviceRadiusMiles,
          serviceAreaNotes: providerServiceAreaNotes,
          baseRateCents,
          hourlyRateCents,
        }),
      });

      const data = (await response.json()) as ApiError;
      if (!response.ok) {
        setError(data.error || "Failed to save onboarding profile.");
        return;
      }

      router.push("/provider");
    } catch {
      setError("Failed to save onboarding profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fafc_0%,_#e2e8f0_55%,_#cbd5e1_100%)] px-4 py-12">
      <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/40">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Project Lakeview</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Account onboarding</h1>
          <p className="text-sm text-slate-600">
            Choose your role and create the matching profile linked to your signed-in account.
          </p>
        </div>

        <Show when="signed-out">
          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-700">Sign in to create your owner or provider profile.</p>
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
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}

          {!loading && hasOwnerProfile ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">You already have an owner profile.</p>
              <Link
                href="/owner"
                className="mt-3 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Go to Owner Dashboard
              </Link>
            </div>
          ) : null}

          {!loading && hasProviderProfile ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">You already have a provider profile.</p>
              <Link
                href="/provider"
                className="mt-3 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Go to Provider Dashboard
              </Link>
            </div>
          ) : null}

          {!loading && !hasOwnerProfile && !hasProviderProfile ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAccountType("owner")}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    accountType === "owner"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Owner
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("provider")}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    accountType === "provider"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Provider
                </button>
              </div>

              {accountType === "owner" ? (
                <form onSubmit={handleOwnerSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">Create owner profile</h2>
                  <input
                    value={ownerName}
                    onChange={(event) => setOwnerName(event.target.value)}
                    placeholder="Name"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                  <input
                    value={ownerCompanyName}
                    onChange={(event) => setOwnerCompanyName(event.target.value)}
                    placeholder="Company name (optional)"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                  <input
                    value={ownerPhone}
                    onChange={(event) => setOwnerPhone(event.target.value)}
                    placeholder="Phone (optional)"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Create owner profile"}
                  </button>
                </form>
              ) : null}

              {accountType === "provider" ? (
                <form onSubmit={handleProviderSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">Create provider profile</h2>
                  <input
                    value={providerName}
                    onChange={(event) => setProviderName(event.target.value)}
                    placeholder="Name"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                  <input
                    value={providerCompanyName}
                    onChange={(event) => setProviderCompanyName(event.target.value)}
                    placeholder="Company name (optional)"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />
                  <input
                    value={providerPhone}
                    onChange={(event) => setProviderPhone(event.target.value)}
                    placeholder="Phone (optional)"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                  />

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-slate-900">Capabilities</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {SERVICE_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={providerCapabilities.includes(option.value)}
                            onChange={(event) => toggleCapability(option.value, event.target.checked)}
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

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Create provider profile"}
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
        </Show>
      </section>
    </main>
  );
}
