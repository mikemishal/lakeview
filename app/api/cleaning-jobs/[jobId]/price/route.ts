import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthAccessError,
  canOwnerAccessCleaningJob,
  requireOwnerProfile,
} from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type UpdatePriceBody = {
  quotedPrice?: number | string | null;
  quotedPriceNotes?: string | null;
};

function parseQuotedPrice(value: number | string | null | undefined): number | null | "invalid" {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : "invalid";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return "invalid";
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : "invalid";
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const ownerProfile = await requireOwnerProfile();
    const { jobId } = await context.params;
    const body = (await request.json()) as UpdatePriceBody;

    const existingJob = await prisma.cleaningJob.findUnique({ where: { id: jobId } });

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

    const parsedQuotedPrice = parseQuotedPrice(body.quotedPrice);
    if (parsedQuotedPrice === "invalid") {
      return NextResponse.json(
        { error: "Custom job price must be a non-negative amount with up to 2 decimals." },
        { status: 400 }
      );
    }

    const quotedPriceNotes =
      typeof body.quotedPriceNotes === "string" ? body.quotedPriceNotes.trim() || null : null;

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: {
        quotedPrice: parsedQuotedPrice,
        quotedPriceNotes: parsedQuotedPrice === null ? null : quotedPriceNotes,
        quotedPriceSource: parsedQuotedPrice === null ? null : "custom_job_price",
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
      { error: "Failed to update cleaning job price." },
      { status: 500 }
    );
  }
}
