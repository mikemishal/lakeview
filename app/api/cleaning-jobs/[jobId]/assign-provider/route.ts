import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import {
  AuthAccessError,
  canOwnerAccessCleaningJob,
  requireOwnerProfile,
} from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type AssignProviderBody = {
  providerId?: string | null;
};

function providerCanHandleServiceType(
  provider: {
    serviceType: string;
    primaryServiceType: string | null;
    capabilities: { serviceType: string; active: boolean }[];
  },
  requestedServiceType: string
): boolean {
  const normalizedRequested = normalizeServiceType(requestedServiceType);
  const providerServiceType = normalizeServiceType(provider.serviceType);
  const providerPrimaryType = normalizeServiceType(provider.primaryServiceType);

  return (
    providerServiceType === normalizedRequested ||
    providerPrimaryType === normalizedRequested ||
    provider.capabilities.some(
      (capability) =>
        capability.active && normalizeServiceType(capability.serviceType) === normalizedRequested
    )
  );
}

function normalizeServiceType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "cleaner") {
    return "cleaning";
  }

  return normalized;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const ownerProfile = await requireOwnerProfile();
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

    const hasAccess = await canOwnerAccessCleaningJob(ownerProfile.id, jobId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this cleaning job." },
        { status: 403 }
      );
    }

    if (providerId) {
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: providerId },
        include: {
          capabilities: true,
        },
      });

      const providerCanHandleRequestedType = Boolean(
        provider && providerCanHandleServiceType(provider, existingJob.requestedServiceType)
      );

      if (!provider || !provider.active || !providerCanHandleRequestedType) {
        return NextResponse.json(
          { error: "Valid provider with matching service type is required." },
          { status: 400 }
        );
      }

      // Validate provider is in owner's My Team
      const teamMember = await prisma.ownerProviderTeamMember.findUnique({
        where: {
          ownerProfileId_serviceProviderId: {
            ownerProfileId: ownerProfile.id,
            serviceProviderId: providerId,
          },
        },
        select: {
          isActive: true,
          cleaningFlatRateCents: true,
        },
      });

      if (!teamMember || !teamMember.isActive) {
        return NextResponse.json(
          { error: "Provider must be added to My Team before assignment." },
          { status: 400 }
        );
      }

      const hasCustomPrice =
        existingJob.quotedPrice !== null &&
        (existingJob.quotedPriceSource === "custom_job_price" ||
          existingJob.quotedPriceSource === "manual_override");
      const shouldApplyTeamPrice =
        !hasCustomPrice && normalizeServiceType(existingJob.requestedServiceType) === "cleaning";
      const nextQuotedPrice =
        shouldApplyTeamPrice && teamMember.cleaningFlatRateCents !== null
          ? teamMember.cleaningFlatRateCents / 100
          : null;

      const cleaningJob = await prisma.cleaningJob.update({
        where: { id: jobId },
        data: {
          assignedProviderId: providerId,
          ownerSelfAssigned: false,
          status: "assigned",
          ...(shouldApplyTeamPrice
            ? {
                quotedPrice: nextQuotedPrice,
                quotedPriceSource:
                  nextQuotedPrice !== null ? "team_cleaning_flat_rate" : null,
              }
            : {}),
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

    const hasCustomPrice =
      existingJob.quotedPrice !== null &&
      (existingJob.quotedPriceSource === "custom_job_price" ||
        existingJob.quotedPriceSource === "manual_override");

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: {
        assignedProviderId: null,
        ownerSelfAssigned: false,
        status: "needs_assignment",
        ...(hasCustomPrice
          ? {}
          : {
              quotedPrice: null,
              quotedPriceSource: null,
            }),
      },
      include: {
        calendarEvent: true,
        assignedProvider: true,
        property: true,
      },
    });

    return NextResponse.json({ cleaningJob });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to assign cleaning job provider." },
      { status: 500 }
    );
  }
}
