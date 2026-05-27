import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthAccessError, requireProviderProfile } from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ providerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const currentProviderProfile = await requireProviderProfile();
    const { providerId } = await context.params;

    if (providerId !== currentProviderProfile.id) {
      return NextResponse.json(
        { error: "You do not have access to this provider profile." },
        { status: 403 }
      );
    }

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
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to load assigned cleaning jobs." },
      { status: 500 }
    );
  }
}
