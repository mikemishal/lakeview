import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
      orderBy: {
        checkInDate: "asc",
      },
    });

    return NextResponse.json({
      property,
      events,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load property calendar events." },
      { status: 500 }
    );
  }
}
