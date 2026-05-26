import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ServiceProviderBody = {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  serviceType?: string;
  primaryServiceType?: string;
  capabilities?: string[];
  notes?: string;
  baseAddress?: string;
  baseCity?: string;
  baseState?: string;
  baseZipCode?: string;
  serviceRadiusMiles?: number | string | null;
  serviceAreaNotes?: string;
  baseRateCents?: number | string | null;
  hourlyRateCents?: number | string | null;
};

const ALLOWED_SERVICE_TYPES = ["cleaning", "maintenance", "restock", "inspection", "laundry", "trash_removal"] as const;

function isAllowedServiceType(
  value: string
): value is (typeof ALLOWED_SERVICE_TYPES)[number] {
  return (ALLOWED_SERVICE_TYPES as readonly string[]).includes(value);
}

function normalizeServiceType(value: string | undefined | null): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "cleaner") {
    return "cleaning";
  }

  return normalized;
}

function toNullableTrimmed(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

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

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const requestedServiceType = requestUrl.searchParams.get("serviceType")?.trim() ?? "";
    const normalizedRequestedServiceType = normalizeServiceType(requestedServiceType);
    const serviceTypeFilters = Array.from(
      new Set([requestedServiceType, normalizedRequestedServiceType].filter((value) => Boolean(value)))
    );

    const serviceProviders = await prisma.serviceProvider.findMany({
      where:
        serviceTypeFilters.length > 0
          ? {
              OR: [
                {
                  serviceType: {
                    in: serviceTypeFilters,
                  },
                },
                {
                  capabilities: {
                    some: {
                      active: true,
                      serviceType: {
                        in: serviceTypeFilters,
                      },
                    },
                  },
                },
              ],
            }
          : undefined,
      include: {
        capabilities: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ serviceProviders });
  } catch {
    return NextResponse.json(
      { error: "Failed to load service providers." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ServiceProviderBody;

    const name = body.name?.trim() ?? "";

    if (!name) {
      return NextResponse.json(
        { error: "Provider name is required." },
        { status: 400 }
      );
    }

    if (body.capabilities !== undefined && !Array.isArray(body.capabilities)) {
      return NextResponse.json(
        { error: "At least one valid service capability is required." },
        { status: 400 }
      );
    }

    const requestedCapabilities = Array.isArray(body.capabilities)
      ? body.capabilities.map((capability) => normalizeServiceType(capability))
      : [];
    const hasInvalidProvidedCapability =
      requestedCapabilities.length > 0 &&
      requestedCapabilities.some((serviceType) => !isAllowedServiceType(serviceType));

    if (hasInvalidProvidedCapability) {
      return NextResponse.json(
        { error: "At least one valid service capability is required." },
        { status: 400 }
      );
    }

    const fallbackServiceType = normalizeServiceType(body.serviceType);
    const fallbackPrimaryServiceType = normalizeServiceType(body.primaryServiceType);

    const capabilities = Array.from(
      new Set(
        (requestedCapabilities.length > 0
          ? requestedCapabilities
          : [fallbackServiceType || fallbackPrimaryServiceType])
          .filter((serviceType) => isAllowedServiceType(serviceType))
      )
    );

    if (capabilities.length === 0) {
      return NextResponse.json(
        { error: "At least one valid service capability is required." },
        { status: 400 }
      );
    }

    const parsedServiceRadiusMiles = parseNullableInt(body.serviceRadiusMiles);
    const parsedBaseRateCents = parseNullableInt(body.baseRateCents);
    const parsedHourlyRateCents = parseNullableInt(body.hourlyRateCents);

    if (
      parsedServiceRadiusMiles === "invalid" ||
      parsedBaseRateCents === "invalid" ||
      parsedHourlyRateCents === "invalid"
    ) {
      return NextResponse.json({ error: "Invalid numeric field value." }, { status: 400 });
    }

    const primaryServiceTypeCandidate = normalizeServiceType(body.primaryServiceType) || capabilities[0];
    const primaryServiceType = isAllowedServiceType(primaryServiceTypeCandidate)
      ? primaryServiceTypeCandidate
      : capabilities[0];

    const serviceProvider = await prisma.serviceProvider.create({
      data: {
        name,
        companyName: toNullableTrimmed(body.companyName),
        email: toNullableTrimmed(body.email),
        phone: toNullableTrimmed(body.phone),
        serviceType: primaryServiceType,
        primaryServiceType,
        notes: toNullableTrimmed(body.notes),
        baseAddress: toNullableTrimmed(body.baseAddress),
        baseCity: toNullableTrimmed(body.baseCity),
        baseState: toNullableTrimmed(body.baseState),
        baseZipCode: toNullableTrimmed(body.baseZipCode),
        serviceRadiusMiles: parsedServiceRadiusMiles,
        serviceAreaNotes: toNullableTrimmed(body.serviceAreaNotes),
        baseRateCents: parsedBaseRateCents,
        hourlyRateCents: parsedHourlyRateCents,
        capabilities: {
          create: capabilities.map((serviceType) => ({
            serviceType,
            active: true,
          })),
        },
      },
      include: {
        capabilities: true,
      },
    });

    return NextResponse.json({ serviceProvider });
  } catch {
    return NextResponse.json(
      { error: "Failed to create service provider." },
      { status: 500 }
    );
  }
}
