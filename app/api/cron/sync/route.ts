import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  syncPropertyCalendar,
  generateCleaningJobsForProperty,
} from "@/lib/calendar/syncService";

// node-ical needs the Node runtime, and this must always run fresh.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compares two strings without leaking length-independent timing information.
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return false;
  }

  // Accept either an Authorization: Bearer header or a ?secret= query param so
  // any scheduler (GitHub Actions, Azure WebJob, cron service) can trigger it.
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const querySecret = new URL(request.url).searchParams.get("secret") ?? "";

  const provided = bearer || querySecret;
  return provided.length > 0 && secretsMatch(provided, expected);
}

async function runSync() {
  const properties = await prisma.property.findMany({
    select: { id: true, name: true, airbnbCalendarUrl: true },
  });

  const results: Array<Record<string, unknown>> = [];
  let okCount = 0;
  let failureCount = 0;

  // Process each property independently so one bad calendar does not stop the run.
  for (const property of properties) {
    try {
      const sync = await syncPropertyCalendar(property);
      const generated = await generateCleaningJobsForProperty(property);
      okCount += 1;
      results.push({
        propertyId: property.id,
        name: property.name,
        ok: true,
        syncedCount: sync.syncedCount,
        removedCount: sync.removedCount,
        cancelledJobCount: sync.cancelledJobCount,
        createdJobs: generated.createdCount,
        updatedJobs: generated.updatedCount,
      });
    } catch (error) {
      failureCount += 1;
      results.push({
        propertyId: property.id,
        name: property.name,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    ranAt: new Date().toISOString(),
    propertyCount: properties.length,
    okCount,
    failureCount,
    results,
  };
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await runSync();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Scheduled sync failed", error);
    return NextResponse.json({ error: "Scheduled sync failed." }, { status: 500 });
  }
}

// Support GET (most cron services) and POST.
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
