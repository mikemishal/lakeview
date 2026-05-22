"use client";

import { FormEvent } from "react";

type PropertyFormProps = {
  propertyName: string;
  setPropertyName: (value: string) => void;
  propertyAddress: string;
  setPropertyAddress: (value: string) => void;
  airbnbCalendarUrl: string;
  setAirbnbCalendarUrl: (value: string) => void;
  loading: boolean;
  onSubmit: () => void;
};

export default function PropertyForm({
  propertyName,
  setPropertyName,
  propertyAddress,
  setPropertyAddress,
  airbnbCalendarUrl,
  setAirbnbCalendarUrl,
  loading,
  onSubmit,
}: PropertyFormProps) {
  const isDisabled =
    loading ||
    propertyName.trim().length === 0 ||
    airbnbCalendarUrl.trim().length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">Add Property</h2>

      <div className="space-y-1">
        <label htmlFor="propertyName" className="block text-sm font-medium text-slate-700">
          Property name
        </label>
        <input
          id="propertyName"
          type="text"
          value={propertyName}
          onChange={(event) => setPropertyName(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="propertyAddress" className="block text-sm font-medium text-slate-700">
          Address
        </label>
        <input
          id="propertyAddress"
          type="text"
          placeholder="Optional"
          value={propertyAddress}
          onChange={(event) => setPropertyAddress(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="airbnbCalendarUrl" className="block text-sm font-medium text-slate-700">
          Airbnb calendar URL
        </label>
        <input
          id="airbnbCalendarUrl"
          type="url"
          value={airbnbCalendarUrl}
          onChange={(event) => setAirbnbCalendarUrl(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save property"}
      </button>
    </form>
  );
}
