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

function formatIssueLabels(labels: string[]): string {
  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type UpdateIssueFlagsBody = {
  maintenanceNeeded?: boolean;
  restockNeeded?: boolean;
  damageFound?: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await getRequiredAuthUserId();
    const { jobId } = await context.params;
    const body = (await request.json()) as UpdateIssueFlagsBody;

    const existingJob = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
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
        { error: "You do not have access to this resource." },
        { status: 403 }
      );
    }

    const updateData: {
      maintenanceNeeded?: boolean;
      restockNeeded?: boolean;
      damageFound?: boolean;
    } = {};

    if ("maintenanceNeeded" in body) {
      if (typeof body.maintenanceNeeded !== "boolean") {
        return NextResponse.json({ error: "Invalid issue flag value." }, { status: 400 });
      }
      updateData.maintenanceNeeded = body.maintenanceNeeded;
    }

    if ("restockNeeded" in body) {
      if (typeof body.restockNeeded !== "boolean") {
        return NextResponse.json({ error: "Invalid issue flag value." }, { status: 400 });
      }
      updateData.restockNeeded = body.restockNeeded;
    }

    if ("damageFound" in body) {
      if (typeof body.damageFound !== "boolean") {
        return NextResponse.json({ error: "Invalid issue flag value." }, { status: 400 });
      }
      updateData.damageFound = body.damageFound;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No issue flags provided." }, { status: 400 });
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

    const newlyFlaggedLabels: string[] = [];

    if (updateData.maintenanceNeeded === true && !existingJob.maintenanceNeeded) {
      newlyFlaggedLabels.push("Maintenance");
    }

    if (updateData.restockNeeded === true && !existingJob.restockNeeded) {
      newlyFlaggedLabels.push("Restock");
    }

    if (updateData.damageFound === true && !existingJob.damageFound) {
      newlyFlaggedLabels.push("Damage");
    }

    if (newlyFlaggedLabels.length > 0) {
      await createNotification({
        audienceType: "owner",
        ownerProfileId: cleaningJob.property.ownerProfileId,
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_issue_flagged",
        title: "Issue flagged",
        message: `${formatIssueLabels(newlyFlaggedLabels)} flagged for ${cleaningJob.title}`,
      });
    }

    return NextResponse.json({ cleaningJob });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to update cleaning job issue flags." },
      { status: 500 }
    );
  }
}
