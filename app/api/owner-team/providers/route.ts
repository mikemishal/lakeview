import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthAccessError, requireOwnerProfile } from "@/lib/auth-access";
import { getProviderServiceAreaStatus } from "@/lib/geo/distance";

type AddTeamProviderBody = {
  serviceProviderId?: string;
  cleaningFlatRateCents?: number | string | null;
  cleaningHourlyRateCents?: number | string | null;
  pricingNotes?: string | null;
};

function parseNullableInt(value: number | string | null | undefined): number | null | "invalid" {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : "invalid";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^-?\d+$/.test(trimmed)) {
    return "invalid";
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : "invalid";
}

function toNullableTrimmed(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    const ownerProfile = await requireOwnerProfile();

    const [teamMembers, allProviders] = await Promise.all([
      prisma.ownerProviderTeamMember.findMany({
        where: { ownerProfileId: ownerProfile.id },
        include: {
          serviceProvider: {
            include: {
              capabilities: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.serviceProvider.findMany({
        where: {
          active: true,
        },
        include: {
          capabilities: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    const teamProviderIds = new Set(teamMembers.map((member) => member.serviceProviderId));

    const enrichedTeamMembers = teamMembers.map((member) => {
      const area = getProviderServiceAreaStatus({
        ownerLatitude: ownerProfile.propertyLatitude,
        ownerLongitude: ownerProfile.propertyLongitude,
        providerLatitude: member.serviceProvider.latitude,
        providerLongitude: member.serviceProvider.longitude,
        providerServiceRadiusMiles: member.serviceProvider.serviceRadiusMiles,
      });

      return {
        ...member,
        areaStatus: area.status,
        distanceMiles: area.distanceMiles,
        thresholdMiles: area.thresholdMiles,
      };
    });

    const availableProviders = allProviders
      .filter((provider) => !teamProviderIds.has(provider.id))
      .map((provider) => {
        const area = getProviderServiceAreaStatus({
          ownerLatitude: ownerProfile.propertyLatitude,
          ownerLongitude: ownerProfile.propertyLongitude,
          providerLatitude: provider.latitude,
          providerLongitude: provider.longitude,
          providerServiceRadiusMiles: provider.serviceRadiusMiles,
        });

        return {
          provider,
          areaStatus: area.status,
          distanceMiles: area.distanceMiles,
          thresholdMiles: area.thresholdMiles,
        };
      });

    return NextResponse.json({
      teamMembers: enrichedTeamMembers,
      availableProviders,
    });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load team providers." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ownerProfile = await requireOwnerProfile();
    const body = (await request.json()) as AddTeamProviderBody;

    const serviceProviderId = body.serviceProviderId?.trim() ?? "";
    if (!serviceProviderId) {
      return NextResponse.json({ error: "Service provider is required." }, { status: 400 });
    }

    const provider = await prisma.serviceProvider.findUnique({
      where: { id: serviceProviderId },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found." }, { status: 404 });
    }

    const area = getProviderServiceAreaStatus({
      ownerLatitude: ownerProfile.propertyLatitude,
      ownerLongitude: ownerProfile.propertyLongitude,
      providerLatitude: provider.latitude,
      providerLongitude: provider.longitude,
      providerServiceRadiusMiles: provider.serviceRadiusMiles,
    });

    if (area.status === "out_of_area") {
      return NextResponse.json({ error: "Provider is outside your service area." }, { status: 400 });
    }

    const cleaningFlatRateCents = parseNullableInt(body.cleaningFlatRateCents);
    const cleaningHourlyRateCents = parseNullableInt(body.cleaningHourlyRateCents);

    if (cleaningFlatRateCents === "invalid" || cleaningHourlyRateCents === "invalid") {
      return NextResponse.json({ error: "Invalid pricing field value." }, { status: 400 });
    }

    const teamMember = await prisma.ownerProviderTeamMember.upsert({
      where: {
        ownerProfileId_serviceProviderId: {
          ownerProfileId: ownerProfile.id,
          serviceProviderId,
        },
      },
      update: {
        isActive: true,
        cleaningFlatRateCents,
        cleaningHourlyRateCents,
        pricingNotes: toNullableTrimmed(body.pricingNotes),
      },
      create: {
        ownerProfileId: ownerProfile.id,
        serviceProviderId,
        isActive: true,
        cleaningFlatRateCents,
        cleaningHourlyRateCents,
        pricingNotes: toNullableTrimmed(body.pricingNotes),
      },
      include: {
        serviceProvider: {
          include: {
            capabilities: true,
          },
        },
      },
    });

    return NextResponse.json({ teamMember });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to add provider to team." }, { status: 500 });
  }
}
