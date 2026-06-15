import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncPropertyCalendar } from "@/lib/calendar/syncPropertyCalendar";

type SyncRunResult = {
  propertyId: string;
  status: "success" | "error";
  syncedCount?: number;
  error?: string;
};

function isAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CALENDAR_SYNC_SECRET;
  const providedSecret = request.headers.get("x-calendar-sync-secret");

  if (!configuredSecret) {
    return false;
  }

  return providedSecret === configuredSecret;
}

export async function POST(request: Request) {
  if (!process.env.CALENDAR_SYNC_SECRET) {
    return NextResponse.json(
      { error: "CALENDAR_SYNC_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const properties = await prisma.property.findMany({
    where: {
      ownerProfileId: { not: null },
      ownerProfile: {
        active: true,
      },
    },
    select: {
      id: true,
      airbnbCalendarUrl: true,
    },
  });

  const results: SyncRunResult[] = [];

  for (const property of properties) {
    try {
      const syncResult = await syncPropertyCalendar(property);
      results.push({
        propertyId: property.id,
        status: "success",
        syncedCount: syncResult.syncedCount,
      });
    } catch (error) {
      results.push({
        propertyId: property.id,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to sync property.",
      });
    }
  }

  const successCount = results.filter((result) => result.status === "success").length;
  const errorCount = results.length - successCount;

  return NextResponse.json({
    totalProperties: properties.length,
    successCount,
    errorCount,
    results,
  });
}
