import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
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
      orderBy: { checkOutDate: "asc" },
      include: { cleaningJob: true },
    });

    const eventsToCreate = events.filter((event) => !event.cleaningJob);
    const skippedCount = events.length - eventsToCreate.length;

    const cleaningJobs = await Promise.all(
      eventsToCreate.map((event) =>
        prisma.cleaningJob.create({
          data: {
            propertyId: property.id,
            calendarEventId: event.id,
            title: `Cleaning after ${event.summary}`,
            scheduledDate: event.checkOutDate,
            status: "needs_assignment",
            notes: `Auto-generated from Airbnb calendar event checking out on ${toDateOnly(event.checkOutDate)}`,
          },
        })
      )
    );

    return NextResponse.json({
      property,
      createdCount: cleaningJobs.length,
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
