import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;

    const cleaningJob = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
      include: {
        property: true,
        calendarEvent: true,
        assignedProvider: true,
      },
    });

    if (!cleaningJob) {
      return NextResponse.json({ error: "Cleaning job not found." }, { status: 404 });
    }

    return NextResponse.json({ cleaningJob });
  } catch {
    return NextResponse.json({ error: "Failed to load cleaning job." }, { status: 500 });
  }
}
