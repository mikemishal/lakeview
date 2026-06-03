import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthAccessError, requireOwnerProfile } from "@/lib/auth-access";
import { normalizeCalendarUrl } from "@/lib/calendar/validateCalendarUrl";
import { createPropertySchema } from "@/lib/validation/property";
import { log } from "@/lib/logger";

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

    log.error("properties.list failed", {
      route: "GET /api/properties",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to load properties." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ownerProfile = await requireOwnerProfile();

    // One schema validates and normalizes the whole body. Returns the first
    // clear message on failure instead of a generic error.
    const parsed = createPropertySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid property data." },
        { status: 400 }
      );
    }

    const { airbnbCalendarUrl: rawCalendarUrl, ...rest } = parsed.data;

    // Validate and normalize the calendar URL up front so unsafe or malformed
    // URLs are never stored (the sync route also validates before fetching).
    let airbnbCalendarUrl: string;
    try {
      airbnbCalendarUrl = normalizeCalendarUrl(rawCalendarUrl);
    } catch (urlError) {
      const message =
        urlError instanceof Error ? urlError.message : "Invalid calendar URL.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        ...rest,
        airbnbCalendarUrl,
        ownerProfileId: ownerProfile.id,
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    log.error("properties.create failed", {
      route: "POST /api/properties",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to create property." }, { status: 500 });
  }
}
