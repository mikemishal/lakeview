import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIcalEvents } from "@/lib/calendar/parseIcal";
import { fetchCalendarIcs } from "@/lib/calendar/fetchCalendar";
import {
  AuthAccessError,
  canOwnerAccessProperty,
  requireOwnerProfile,
} from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

// Job statuses that can be safely auto-cancelled when their reservation disappears
// from the feed. Jobs already started or completed are left untouched.
const CANCELLABLE_JOB_STATUSES = [
  "needs_assignment",
  "assigned",
  "accepted",
  "declined",
];

export async function POST(_request: Request, context: RouteContext) {
  try {
    const ownerProfile = await requireOwnerProfile();
    const { propertyId } = await context.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const hasAccess = await canOwnerAccessProperty(ownerProfile.id, propertyId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this property." },
        { status: 403 }
      );
    }

    // fetchCalendarIcs validates the stored URL (host allowlist, no redirects to
    // internal hosts) before making the request.
    const { text: icsText } = await fetchCalendarIcs(property.airbnbCalendarUrl);
    const parsedItems = await parseIcalEvents(icsText);
    const feedExternalIds = new Set(parsedItems.map((item) => item.id));

    const { events, removedCount, cancelledJobCount } = await prisma.$transaction(
      async (tx) => {
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

        let removed = 0;
        let cancelledJobs = 0;

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
              cancelledJobs += 1;
            }

            // Deleting the event leaves any started/completed job intact
            // (calendarEventId is set null by the schema relation).
            await tx.calendarEvent.delete({ where: { id: stale.id } });
            removed += 1;
          }
        }

        const refreshedEvents = await tx.calendarEvent.findMany({
          where: { propertyId: property.id },
          orderBy: { checkInDate: "asc" },
        });

        return {
          events: refreshedEvents,
          removedCount: removed,
          cancelledJobCount: cancelledJobs,
        };
      }
    );

    return NextResponse.json({
      property,
      syncedCount: parsedItems.length,
      removedCount,
      cancelledJobCount,
      events,
    });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message.startsWith("Calendar")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to sync property calendar." },
      { status: 500 }
    );
  }
}
