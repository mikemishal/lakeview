import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
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

type UpdateStatusBody = {
  status?: string;
  actorType?: "owner" | "provider";
};

const ALLOWED_STATUSES = [
  "needs_assignment",
  "assigned",
  "declined",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;

function isValidStatus(value: string): value is (typeof ALLOWED_STATUSES)[number] {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

const OWNER_ALWAYS_ALLOWED = new Set(["needs_assignment", "assigned", "cancelled"]);
const OWNER_SELF_ONLY_ALLOWED = new Set(["in_progress", "completed"]);
const PROVIDER_ALLOWED = new Set(["accepted", "declined", "in_progress", "completed"]);

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await getRequiredAuthUserId();
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
      include: {
        assignedProvider: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Cleaning job not found." },
        { status: 404 }
      );
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

    let resolvedActorType = body.actorType;

    if (!resolvedActorType) {
      if (ownerHasAccess && !providerHasAccess) {
        resolvedActorType = "owner";
      } else if (providerHasAccess && !ownerHasAccess) {
        resolvedActorType = "provider";
      } else {
        return NextResponse.json({ error: "Actor type is required." }, { status: 400 });
      }
    }

    if (resolvedActorType !== "owner" && resolvedActorType !== "provider") {
      return NextResponse.json({ error: "Actor type is required." }, { status: 400 });
    }

    if (resolvedActorType === "owner") {
      if (!ownerHasAccess) {
        return NextResponse.json(
          { error: "You do not have access to this resource." },
          { status: 403 }
        );
      }

      const ownerAllowed =
        OWNER_ALWAYS_ALLOWED.has(status) ||
        (OWNER_SELF_ONLY_ALLOWED.has(status) && existingJob.ownerSelfAssigned);

      if (!ownerAllowed) {
        return NextResponse.json(
          { error: "Owner cannot perform this job action." },
          { status: 403 }
        );
      }
    }

    if (resolvedActorType === "provider") {
      if (!providerHasAccess) {
        return NextResponse.json(
          { error: "You do not have access to this resource." },
          { status: 403 }
        );
      }

      if (!PROVIDER_ALLOWED.has(status)) {
        return NextResponse.json(
          { error: "Provider cannot perform this job action." },
          { status: 403 }
        );
      }
    }

    const now = new Date();
    const updateData: {
      status: string;
      assignedProviderId?: string | null;
      ownerSelfAssigned?: boolean;
      acceptedAt?: Date;
      startedAt?: Date;
      completedAt?: Date;
      cancelledAt?: Date;
    } = {
      status,
    };

    if (status === "accepted") {
      updateData.acceptedAt = now;
    }

    if (status === "declined") {
      updateData.assignedProviderId = null;
      updateData.ownerSelfAssigned = false;
    }

    if (status === "in_progress") {
      updateData.startedAt = now;

      if (!existingJob.acceptedAt) {
        updateData.acceptedAt = now;
      }
    }

    if (status === "completed") {
      updateData.completedAt = now;

      if (!existingJob.acceptedAt) {
        updateData.acceptedAt = now;
      }

      if (!existingJob.startedAt) {
        updateData.startedAt = now;
      }
    }

    if (status === "cancelled") {
      updateData.cancelledAt = now;
      updateData.ownerSelfAssigned = false;
    }

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: updateData,
      include: {
        calendarEvent: true,
        assignedProvider: true,
        property: true,
      },
    });

    const providerName =
      status === "declined"
        ? existingJob.assignedProvider?.name ?? "Provider"
        : cleaningJob.assignedProvider?.name ?? existingJob.assignedProvider?.name ?? "Provider";

    const shouldNotifyOwner = !(resolvedActorType === "owner" && existingJob.ownerSelfAssigned);

    if (status === "accepted" && shouldNotifyOwner) {
      await createNotification({
        audienceType: "owner",
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_accepted",
        title: "Job accepted",
        message: `${providerName} accepted ${cleaningJob.title}`,
      });
    }

    if (status === "declined") {
      await createNotification({
        audienceType: "owner",
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_declined",
        title: "Job declined",
        message: `${providerName} declined ${cleaningJob.title}`,
      });
    }

    if (status === "in_progress" && shouldNotifyOwner) {
      await createNotification({
        audienceType: "owner",
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_started",
        title: "Job started",
        message: `${providerName} started ${cleaningJob.title}`,
      });
    }

    if (status === "completed" && shouldNotifyOwner) {
      await createNotification({
        audienceType: "owner",
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_completed",
        title: "Job completed",
        message: `${providerName} completed ${cleaningJob.title}`,
      });
    }

    if (status === "cancelled" && cleaningJob.assignedProviderId) {
      await createNotification({
        audienceType: "provider",
        providerId: cleaningJob.assignedProviderId,
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_cancelled",
        title: "Job cancelled",
        message: `${cleaningJob.title} was cancelled`,
      });
    }

    return NextResponse.json({ cleaningJob });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to update cleaning job status." },
      { status: 500 }
    );
  }
}
