import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthAccessError, requireOwnerProfile } from "@/lib/auth-access";
import { normalizeCalendarUrl } from "@/lib/calendar/validateCalendarUrl";

type CreatePropertyBody = {
  name?: string;
  address?: string;
  airbnbCalendarUrl?: string;
  listingUrl?: string;
  propertyType?: string;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  squareFeet?: number | string | null;
  maxGuests?: number | string | null;
  defaultCheckInTime?: string;
  defaultCheckOutTime?: string;
  floorNumber?: string;
  hasElevator?: boolean;
  parkingInfo?: string;
  accessNotes?: string;
  cleaningNotes?: string;
  supplyLocation?: string;
  laundryLocation?: string;
  trashInstructions?: string;
  petInfo?: string;
  providerInstructions?: string;
};

function toNullableTrimmed(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function parseNullableFloat(value: number | string | null | undefined): number | null | "invalid" {
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

export async function GET() {
  try {
    const ownerProfile = await requireOwnerProfile();

    const properties = await prisma.property.findMany({
      where: {
        ownerProfileId: ownerProfile.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load properties." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ownerProfile = await requireOwnerProfile();
    const body = (await request.json()) as CreatePropertyBody;

    const name = body.name?.trim() ?? "";
    const address = toNullableTrimmed(body.address);
    const airbnbCalendarUrlRaw = body.airbnbCalendarUrl?.trim() ?? "";
    const bedrooms = parseNullableFloat(body.bedrooms);
    const bathrooms = parseNullableFloat(body.bathrooms);
    const squareFeet = parseNullableInt(body.squareFeet);
    const maxGuests = parseNullableInt(body.maxGuests);

    if (!name) {
      return NextResponse.json({ error: "Property name is required." }, { status: 400 });
    }

    if (!airbnbCalendarUrlRaw) {
      return NextResponse.json(
        { error: "Airbnb calendar URL is required." },
        { status: 400 }
      );
    }

    // Validate and normalize the calendar URL up front so unsafe or malformed
    // URLs are never stored (the sync route also validates before fetching).
    let airbnbCalendarUrl: string;
    try {
      airbnbCalendarUrl = normalizeCalendarUrl(airbnbCalendarUrlRaw);
    } catch (urlError) {
      const message =
        urlError instanceof Error ? urlError.message : "Invalid calendar URL.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (
      bedrooms === "invalid" ||
      bathrooms === "invalid" ||
      squareFeet === "invalid" ||
      maxGuests === "invalid"
    ) {
      return NextResponse.json(
        { error: "Invalid property numeric field value." },
        { status: 400 }
      );
    }

    if (body.hasElevator !== undefined && typeof body.hasElevator !== "boolean") {
      return NextResponse.json(
        { error: "Failed to create property." },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        ownerProfileId: ownerProfile.id,
        name,
        address,
        airbnbCalendarUrl,
        listingUrl: toNullableTrimmed(body.listingUrl),
        propertyType: toNullableTrimmed(body.propertyType),
        bedrooms,
        bathrooms,
        squareFeet,
        maxGuests,
        defaultCheckInTime: toNullableTrimmed(body.defaultCheckInTime),
        defaultCheckOutTime: toNullableTrimmed(body.defaultCheckOutTime),
        floorNumber: toNullableTrimmed(body.floorNumber),
        hasElevator: body.hasElevator ?? false,
        parkingInfo: toNullableTrimmed(body.parkingInfo),
        accessNotes: toNullableTrimmed(body.accessNotes),
        cleaningNotes: toNullableTrimmed(body.cleaningNotes),
        supplyLocation: toNullableTrimmed(body.supplyLocation),
        laundryLocation: toNullableTrimmed(body.laundryLocation),
        trashInstructions: toNullableTrimmed(body.trashInstructions),
        petInfo: toNullableTrimmed(body.petInfo),
        providerInstructions: toNullableTrimmed(body.providerInstructions),
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to create property." }, { status: 500 });
  }
}
