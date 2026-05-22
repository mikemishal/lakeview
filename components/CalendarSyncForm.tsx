"use client";

import { FormEvent } from "react";

type CalendarSyncFormProps = {
  calendarUrl: string;
  setCalendarUrl: (value: string) => void;
  loading: boolean;
  onSubmit: () => void;
};

export default function CalendarSyncForm({
  calendarUrl,
  setCalendarUrl,
  loading,
  onSubmit,
}: CalendarSyncFormProps) {
  const isDisabled = loading || calendarUrl.trim().length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <label htmlFor="calendarUrl" className="block text-sm font-medium text-slate-700">
        Airbnb calendar URL
      </label>
      <input
        id="calendarUrl"
        type="url"
        placeholder="https://www.airbnb.com/calendar/ical/..."
        value={calendarUrl}
        onChange={(event) => setCalendarUrl(event.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
      />
      <button
        type="submit"
        disabled={isDisabled}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Syncing..." : "Sync calendar"}
      </button>
    </form>
  );
}
