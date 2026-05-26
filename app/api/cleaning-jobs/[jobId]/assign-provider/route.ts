import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type AssignProviderBody = {
  providerId?: string | null;
};

function normalizeServiceType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "cleaner") {
    return "cleaning";
  }

  return normalized;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const body = (await request.json()) as AssignProviderBody;
    const providerIdRaw = body.providerId;
    const providerId = typeof providerIdRaw === "string" ? providerIdRaw.trim() : null;

    const existingJob = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Cleaning job not found." }, { status: 404 });
    }

    if (providerId) {
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: providerId },
        include: {
          capabilities: true,
        },
      });

      const providerCanClean = Boolean(
        provider &&
          (normalizeServiceType(provider.serviceType) === "cleaning" ||
            normalizeServiceType(provider.primaryServiceType) === "cleaning" ||
            provider.capabilities.some(
              (capability) =>
                capability.active && normalizeServiceType(capability.serviceType) === "cleaning"
            ))
      );

      if (!provider || !provider.active || !providerCanClean) {
        return NextResponse.json(
          { error: "Valid cleaning provider is required." },
          { status: 400 }
        );
      }

      const cleaningJob = await prisma.cleaningJob.update({
        where: { id: jobId },
        data: {
          assignedProviderId: providerId,
          ownerSelfAssigned: false,
          status: "assigned",
        },
        include: {
          calendarEvent: true,
          assignedProvider: true,
          property: true,
        },
      });

      await createNotification({
        audienceType: "provider",
        providerId: provider.id,
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_assigned",
        title: "New job assigned",
        message: `${cleaningJob.property.name}: ${cleaningJob.title}`,
      });

      return NextResponse.json({ cleaningJob });
    }

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: {
        assignedProviderId: null,
        ownerSelfAssigned: false,
        status: "needs_assignment",
      },
      include: {
        calendarEvent: true,
        assignedProvider: true,
        property: true,
      },
    });

    return NextResponse.json({ cleaningJob });
  } catch {
    return NextResponse.json(
      { error: "Failed to assign cleaning job provider." },
      { status: 500 }
    );
  }
}
