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

    const cleaningJobs = await prisma.cleaningJob.findMany({
      where: { propertyId: property.id },
      orderBy: { scheduledDate: "asc" },
      include: {
        calendarEvent: true,
        assignedProvider: true,
      },
    });

    return NextResponse.json({
      property,
      cleaningJobs,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load cleaning jobs." },
      { status: 500 }
    );
  }
}
