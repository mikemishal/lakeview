"use client";

import { FormEvent, useState } from "react";

type PropertyFormProps = {
  propertyName: string;
  setPropertyName: (value: string) => void;
  propertyAddress: string;
  setPropertyAddress: (value: string) => void;
  airbnbCalendarUrl: string;
  setAirbnbCalendarUrl: (value: string) => void;
  listingUrl: string;
  setListingUrl: (value: string) => void;
  propertyType: string;
  setPropertyType: (value: string) => void;
  bedrooms: string;
  setBedrooms: (value: string) => void;
  bathrooms: string;
  setBathrooms: (value: string) => void;
  squareFeet: string;
  setSquareFeet: (value: string) => void;
  maxGuests: string;
  setMaxGuests: (value: string) => void;
  defaultCheckInTime: string;
  setDefaultCheckInTime: (value: string) => void;
  defaultCheckOutTime: string;
  setDefaultCheckOutTime: (value: string) => void;
  floorNumber: string;
  setFloorNumber: (value: string) => void;
  hasElevator: boolean;
  setHasElevator: (value: boolean) => void;
  parkingInfo: string;
  setParkingInfo: (value: string) => void;
  accessNotes: string;
  setAccessNotes: (value: string) => void;
  cleaningNotes: string;
  setCleaningNotes: (value: string) => void;
  supplyLocation: string;
  setSupplyLocation: (value: string) => void;
  laundryLocation: string;
  setLaundryLocation: (value: string) => void;
  trashInstructions: string;
  setTrashInstructions: (value: string) => void;
  petInfo: string;
  setPetInfo: (value: string) => void;
  providerInstructions: string;
  setProviderInstructions: (value: string) => void;
  mode?: "create" | "edit";
  submitLabel?: string;
  loadingLabel?: string;
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
  listingUrl,
  setListingUrl,
  propertyType,
  setPropertyType,
  bedrooms,
  setBedrooms,
  bathrooms,
  setBathrooms,
  squareFeet,
  setSquareFeet,
  maxGuests,
  setMaxGuests,
  defaultCheckInTime,
  setDefaultCheckInTime,
  defaultCheckOutTime,
  setDefaultCheckOutTime,
  floorNumber,
  setFloorNumber,
  hasElevator,
  setHasElevator,
  parkingInfo,
  setParkingInfo,
  accessNotes,
  setAccessNotes,
  cleaningNotes,
  setCleaningNotes,
  supplyLocation,
  setSupplyLocation,
  laundryLocation,
  setLaundryLocation,
  trashInstructions,
  setTrashInstructions,
  petInfo,
  setPetInfo,
  providerInstructions,
  setProviderInstructions,
  mode = "create",
  submitLabel,
  loadingLabel,
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

  const resolvedTitle = mode === "edit" ? "Edit Property" : "Add Property";
  const resolvedSubmitLabel = submitLabel ?? (mode === "edit" ? "Save changes" : "Save property");
  const resolvedLoadingLabel = loadingLabel ?? "Saving...";

  // Show only the required basics by default; reveal the rest on demand. When
  // editing an existing property the extra sections start expanded.
  const [showAdvanced, setShowAdvanced] = useState(mode === "edit");

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-900">{resolvedTitle}</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Basic details</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
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

          <div className="space-y-1 md:col-span-2">
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

          <div className="space-y-1 md:col-span-2">
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

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="listingUrl" className="block text-sm font-medium text-slate-700">
              Listing URL
            </label>
            <input
              id="listingUrl"
              type="url"
              placeholder="Optional"
              value={listingUrl}
              onChange={(event) => setListingUrl(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="propertyType" className="block text-sm font-medium text-slate-700">
              Property type
            </label>
            <input
              id="propertyType"
              type="text"
              placeholder="Optional"
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="bedrooms" className="block text-sm font-medium text-slate-700">
              Bedrooms
            </label>
            <input
              id="bedrooms"
              type="number"
              step="0.5"
              min="0"
              placeholder="Optional"
              value={bedrooms}
              onChange={(event) => setBedrooms(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="bathrooms" className="block text-sm font-medium text-slate-700">
              Bathrooms
            </label>
            <input
              id="bathrooms"
              type="number"
              step="0.5"
              min="0"
              placeholder="Optional"
              value={bathrooms}
              onChange={(event) => setBathrooms(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="squareFeet" className="block text-sm font-medium text-slate-700">
              Square feet
            </label>
            <input
              id="squareFeet"
              type="number"
              step="1"
              min="0"
              placeholder="Optional"
              value={squareFeet}
              onChange={(event) => setSquareFeet(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="maxGuests" className="block text-sm font-medium text-slate-700">
              Max guests
            </label>
            <input
              id="maxGuests"
              type="number"
              step="1"
              min="0"
              placeholder="Optional"
              value={maxGuests}
              onChange={(event) => setMaxGuests(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setShowAdvanced((value) => !value)}
        className="text-sm font-medium text-sky-700 underline"
      >
        {showAdvanced ? "Hide extra details" : "Add details (optional)"}
      </button>

      {showAdvanced && (
        <>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Turnover timing</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="defaultCheckInTime" className="block text-sm font-medium text-slate-700">
              Default check-in time
            </label>
            <input
              id="defaultCheckInTime"
              type="time"
              value={defaultCheckInTime}
              onChange={(event) => setDefaultCheckInTime(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="defaultCheckOutTime" className="block text-sm font-medium text-slate-700">
              Default check-out time
            </label>
            <input
              id="defaultCheckOutTime"
              type="time"
              value={defaultCheckOutTime}
              onChange={(event) => setDefaultCheckOutTime(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Provider logistics</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="floorNumber" className="block text-sm font-medium text-slate-700">
              Floor/unit level
            </label>
            <input
              id="floorNumber"
              type="text"
              placeholder="Optional"
              value={floorNumber}
              onChange={(event) => setFloorNumber(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <label className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={hasElevator}
              onChange={(event) => setHasElevator(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            Has elevator
          </label>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="parkingInfo" className="block text-sm font-medium text-slate-700">
              Parking info
            </label>
            <textarea
              id="parkingInfo"
              rows={2}
              placeholder="Optional"
              value={parkingInfo}
              onChange={(event) => setParkingInfo(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="accessNotes" className="block text-sm font-medium text-slate-700">
              General access notes
            </label>
            <textarea
              id="accessNotes"
              rows={2}
              placeholder="Optional"
              value={accessNotes}
              onChange={(event) => setAccessNotes(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="supplyLocation" className="block text-sm font-medium text-slate-700">
              Supply location
            </label>
            <input
              id="supplyLocation"
              type="text"
              placeholder="Optional"
              value={supplyLocation}
              onChange={(event) => setSupplyLocation(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="laundryLocation" className="block text-sm font-medium text-slate-700">
              Laundry location
            </label>
            <input
              id="laundryLocation"
              type="text"
              placeholder="Optional"
              value={laundryLocation}
              onChange={(event) => setLaundryLocation(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="trashInstructions" className="block text-sm font-medium text-slate-700">
              Trash instructions
            </label>
            <textarea
              id="trashInstructions"
              rows={2}
              placeholder="Optional"
              value={trashInstructions}
              onChange={(event) => setTrashInstructions(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="petInfo" className="block text-sm font-medium text-slate-700">
              Pet info
            </label>
            <textarea
              id="petInfo"
              rows={2}
              placeholder="Optional"
              value={petInfo}
              onChange={(event) => setPetInfo(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Cleaning instructions</h3>
        <div className="space-y-1">
          <label htmlFor="cleaningNotes" className="block text-sm font-medium text-slate-700">
            Cleaning notes
          </label>
          <textarea
            id="cleaningNotes"
            rows={3}
            placeholder="Optional"
            value={cleaningNotes}
            onChange={(event) => setCleaningNotes(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="providerInstructions" className="block text-sm font-medium text-slate-700">
            Provider instructions
          </label>
          <textarea
            id="providerInstructions"
            rows={3}
            placeholder="Optional"
            value={providerInstructions}
            onChange={(event) => setProviderInstructions(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
          />
        </div>
      </section>
        </>
      )}

      <button
        type="submit"
        disabled={isDisabled}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? resolvedLoadingLabel : resolvedSubmitLabel}
      </button>
    </form>
  );
}
