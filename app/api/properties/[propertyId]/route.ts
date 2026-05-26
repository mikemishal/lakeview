import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ propertyId: string }>;
};

type UpdatePropertyBody = {
  name?: string;
  address?: string;
  airbnbCalendarUrl?: string;
  listingUrl?: string | null;
  propertyType?: string | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  squareFeet?: number | string | null;
  maxGuests?: number | string | null;
  defaultCheckInTime?: string | null;
  defaultCheckOutTime?: string | null;
  floorNumber?: string | null;
  hasElevator?: boolean;
  parkingInfo?: string | null;
  accessNotes?: string | null;
  cleaningNotes?: string | null;
  supplyLocation?: string | null;
  laundryLocation?: string | null;
  trashInstructions?: string | null;
  petInfo?: string | null;
  providerInstructions?: string | null;
};

function toNullableTrimmed(value: string | null | undefined): string | null {
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { propertyId } = await context.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    return NextResponse.json({ property });
  } catch {
    return NextResponse.json({ error: "Failed to load property." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { propertyId } = await context.params;
    const body = (await request.json()) as UpdatePropertyBody;

    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!existingProperty) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    if (body.hasElevator !== undefined && typeof body.hasElevator !== "boolean") {
      return NextResponse.json(
        { error: "Property name, address, and Airbnb calendar URL are required." },
        { status: 400 }
      );
    }

    const bedrooms = parseNullableFloat(body.bedrooms);
    const bathrooms = parseNullableFloat(body.bathrooms);
    const squareFeet = parseNullableInt(body.squareFeet);
    const maxGuests = parseNullableInt(body.maxGuests);

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

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (!trimmedName) {
        return NextResponse.json(
          { error: "Property name, address, and Airbnb calendar URL are required." },
          { status: 400 }
        );
      }
      data.name = trimmedName;
    }

    if (body.address !== undefined) {
      const trimmedAddress = body.address.trim();
      if (!trimmedAddress) {
        return NextResponse.json(
          { error: "Property name, address, and Airbnb calendar URL are required." },
          { status: 400 }
        );
      }
      data.address = trimmedAddress;
    }

    if (body.airbnbCalendarUrl !== undefined) {
      const trimmedCalendarUrl = body.airbnbCalendarUrl.trim();
      if (!trimmedCalendarUrl) {
        return NextResponse.json(
          { error: "Property name, address, and Airbnb calendar URL are required." },
          { status: 400 }
        );
      }
      data.airbnbCalendarUrl = trimmedCalendarUrl;
    }

    if (body.listingUrl !== undefined) {
      data.listingUrl = toNullableTrimmed(body.listingUrl);
    }

    if (body.propertyType !== undefined) {
      data.propertyType = toNullableTrimmed(body.propertyType);
    }

    if (body.defaultCheckInTime !== undefined) {
      data.defaultCheckInTime = toNullableTrimmed(body.defaultCheckInTime);
    }

    if (body.defaultCheckOutTime !== undefined) {
      data.defaultCheckOutTime = toNullableTrimmed(body.defaultCheckOutTime);
    }

    if (body.floorNumber !== undefined) {
      data.floorNumber = toNullableTrimmed(body.floorNumber);
    }

    if (body.parkingInfo !== undefined) {
      data.parkingInfo = toNullableTrimmed(body.parkingInfo);
    }

    if (body.accessNotes !== undefined) {
      data.accessNotes = toNullableTrimmed(body.accessNotes);
    }

    if (body.cleaningNotes !== undefined) {
      data.cleaningNotes = toNullableTrimmed(body.cleaningNotes);
    }

    if (body.supplyLocation !== undefined) {
      data.supplyLocation = toNullableTrimmed(body.supplyLocation);
    }

    if (body.laundryLocation !== undefined) {
      data.laundryLocation = toNullableTrimmed(body.laundryLocation);
    }

    if (body.trashInstructions !== undefined) {
      data.trashInstructions = toNullableTrimmed(body.trashInstructions);
    }

    if (body.petInfo !== undefined) {
      data.petInfo = toNullableTrimmed(body.petInfo);
    }

    if (body.providerInstructions !== undefined) {
      data.providerInstructions = toNullableTrimmed(body.providerInstructions);
    }

    if (body.hasElevator !== undefined) {
      data.hasElevator = body.hasElevator;
    }

    if (body.bedrooms !== undefined) {
      data.bedrooms = bedrooms;
    }

    if (body.bathrooms !== undefined) {
      data.bathrooms = bathrooms;
    }

    if (body.squareFeet !== undefined) {
      data.squareFeet = squareFeet;
    }

    if (body.maxGuests !== undefined) {
      data.maxGuests = maxGuests;
    }

    const property = await prisma.property.update({
      where: { id: propertyId },
      data,
    });

    return NextResponse.json({ property });
  } catch {
    return NextResponse.json({ error: "Failed to update property." }, { status: 500 });
  }
}
