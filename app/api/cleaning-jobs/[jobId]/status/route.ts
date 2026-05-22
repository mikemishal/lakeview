import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type UpdateStatusBody = {
  status?: string;
};

const ALLOWED_STATUSES = [
  "needs_assignment",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

function isValidStatus(value: string): value is (typeof ALLOWED_STATUSES)[number] {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const body = (await request.json()) as UpdateStatusBody;
    const status = body.status?.trim() ?? "";

    if (!status || !isValidStatus(status)) {
      return NextResponse.json(
        { error: "Invalid cleaning job status." },
        { status: 400 }
      );
    }

    const existingJob = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Cleaning job not found." },
        { status: 404 }
      );
    }

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: { status },
    });

    return NextResponse.json({ cleaningJob });
  } catch {
    return NextResponse.json(
      { error: "Failed to update cleaning job status." },
      { status: 500 }
    );
  }
}
