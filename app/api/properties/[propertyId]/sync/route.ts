import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIcalEvents } from "@/lib/calendar/parseIcal";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { propertyId } = await context.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const response = await fetch(property.airbnbCalendarUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "LakeviewPilot/0.1",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Airbnb calendar." },
        { status: 400 }
      );
    }

    const icsText = await response.text();
    const parsedItems = await parseIcalEvents(icsText);

    const savedEvents = await Promise.all(
      parsedItems.map((item) =>
        prisma.calendarEvent.upsert({
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
        })
      )
    );

    return NextResponse.json({
      property,
      syncedCount: savedEvents.length,
      events: savedEvents,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to sync property calendar." },
      { status: 500 }
    );
  }
}
