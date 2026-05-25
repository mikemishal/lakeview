import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ providerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { providerId } = await context.params;

    const serviceProvider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
    });

    if (!serviceProvider) {
      return NextResponse.json(
        { error: "Service provider not found." },
        { status: 404 }
      );
    }

    if (!serviceProvider.active) {
      return NextResponse.json(
        { error: "Service provider is inactive." },
        { status: 400 }
      );
    }

    const cleaningJobs = await prisma.cleaningJob.findMany({
      where: { assignedProviderId: providerId },
      orderBy: { scheduledDate: "asc" },
      include: {
        property: true,
        calendarEvent: true,
        assignedProvider: true,
      },
    });

    return NextResponse.json({
      serviceProvider,
      cleaningJobs,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load assigned cleaning jobs." },
      { status: 500 }
    );
  }
}
