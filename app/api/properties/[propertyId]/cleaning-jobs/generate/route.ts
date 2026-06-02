import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCleaningJobsForProperty } from "@/lib/calendar/syncService";
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

    const { createdCount, updatedCount, skippedCount } =
      await generateCleaningJobsForProperty(property);

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
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to generate cleaning jobs." },
      { status: 500 }
    );
  }
}
