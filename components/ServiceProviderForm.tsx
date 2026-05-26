"use client";

import { FormEvent } from "react";

const CAPABILITY_OPTIONS = [
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "restock", label: "Restock" },
  { value: "inspection", label: "Inspection" },
  { value: "laundry", label: "Laundry" },
  { value: "trash_removal", label: "Trash removal" },
] as const;

type ServiceProviderFormProps = {
  providerName: string;
  setProviderName: (value: string) => void;
  companyName: string;
  setCompanyName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  capabilities: string[];
  setCapabilities: (value: string[]) => void;
  primaryServiceType: string;
  setPrimaryServiceType: (value: string) => void;
  baseAddress: string;
  setBaseAddress: (value: string) => void;
  baseCity: string;
  setBaseCity: (value: string) => void;
  baseState: string;
  setBaseState: (value: string) => void;
  baseZipCode: string;
  setBaseZipCode: (value: string) => void;
  serviceRadiusMiles: string;
  setServiceRadiusMiles: (value: string) => void;
  serviceAreaNotes: string;
  setServiceAreaNotes: (value: string) => void;
  baseRateDollars: string;
  setBaseRateDollars: (value: string) => void;
  hourlyRateDollars: string;
  setHourlyRateDollars: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  loading: boolean;
  onSubmit: () => void;
};

export default function ServiceProviderForm({
  providerName,
  setProviderName,
  companyName,
  setCompanyName,
  email,
  setEmail,
  phone,
  setPhone,
  capabilities,
  setCapabilities,
  primaryServiceType,
  setPrimaryServiceType,
  baseAddress,
  setBaseAddress,
  baseCity,
  setBaseCity,
  baseState,
  setBaseState,
  baseZipCode,
  setBaseZipCode,
  serviceRadiusMiles,
  setServiceRadiusMiles,
  serviceAreaNotes,
  setServiceAreaNotes,
  baseRateDollars,
  setBaseRateDollars,
  hourlyRateDollars,
  setHourlyRateDollars,
  notes,
  setNotes,
  loading,
  onSubmit,
}: ServiceProviderFormProps) {
  const selectedCapabilities = CAPABILITY_OPTIONS.filter((option) =>
    capabilities.includes(option.value)
  );

  const isDisabled =
    loading ||
    providerName.trim().length === 0 ||
    capabilities.length === 0 ||
    primaryServiceType.trim().length === 0;

  function handleCapabilityToggle(capability: string) {
    const nextCapabilities = capabilities.includes(capability)
      ? capabilities.filter((value) => value !== capability)
      : [...capabilities, capability];

    setCapabilities(nextCapabilities);

    if (!nextCapabilities.includes(primaryServiceType)) {
      setPrimaryServiceType(nextCapabilities[0] ?? "");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">Add Service Provider</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Provider details</h3>
        <div className="space-y-1">
          <label htmlFor="providerName" className="block text-sm font-medium text-slate-700">
            Provider name
          </label>
          <input
            id="providerName"
            type="text"
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">
              Company name
            </label>
            <input
              id="companyName"
              type="text"
              placeholder="Optional"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Optional"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="Optional"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Capabilities</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={capabilities.includes(option.value)}
                onChange={() => handleCapabilityToggle(option.value)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              {option.label}
            </label>
          ))}
        </div>
        <div className="space-y-1">
          <label htmlFor="primaryServiceType" className="block text-sm font-medium text-slate-700">
            Primary service
          </label>
          <select
            id="primaryServiceType"
            value={primaryServiceType}
            onChange={(event) => setPrimaryServiceType(event.target.value)}
            disabled={selectedCapabilities.length === 0}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select primary service</option>
            {selectedCapabilities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Service area</h3>
        <div className="space-y-1">
          <label htmlFor="baseAddress" className="block text-sm font-medium text-slate-700">
            Base address
          </label>
          <input
            id="baseAddress"
            type="text"
            placeholder="Optional"
            value={baseAddress}
            onChange={(event) => setBaseAddress(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="baseCity" className="block text-sm font-medium text-slate-700">
              City
            </label>
            <input
              id="baseCity"
              type="text"
              placeholder="Optional"
              value={baseCity}
              onChange={(event) => setBaseCity(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="baseState" className="block text-sm font-medium text-slate-700">
              State
            </label>
            <input
              id="baseState"
              type="text"
              placeholder="Optional"
              value={baseState}
              onChange={(event) => setBaseState(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="baseZipCode" className="block text-sm font-medium text-slate-700">
              ZIP code
            </label>
            <input
              id="baseZipCode"
              type="text"
              placeholder="Optional"
              value={baseZipCode}
              onChange={(event) => setBaseZipCode(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="serviceRadiusMiles" className="block text-sm font-medium text-slate-700">
            Service radius miles
          </label>
          <input
            id="serviceRadiusMiles"
            type="number"
            min="0"
            step="1"
            placeholder="Optional"
            value={serviceRadiusMiles}
            onChange={(event) => setServiceRadiusMiles(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="serviceAreaNotes" className="block text-sm font-medium text-slate-700">
            Service area notes
          </label>
          <textarea
            id="serviceAreaNotes"
            rows={2}
            placeholder="Optional"
            value={serviceAreaNotes}
            onChange={(event) => setServiceAreaNotes(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="baseRateDollars" className="block text-sm font-medium text-slate-700">
              Base rate dollars
            </label>
            <input
              id="baseRateDollars"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={baseRateDollars}
              onChange={(event) => setBaseRateDollars(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="hourlyRateDollars" className="block text-sm font-medium text-slate-700">
              Hourly rate dollars
            </label>
            <input
              id="hourlyRateDollars"
              type="number"
              min="0"
              step="0.01"
              placeholder="Optional"
              value={hourlyRateDollars}
              onChange={(event) => setHourlyRateDollars(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>
      </section>

      <section className="space-y-1">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea
          id="notes"
          placeholder="Optional"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </section>

      <button
        type="submit"
        disabled={isDisabled}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save provider"}
      </button>
    </form>
  );
}
