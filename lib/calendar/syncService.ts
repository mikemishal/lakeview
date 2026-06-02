// Shared calendar sync and cleaning-job generation logic.
//
// Used by the per-property owner routes and by the scheduled cron route so the
// fetch, reconcile, and job-generation behavior stays in one place.

import type { CalendarEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIcalEvents } from "./parseIcal";
import { fetchCalendarIcs } from "./fetchCalendar";

// Job statuses that can be auto-cancelled when their reservation disappears from
// the feed. Jobs already started or completed are left untouched.
const CANCELLABLE_JOB_STATUSES = [
  "needs_assignment",
  "assigned",
  "accepted",
  "declined",
];

const checkoutDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function toDateOnly(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}

export type SyncResult = {
  events: CalendarEvent[];
  syncedCount: number;
  removedCount: number;
  cancelledJobCount: number;
};

export async function syncPropertyCalendar(property: {
  id: string;
  airbnbCalendarUrl: string;
}): Promise<SyncResult> {
  const { text } = await fetchCalendarIcs(property.airbnbCalendarUrl);
  const parsedItems = await parseIcalEvents(text);
  const feedExternalIds = new Set(parsedItems.map((item) => item.id));

  return prisma.$transaction(async (tx) => {
    for (const item of parsedItems) {
      await tx.calendarEvent.upsert({
        where: {
          propertyId_externalId: {
            propertyId: property.id,
            externalId: item.id,
          },
        },
        create: {
          propertyId: property.id,
          externalId: item.id,
          summary: item.summary,
          checkInDate: new Date(`${item.checkInDate}T00:00:00.000Z`),
          checkOutDate: new Date(`${item.checkOutDate}T00:00:00.000Z`),
          nights: item.nights,
          source: item.source,
        },
        update: {
          summary: item.summary,
          checkInDate: new Date(`${item.checkInDate}T00:00:00.000Z`),
          checkOutDate: new Date(`${item.checkOutDate}T00:00:00.000Z`),
          nights: item.nights,
          source: item.source,
        },
      });
    }

    let removedCount = 0;
    let cancelledJobCount = 0;

    // Reconcile cancelled reservations: events we have stored that are no longer
    // in the feed. Skip this when the feed is empty, since an empty feed is more
    // likely a transient fetch issue than every reservation being cancelled.
    if (parsedItems.length > 0) {
      const staleEvents = await tx.calendarEvent.findMany({
        where: {
          propertyId: property.id,
          externalId: { notIn: Array.from(feedExternalIds) },
        },
        include: { cleaningJob: true },
      });

      const now = new Date();

      for (const stale of staleEvents) {
        if (
          stale.cleaningJob &&
          CANCELLABLE_JOB_STATUSES.includes(stale.cleaningJob.status)
        ) {
          await tx.cleaningJob.update({
            where: { id: stale.cleaningJob.id },
            data: { status: "cancelled", cancelledAt: now },
          });
          cancelledJobCount += 1;
        }

        await tx.calendarEvent.delete({ where: { id: stale.id } });
        removedCount += 1;
      }
    }

    const events = await tx.calendarEvent.findMany({
      where: { propertyId: property.id },
      orderBy: { checkInDate: "asc" },
    });

    return {
      events,
      syncedCount: parsedItems.length,
      removedCount,
      cancelledJobCount,
    };
  });
}

export type GenerateResult = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
};

export async function generateCleaningJobsForProperty(property: {
  id: string;
  name: string;
}): Promise<GenerateResult> {
  const events = await prisma.calendarEvent.findMany({
    where: { propertyId: property.id },
    orderBy: [{ checkInDate: "asc" }, { checkOutDate: "asc" }],
    include: { cleaningJob: true },
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  // Group event ids by their check-in date so we can detect same-day turnovers
  // (one guest checks out as another checks in on the same date).
  const eventsByCheckInDate = events.reduce<Record<string, string[]>>(
    (accumulator, event) => {
      const checkInDateOnly = toDateOnly(event.checkInDate);
      if (!accumulator[checkInDateOnly]) {
        accumulator[checkInDateOnly] = [];
      }
      accumulator[checkInDateOnly].push(event.id);
      return accumulator;
    },
    {}
  );

  for (const event of events) {
    const checkOutDateOnly = toDateOnly(event.checkOutDate);
    const sameDayCheckInEventIds = eventsByCheckInDate[checkOutDateOnly] ?? [];
    const hasSameDayNextCheckIn = sameDayCheckInEventIds.some(
      (eventId) => eventId !== event.id
    );

    const cleaningType = hasSameDayNextCheckIn
      ? "turnover_cleaning"
      : "checkout_cleaning";
    const sourcePlatform = (event.source || "airbnb").toLowerCase();
    const checkoutDateLabel = checkoutDateFormatter.format(event.checkOutDate);
    const title =
      cleaningType === "turnover_cleaning"
        ? `Turnover cleaning - ${property.name} - ${checkoutDateLabel}`
        : `Checkout cleaning - ${property.name} - ${checkoutDateLabel}`;

    if (!event.cleaningJob) {
      await prisma.cleaningJob.create({
        data: {
          propertyId: property.id,
          calendarEventId: event.id,
          title,
          scheduledDate: event.checkOutDate,
          status: "needs_assignment",
          sourcePlatform,
          cleaningType,
          notes: null,
        },
      });
      createdCount += 1;
      continue;
    }

    const shouldUpdateContext =
      event.cleaningJob.title !== title ||
      event.cleaningJob.sourcePlatform !== sourcePlatform ||
      event.cleaningJob.cleaningType !== cleaningType;

    if (!shouldUpdateContext) {
      skippedCount += 1;
      continue;
    }

    await prisma.cleaningJob.update({
      where: { id: event.cleaningJob.id },
      data: {
        title,
        sourcePlatform,
        cleaningType,
      },
    });
    updatedCount += 1;
  }

  return { createdCount, updatedCount, skippedCount };
}
