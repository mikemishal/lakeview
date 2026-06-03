import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";





type OnboardingProfileBody = {
  accountType?: "account" | "owner" | "provider" | "both";
  inviteCode?: string;
  name?: string;
  companyName?: string | null;
  phone?: string | null;
  propertyCountry?: string | null;
  propertyState?: string | null;
  propertyCity?: string | null;
  propertyNeighborhood?: string | null;
  propertyStreetAddress?: string | null;
  propertyUnit?: string | null;
  propertyPostalCode?: string | null;
  propertyLatitude?: number | string | null;
  propertyLongitude?: number | string | null;
  capabilities?: string[];
  primaryServiceType?: string;
  baseAddress?: string | null;
  serviceCountry?: string | null;
  baseCity?: string | null;
  baseState?: string | null;
  serviceNeighborhood?: string | null;
  baseZipCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  serviceRadiusMiles?: number | string | null;
  serviceAreaNotes?: string | null;
  baseRateCents?: number | string | null;
  hourlyRateCents?: number | string | null;
};

const VALID_SERVICE_TYPES = [
  "cleaning",
  "maintenance",
  "restock",
  "inspection",
  "laundry",
  "trash_removal",
] as const;

type ServiceType = (typeof VALID_SERVICE_TYPES)[number];

function isValidServiceType(value: string): value is ServiceType {
  return VALID_SERVICE_TYPES.includes(value as ServiceType);
}

function normalizeServiceType(value: unknown): ServiceType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "cleaner") {
    return "cleaning";
  }

  if (isValidServiceType(normalized)) {
    return normalized;
  }

  return null;
}

