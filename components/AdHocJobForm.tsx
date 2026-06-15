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
  onCancel?: () => void;
};

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

export default function AdHocJobForm({ properties, providers, loading, onSubmit, onCancel }: AdHocJobFormProps) {
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

  const showOtherServicePicker = requestedServiceType === "laundry" || requestedServiceType === "trash_removal";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[14px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sm:p-5"
      style={{ fontFamily: "Georgia, Palatino, serif" }}
    >
      <div className="space-y-1">
        <h4 className="text-xl font-semibold text-[#0D1B2A]">Create ad hoc job</h4>
        <p className="text-sm text-[#7A7060]">
          Schedule one-time cleaning, maintenance, restock, or owner task.
        </p>
      </div>

      {localError ? (
        <p className="rounded-lg border border-[#F2C2BD] bg-[#FDECEC] px-3 py-2 text-sm text-[#B42318]">{localError}</p>
      ) : null}

      <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A]">⊞ Property</h5>
        <label className="space-y-1 text-sm text-[#7A7060]">
          <span className="block font-medium text-[#1A1208]">Property</span>
          <select
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            required
            disabled={loading}
            className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A]">✦ Job Details</h5>
        <label className="space-y-1 text-sm text-[#7A7060]">
          <span className="block font-medium text-[#1A1208]">Job title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            disabled={loading}
            className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] placeholder:text-[#7A7060] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Deep clean after long stay"
          />
        </label>

        <label className="space-y-1 text-sm text-[#7A7060]">
          <span className="block font-medium text-[#1A1208]">Owner instructions</span>
          <textarea
            value={ownerInstructions}
            onChange={(event) => setOwnerInstructions(event.target.value)}
            rows={3}
            disabled={loading}
            className="w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] placeholder:text-[#7A7060] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Fix bathroom sink, replace towels, etc."
          />
        </label>
      </div>

      <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A]">🧹 Service</h5>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Cleaning", value: "cleaning" },
            { label: "Maintenance", value: "maintenance" },
            { label: "Restock", value: "restock" },
            { label: "Inspection", value: "inspection" },
            { label: "Other", value: "laundry" },
          ].map((chip) => {
            const isActive = chip.value === "laundry"
              ? requestedServiceType === "laundry" || requestedServiceType === "trash_removal"
              : requestedServiceType === chip.value;

            return (
              <button
                key={chip.label}
                type="button"
                disabled={loading}
                onClick={() => setRequestedServiceType(chip.value)}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-[#0D1B2A] bg-[#0D1B2A] text-[#FAF7F2]"
                    : "border-[#E5E0D8] bg-white text-[#0D1B2A] hover:bg-[#FAF7F2]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {showOtherServicePicker ? (
          <label className="space-y-1 text-sm text-[#7A7060]">
            <span className="block font-medium text-[#1A1208]">Other service type</span>
            <select
              value={requestedServiceType}
              onChange={(event) => setRequestedServiceType(event.target.value)}
              required
              disabled={loading}
              className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="laundry">Laundry</option>
              <option value="trash_removal">Trash removal</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A]">⏱ Schedule</h5>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-[#7A7060]">
            <span className="block font-medium text-[#1A1208]">Date</span>
            <input
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              required
              disabled={loading}
              className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-1 text-sm text-[#7A7060]">
            <span className="block font-medium text-[#1A1208]">Time</span>
            <input
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              disabled={loading}
              className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-[#7A7060]">
            <span className="block font-medium text-[#1A1208]">Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={loading}
              className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {PRIORITIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-[#7A7060]">
            <span className="block font-medium text-[#1A1208]">Duration (minutes)</span>
            <input
              type="text"
              inputMode="numeric"
              value={estimatedDurationMinutes}
              onChange={(event) => setEstimatedDurationMinutes(event.target.value)}
              disabled={loading}
              className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] placeholder:text-[#7A7060] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="90"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3 border-t border-[#E5E0D8] pt-4">
        <h5 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0D1B2A]">👤 Assignment</h5>

        <label className="space-y-1 text-sm text-[#7A7060]">
          <span className="block font-medium text-[#1A1208]">Assignment mode</span>
          <select
            value={assignmentMode}
            onChange={(event) => {
              const nextValue = event.target.value as "unassigned" | "owner" | "provider";
              setAssignmentMode(nextValue);
              if (nextValue !== "provider") {
                setAssignedProviderId("");
              }
            }}
            disabled={loading}
            className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="unassigned">Leave unassigned</option>
            <option value="owner">Self-assign to owner</option>
            <option value="provider">Assign to provider</option>
          </select>
        </label>

        {assignmentMode === "provider" ? (
          <label className="space-y-1 text-sm text-[#7A7060]">
            <span className="block font-medium text-[#1A1208]">Provider</span>
            <select
              value={providerSelectValue}
              onChange={(event) => setAssignedProviderId(event.target.value)}
              required
              disabled={loading || matchingProviders.length === 0}
              className="min-h-11 w-full rounded-[10px] border border-[#E5E0D8] bg-white px-3 py-2 text-[#1A1208] outline-none transition focus:border-[#B8860B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Select provider</option>
              {matchingProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.companyName ? `${provider.name} (${provider.companyName})` : provider.name}
                </option>
              ))}
            </select>
            {matchingProviders.length === 0 ? (
              <p className="text-xs text-[#D97706]">No active providers match the selected service type.</p>
            ) : null}
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E5E0D8] pt-4">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (assignmentMode !== "unassigned") {
              setAssignmentMode("unassigned");
              setAssignedProviderId("");
              return;
            }
            onCancel?.();
          }}
          className="min-h-11 rounded-[10px] border border-[#E5E0D8] bg-white px-4 py-2 text-sm font-medium text-[#0D1B2A] transition hover:bg-[#FAF7F2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {assignmentMode === "unassigned" ? "Cancel" : "Leave unassigned"}
        </button>

        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-[10px] bg-[#0D1B2A] px-5 py-2 text-sm font-medium text-[#FAF7F2] transition hover:bg-[#13293D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create Job"}
        </button>
      </div>
    </form>
  );
}