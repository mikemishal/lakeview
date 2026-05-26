"use client";

import { useMemo, useState } from "react";

type AdHocJobProperty = {
  id: string;
  name: string;
  address: string | null;
};

type AdHocJobProviderCapability = {
  serviceType: string;
  active: boolean;
};

type AdHocJobProvider = {
  id: string;
  name: string;
  companyName: string | null;
  serviceType: string;
  primaryServiceType: string | null;
  active: boolean;
  capabilities: AdHocJobProviderCapability[];
};

export type AdHocJobFormPayload = {
  propertyId: string;
  title: string;
  scheduledDate: string;
  dueTime: string | null;
  requestedServiceType: string;
  priority: string;
  estimatedDurationMinutes: number | null;
  ownerInstructions: string | null;
  assignedProviderId: string | null;
  ownerSelfAssigned: boolean;
};

type AdHocJobFormProps = {
  properties: AdHocJobProperty[];
  providers: AdHocJobProvider[];
  loading: boolean;
  onSubmit: (payload: AdHocJobFormPayload) => Promise<void> | void;
};

const REQUESTED_SERVICE_TYPES = [
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "restock", label: "Restock" },
  { value: "inspection", label: "Inspection" },
  { value: "laundry", label: "Laundry" },
  { value: "trash_removal", label: "Trash removal" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function normalizeServiceType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized === "cleaner" ? "cleaning" : normalized;
}

function providerMatchesServiceType(provider: AdHocJobProvider, requestedServiceType: string): boolean {
  const normalizedRequested = normalizeServiceType(requestedServiceType);
  return (
    normalizeServiceType(provider.serviceType) === normalizedRequested ||
    normalizeServiceType(provider.primaryServiceType) === normalizedRequested ||
    provider.capabilities.some(
      (capability) => capability.active && normalizeServiceType(capability.serviceType) === normalizedRequested
    )
  );
}

function parseDuration(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return "invalid";
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : "invalid";
}

export default function AdHocJobForm({ properties, providers, loading, onSubmit }: AdHocJobFormProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [requestedServiceType, setRequestedServiceType] = useState("cleaning");
  const [priority, setPriority] = useState("normal");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState("");
  const [ownerInstructions, setOwnerInstructions] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"unassigned" | "owner" | "provider">("unassigned");
  const [assignedProviderId, setAssignedProviderId] = useState("");
  const [localError, setLocalError] = useState("");

  const matchingProviders = useMemo(
    () => providers.filter((provider) => provider.active && providerMatchesServiceType(provider, requestedServiceType)),
    [providers, requestedServiceType]
  );
  const selectedProviderIsValid = matchingProviders.some((provider) => provider.id === assignedProviderId);
  const providerSelectValue = assignmentMode === "provider" && selectedProviderIsValid ? assignedProviderId : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");

    if (!propertyId || !title.trim() || !scheduledDate || !requestedServiceType) {
      setLocalError("Property, title, scheduled date, and service type are required.");
      return;
    }

    if (assignmentMode === "provider" && (!assignedProviderId || !selectedProviderIsValid || matchingProviders.length === 0)) {
      setLocalError("Select a provider for assignment.");
      return;
    }

    const parsedDuration = parseDuration(estimatedDurationMinutes);
    if (parsedDuration === "invalid") {
      setLocalError("Estimated duration must be a whole number.");
      return;
    }

    try {
      await onSubmit({
        propertyId,
        title: title.trim(),
        scheduledDate,
        dueTime: dueTime.trim() ? dueTime.trim() : null,
        requestedServiceType,
        priority,
        estimatedDurationMinutes: parsedDuration,
        ownerInstructions: ownerInstructions.trim() ? ownerInstructions.trim() : null,
        assignedProviderId: assignmentMode === "provider" && selectedProviderIsValid ? assignedProviderId : null,
        ownerSelfAssigned: assignmentMode === "owner",
      });

      setTitle("");
      setScheduledDate("");
      setDueTime("");
      setRequestedServiceType("cleaning");
      setPriority("normal");
      setEstimatedDurationMinutes("");
      setOwnerInstructions("");
      setAssignmentMode("unassigned");
      setAssignedProviderId("");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to create ad hoc job.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-slate-900">Create ad hoc job</h4>
        <p className="text-sm text-slate-600">
          Create one-off cleaning, maintenance, restock, inspection, laundry, or trash-removal jobs.
        </p>
      </div>

      {localError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{localError}</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Property</span>
          <select
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            required
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Job title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Deep clean after long stay"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Scheduled date</span>
          <input
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            required
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Due time</span>
          <input
            type="time"
            value={dueTime}
            onChange={(event) => setDueTime(event.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Requested service type</span>
          <select
            value={requestedServiceType}
            onChange={(event) => setRequestedServiceType(event.target.value)}
            required
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {REQUESTED_SERVICE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Priority</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {PRIORITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm text-slate-700">
          <span className="block font-medium text-slate-900">Estimated duration (minutes)</span>
          <input
            type="text"
            inputMode="numeric"
            value={estimatedDurationMinutes}
            onChange={(event) => setEstimatedDurationMinutes(event.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="90"
          />
        </label>
      </div>

      <label className="space-y-1 text-sm text-slate-700">
        <span className="block font-medium text-slate-900">Owner instructions</span>
        <textarea
          value={ownerInstructions}
          onChange={(event) => setOwnerInstructions(event.target.value)}
          rows={3}
          disabled={loading}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Fix bathroom sink, replace towels, etc."
        />
      </label>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-900">Assignment</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAssignmentMode("unassigned");
              setAssignedProviderId("");
            }}
            disabled={loading}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              assignmentMode === "unassigned"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Leave unassigned
          </button>
          <button
            type="button"
            onClick={() => setAssignmentMode("owner")}
            disabled={loading}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              assignmentMode === "owner"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Self-assign to owner
          </button>
          <button
            type="button"
            onClick={() => setAssignmentMode("provider")}
            disabled={loading}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              assignmentMode === "provider"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Assign to provider
          </button>
        </div>

        {assignmentMode === "provider" ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="block font-medium text-slate-900">Provider</span>
            <select
              value={providerSelectValue}
              onChange={(event) => setAssignedProviderId(event.target.value)}
              required
              disabled={loading || matchingProviders.length === 0}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Select provider</option>
              {matchingProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.companyName ? `${provider.name} (${provider.companyName})` : provider.name}
                </option>
              ))}
            </select>
            {matchingProviders.length === 0 ? (
              <p className="text-xs text-slate-500">No active providers match the selected service type.</p>
            ) : null}
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create ad hoc job"}
        </button>
      </div>
    </form>
  );
}