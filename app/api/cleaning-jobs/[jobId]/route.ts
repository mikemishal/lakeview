import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthAccessError,
  canOwnerAccessCleaningJob,
  canProviderAccessCleaningJob,
  getCurrentOwnerProfile,
  getCurrentProviderProfile,
  getRequiredAuthUserId,
} from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await getRequiredAuthUserId();
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

    const [ownerProfile, providerProfile] = await Promise.all([
      getCurrentOwnerProfile(),
      getCurrentProviderProfile(),
    ]);

    const [ownerHasAccess, providerHasAccess] = await Promise.all([
      ownerProfile ? canOwnerAccessCleaningJob(ownerProfile.id, jobId) : Promise.resolve(false),
      providerProfile
        ? canProviderAccessCleaningJob(providerProfile.id, jobId)
        : Promise.resolve(false),
    ]);

    if (!ownerHasAccess && !providerHasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this cleaning job." },
        { status: 403 }
      );
    }

    return NextResponse.json({ cleaningJob });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load cleaning job." }, { status: 500 });
  }
}
