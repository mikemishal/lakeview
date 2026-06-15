import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPropertyCalendar } from "@/lib/calendar/syncPropertyCalendar";
import {
  AuthAccessError,
  canOwnerAccessProperty,
  requireOwnerProfile,
} from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

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

    const { property: syncedProperty, events, syncedCount } = await syncPropertyCalendar({
      id: property.id,
      airbnbCalendarUrl: property.airbnbCalendarUrl,
    });

    return NextResponse.json({
      property: syncedProperty,
      syncedCount,
      events,
    });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Error && error.message === "Failed to fetch Airbnb calendar.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to sync property calendar." },
      { status: 500 }
    );
  }
}
