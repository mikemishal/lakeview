import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthAccessError, requireOwnerProfile } from "@/lib/auth-access";

type TeamMemberUpdateBody = {
  isActive?: boolean;
  cleaningFlatRateCents?: number | string | null;
  cleaningHourlyRateCents?: number | string | null;
  pricingNotes?: string | null;
};

type RouteContext = {
  params: Promise<{ providerId: string }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const ownerProfile = await requireOwnerProfile();
    const { providerId } = await context.params;
    const body = (await request.json()) as TeamMemberUpdateBody;

    const cleaningFlatRateCents = parseNullableInt(body.cleaningFlatRateCents);
    const cleaningHourlyRateCents = parseNullableInt(body.cleaningHourlyRateCents);

    if (cleaningFlatRateCents === "invalid" || cleaningHourlyRateCents === "invalid") {
      return NextResponse.json({ error: "Invalid pricing field value." }, { status: 400 });
    }

    const existing = await prisma.ownerProviderTeamMember.findUnique({
      where: {
        ownerProfileId_serviceProviderId: {
          ownerProfileId: ownerProfile.id,
          serviceProviderId: providerId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team provider not found." }, { status: 404 });
    }

    const teamMember = await prisma.ownerProviderTeamMember.update({
      where: {
        ownerProfileId_serviceProviderId: {
          ownerProfileId: ownerProfile.id,
          serviceProviderId: providerId,
        },
      },
      data: {
        isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
        cleaningFlatRateCents:
          body.cleaningFlatRateCents !== undefined
            ? cleaningFlatRateCents
            : existing.cleaningFlatRateCents,
        cleaningHourlyRateCents:
          body.cleaningHourlyRateCents !== undefined
            ? cleaningHourlyRateCents
            : existing.cleaningHourlyRateCents,
        pricingNotes:
          body.pricingNotes !== undefined
            ? toNullableTrimmed(body.pricingNotes)
            : existing.pricingNotes,
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

    return NextResponse.json({ error: "Failed to update team provider." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const ownerProfile = await requireOwnerProfile();
    const { providerId } = await context.params;

    const existing = await prisma.ownerProviderTeamMember.findUnique({
      where: {
        ownerProfileId_serviceProviderId: {
          ownerProfileId: ownerProfile.id,
          serviceProviderId: providerId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Team provider not found." }, { status: 404 });
    }

    await prisma.ownerProviderTeamMember.update({
      where: {
        ownerProfileId_serviceProviderId: {
          ownerProfileId: ownerProfile.id,
          serviceProviderId: providerId,
        },
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to deactivate team provider." }, { status: 500 });
  }
}
