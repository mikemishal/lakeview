"use client";

import { useCallback, useEffect, useState } from "react";
import PropertyForm from "@/components/PropertyForm";
import CalendarSyncForm from "@/components/CalendarSyncForm";
import CalendarEventCard from "@/components/CalendarEventCard";
import CleaningJobCard, { type CleaningJobItem } from "@/components/CleaningJobCard";
import CleaningJobCalendar from "@/components/CleaningJobCalendar";
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
  skippedCount: number;
};

type UpdateCleaningJobStatusResponse = {
  cleaningJob: CleaningJobItem;
};

function toDateOnly(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
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
  const [cleaningJobsView, setCleaningJobsView] = useState<"list" | "calendar">("calendar");
  const [cleaningJobStatusFilter, setCleaningJobStatusFilter] = useState("all");
  const [showManualSync, setShowManualSync] = useState(false);

  const filteredCleaningJobs =
    cleaningJobStatusFilter === "all"
      ? cleaningJobs
      : cleaningJobs.filter((job) => job.status === cleaningJobStatusFilter);

  const loadCleaningJobsForProperty = useCallback(async (property: SavedProperty) => {
    setLoadingCleaningJobsPropertyId(property.id);
    setCleaningJobsError("");

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

  useEffect(() => {
    let isActive = true;

    async function loadProperties() {
      setLoadingProperties(true);

      try {
        const response = await fetch("/api/properties");
        const data = (await response.json()) as LoadPropertiesResponse | SavePropertyError;

        if (!response.ok) {
          if (isActive) {
            setPropertyError((data as SavePropertyError).error || "Failed to load properties.");
          }
          return;
        }

        if (isActive) {
          const loadedProperties = (data as LoadPropertiesResponse).properties;
          setProperties(loadedProperties);

          if (loadedProperties.length > 0) {
            const firstProperty = loadedProperties[0];
            setSelectedPropertyId(firstProperty.id);
            setLoadingEventsPropertyId(firstProperty.id);
            setItems([]);
            setError("");

            try {
              const eventsResponse = await fetch(
                `/api/properties/${firstProperty.id}/events`
              );
              const eventsData = (await eventsResponse.json()) as
                | PropertyEventsResponse
                | CalendarSyncError;

              if (!eventsResponse.ok) {
                if (isActive) {
                  setError(
                    (eventsData as CalendarSyncError).error ||
                      "Unable to load saved events."
                  );
                }
              } else if (isActive) {
                setItems(
                  mapDbEventsToCalendarItems(
                    (eventsData as PropertyEventsResponse).events
                  )
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
      } catch {
        if (isActive) {
          setPropertyError("Failed to load properties.");
        }
      } finally {
        if (isActive) {
          setLoadingProperties(false);
        }
      }
    }

    void loadProperties();

    return () => {
      isActive = false;
    };
  }, [loadCleaningJobsForProperty]);

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
        `Created ${result.createdCount} cleaning jobs. Skipped ${result.skippedCount} existing jobs.`
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

  const selectedProperty = properties.find(
    (property) => property.id === selectedPropertyId
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Lakeview Calendar Pilot
        </h1>
        <p className="text-sm text-slate-600">
          Paste your Airbnb iCal link to view upcoming check-in and check-out dates.
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
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
                List view
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
                Calendar view
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
                  />
                ))}
              </div>
            ) : (
              <CleaningJobCalendar jobs={filteredCleaningJobs} />
            )
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