function toNullableTrimmed(value: string | null | undefined): string | null {
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

function parseNullableFloat(
  value: number | string | null | undefined
): number | null | "invalid" {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "invalid";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : "invalid";
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const [accountProfile, ownerProfile, serviceProvider] = await Promise.all([
      prisma.accountProfile.findUnique({
        where: { authUserId: userId },
      }),
      prisma.ownerProfile.findUnique({
        where: { authUserId: userId },
      }),
      prisma.serviceProvider.findUnique({
        where: { authUserId: userId },
        include: { capabilities: true },
      }),
    ]);

    return NextResponse.json({ accountProfile, ownerProfile, serviceProvider });
  } catch {
    return NextResponse.json({ error: "Failed to load onboarding profile." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as OnboardingProfileBody;
    const accountType = body.accountType;

    if (
      accountType !== "account" &&
      accountType !== "owner" &&
      accountType !== "provider" &&
      accountType !== "both"
    ) {
      return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress ?? null;
    const nameFromBody = body.name?.trim() ?? "";
    if (!nameFromBody) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const companyName = toNullableTrimmed(body.companyName);
    const phone = toNullableTrimmed(body.phone);
    const expectedInviteCode = process.env.SIGNUP_INVITE_CODE?.trim();

    if (!expectedInviteCode) {
      return NextResponse.json({ error: "Invite code is not configured." }, { status: 500 });
    }

    const existingAccountProfile = await prisma.accountProfile.findUnique({
      where: { authUserId: userId },
    });

    const alreadyInviteVerified = existingAccountProfile?.inviteCodeVerified === true;

    if (!alreadyInviteVerified) {
      const providedInviteCode = body.inviteCode?.trim() ?? "";

      if (!providedInviteCode || providedInviteCode !== expectedInviteCode) {
        return NextResponse.json({ error: "Invalid invite code." }, { status: 403 });
      }
    }

    const inviteCodeVerifiedAt =
      existingAccountProfile?.inviteCodeVerifiedAt ?? new Date();

    const accountProfile = existingAccountProfile
      ? await prisma.accountProfile.update({
          where: { id: existingAccountProfile.id },
          data: {
            name: nameFromBody,
            email: email ?? existingAccountProfile.email ?? null,
            companyName,
            phone,
            onboardingComplete: true,
            inviteCodeVerified: true,
            inviteCodeVerifiedAt,
          },
        })
      : await prisma.accountProfile.create({
          data: {
            authUserId: userId,
            name: nameFromBody,
            email,
            companyName,
            phone,
            onboardingComplete: true,
            inviteCodeVerified: true,
            inviteCodeVerifiedAt,
          },
        });

    const shouldCreateOwner = accountType === "owner" || accountType === "both";
    const shouldCreateProvider = accountType === "provider" || accountType === "both";

    let ownerProfile = await prisma.ownerProfile.findUnique({
      where: { authUserId: userId },
    });

    let serviceProvider = await prisma.serviceProvider.findUnique({
      where: { authUserId: userId },
      include: { capabilities: true },
    });

    if (shouldCreateOwner) {
      const propertyLatitude = parseNullableFloat(body.propertyLatitude);
      const propertyLongitude = parseNullableFloat(body.propertyLongitude);

      if (propertyLatitude === "invalid" || propertyLongitude === "invalid") {
        return NextResponse.json({ error: "Invalid owner location coordinates." }, { status: 400 });
      }

      const propertyCountry = toNullableTrimmed(body.propertyCountry);
      const propertyState = toNullableTrimmed(body.propertyState);
      const propertyCity = toNullableTrimmed(body.propertyCity);
      const propertyNeighborhood = toNullableTrimmed(body.propertyNeighborhood);
      const propertyStreetAddress = toNullableTrimmed(body.propertyStreetAddress);
      const propertyUnit = toNullableTrimmed(body.propertyUnit);
      const propertyPostalCode = toNullableTrimmed(body.propertyPostalCode);

      ownerProfile = ownerProfile
        ? await prisma.ownerProfile.update({
            where: { id: ownerProfile.id },
            data: {
              name: nameFromBody,
              email: accountProfile.email,
              companyName: accountProfile.companyName,
              phone: accountProfile.phone,
              propertyCountry,
              propertyState,
              propertyCity,
              propertyNeighborhood,
              propertyStreetAddress,
              propertyUnit,
              propertyPostalCode,
              propertyLatitude,
              propertyLongitude,
              onboardingComplete: true,
              active: true,
            },
          })
        : await prisma.ownerProfile.create({
            data: {
              authUserId: userId,
              name: nameFromBody,
              email: accountProfile.email,
              companyName: accountProfile.companyName,
              phone: accountProfile.phone,
              propertyCountry,
              propertyState,
              propertyCity,
              propertyNeighborhood,
              propertyStreetAddress,
              propertyUnit,
              propertyPostalCode,
              propertyLatitude,
              propertyLongitude,
              onboardingComplete: true,
              active: true,
            },
          });
    }

    if (shouldCreateProvider) {
      const requestedCapabilities = Array.isArray(body.capabilities)
        ? body.capabilities
        : ["cleaning"];

      const capabilities: ServiceType[] = Array.from(
        new Set(
          requestedCapabilities
            .map((capability) => normalizeServiceType(capability))
            .filter((capability): capability is ServiceType => capability !== null)
        )
      );

      if (capabilities.length === 0) {
        return NextResponse.json(
          { error: "At least one valid service capability is required." },
          { status: 400 }
        );
      }

      const requestedPrimaryServiceType = normalizeServiceType(body.primaryServiceType);
      const primaryServiceType: ServiceType = requestedPrimaryServiceType ?? capabilities[0];

      if (!capabilities.includes(primaryServiceType)) {
        return NextResponse.json(
          { error: "Primary service must be one of the selected capabilities." },
          { status: 400 }
        );
      }

      const parsedServiceRadiusMiles = parseNullableInt(body.serviceRadiusMiles);
      const parsedBaseRateCents = parseNullableInt(body.baseRateCents);
      const parsedHourlyRateCents = parseNullableInt(body.hourlyRateCents);
      const parsedLatitude = parseNullableFloat(body.latitude);
      const parsedLongitude = parseNullableFloat(body.longitude);

      if (
        parsedServiceRadiusMiles === "invalid" ||
        parsedBaseRateCents === "invalid" ||
        parsedHourlyRateCents === "invalid" ||
        parsedLatitude === "invalid" ||
        parsedLongitude === "invalid"
      ) {
        return NextResponse.json({ error: "Invalid numeric field value." }, { status: 400 });
      }

      const baseAddress = toNullableTrimmed(body.baseAddress);
      const serviceCountry = toNullableTrimmed(body.serviceCountry);
      const baseCity = toNullableTrimmed(body.baseCity);
      const baseState = toNullableTrimmed(body.baseState);
      const serviceNeighborhood = toNullableTrimmed(body.serviceNeighborhood);
      const baseZipCode = toNullableTrimmed(body.baseZipCode);
      const serviceAreaNotes = toNullableTrimmed(body.serviceAreaNotes);

      serviceProvider = serviceProvider
        ? await prisma.serviceProvider.update({
            where: { id: serviceProvider.id },
            data: {
              name: nameFromBody,
              email: accountProfile.email,
              companyName: accountProfile.companyName,
              phone: accountProfile.phone,
              serviceType: primaryServiceType,
              primaryServiceType,
              onboardingComplete: true,
              active: true,
              baseAddress,
              serviceCountry,
              baseCity,
              baseState,
              serviceNeighborhood,
              baseZipCode,
              serviceRadiusMiles: parsedServiceRadiusMiles,
              serviceAreaNotes,
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              baseRateCents: parsedBaseRateCents,
              hourlyRateCents: parsedHourlyRateCents,
              capabilities: {
                deleteMany: {},
                create: capabilities.map((serviceType) => ({
                  serviceType,
                  active: true,
                })),
              },
            },
            include: { capabilities: true },
          })
        : await prisma.serviceProvider.create({
            data: {
              authUserId: userId,
              name: nameFromBody,
              email: accountProfile.email,
              companyName: accountProfile.companyName,
              phone: accountProfile.phone,
              serviceType: primaryServiceType,
              primaryServiceType,
              onboardingComplete: true,
              active: true,
              baseAddress,
              serviceCountry,
              baseCity,
              baseState,
              serviceNeighborhood,
              baseZipCode,
              serviceRadiusMiles: parsedServiceRadiusMiles,
              serviceAreaNotes,
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              baseRateCents: parsedBaseRateCents,
              hourlyRateCents: parsedHourlyRateCents,
              capabilities: {
                create: capabilities.map((serviceType) => ({
                  serviceType,
                  active: true,
                })),
              },
            },
            include: { capabilities: true },
          });
    }

    return NextResponse.json({
      accountProfile,
      ownerProfile,
      serviceProvider,
    });
  } catch (error) {
    console.error("POST /api/onboarding/profile failed:", error);
    return NextResponse.json({ error: "Failed to save onboarding profile." }, { status: 500 });
  }
}
