import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

const checkoutDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function toDateOnly(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}

function formatCheckoutDate(value: Date): string {
  return checkoutDateFormatter.format(value);
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { propertyId } = await context.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const events = await prisma.calendarEvent.findMany({
      where: { propertyId: property.id },
      orderBy: [{ checkInDate: "asc" }, { checkOutDate: "asc" }],
      include: { cleaningJob: true },
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const eventsByCheckInDate = events.reduce<Record<string, string[]>>((accumulator, event) => {
      const checkInDateOnly = toDateOnly(event.checkInDate);
      if (!accumulator[checkInDateOnly]) {
        accumulator[checkInDateOnly] = [];
      }

      accumulator[checkInDateOnly].push(event.id);
      return accumulator;
    }, {});

    for (const event of events) {
      const checkOutDateOnly = toDateOnly(event.checkOutDate);
      const sameDayCheckInEventIds = eventsByCheckInDate[checkOutDateOnly] ?? [];
      const hasSameDayNextCheckIn = sameDayCheckInEventIds.some((eventId) => eventId !== event.id);

      const cleaningType = hasSameDayNextCheckIn
        ? "turnover_cleaning"
        : "checkout_cleaning";
      const sourcePlatform = (event.source || "airbnb").toLowerCase();
      const checkoutDateLabel = formatCheckoutDate(event.checkOutDate);
      const title =
        cleaningType === "turnover_cleaning"
          ? `Turnover cleaning — ${property.name} — ${checkoutDateLabel}`
          : `Checkout cleaning — ${property.name} — ${checkoutDateLabel}`;

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

    const cleaningJobs = await prisma.cleaningJob.findMany({
      where: { propertyId: property.id },
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
      include: {
        calendarEvent: true,
        assignedProvider: true,
      },
    });

    return NextResponse.json({
      property,
      createdCount,
      updatedCount,
      skippedCount,
      cleaningJobs,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate cleaning jobs." },
      { status: 500 }
    );
  }
}
