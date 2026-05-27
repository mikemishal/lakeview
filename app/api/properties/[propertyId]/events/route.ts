import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthAccessError,
  canOwnerAccessProperty,
  requireOwnerProfile,
} from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

    const events = await prisma.calendarEvent.findMany({
      where: { propertyId: property.id },
      orderBy: {
        checkInDate: "asc",
      },
    });

    return NextResponse.json({
      property,
      events,
    });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to load property calendar events." },
      { status: 500 }
    );
  }
}
