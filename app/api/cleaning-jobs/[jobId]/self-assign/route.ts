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

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const ownerProfile = await requireOwnerProfile();
    const { jobId } = await context.params;

    const existingJob = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
    });

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

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: {
        ownerSelfAssigned: true,
        assignedProviderId: null,
        status: "accepted",
        acceptedAt: existingJob.acceptedAt ?? new Date(),
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
      { error: "Failed to self-assign cleaning job." },
      { status: 500 }
    );
  }
}
