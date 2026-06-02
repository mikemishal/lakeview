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

type UpdateNotesBody = {
  notes?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await getRequiredAuthUserId();
    const { jobId } = await context.params;
    const body = (await request.json()) as UpdateNotesBody;

    if (!("notes" in body)) {
      return NextResponse.json({ error: "Invalid notes value." }, { status: 400 });
    }

    const notesValue = body.notes;

    if (typeof notesValue !== "string" && notesValue !== null) {
      return NextResponse.json({ error: "Invalid notes value." }, { status: 400 });
    }

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

    const normalizedNotes =
      typeof notesValue === "string" ? notesValue.trim() || null : null;

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: {
        notes: normalizedNotes,
      },
      include: {
        calendarEvent: true,
        assignedProvider: true,
        property: true,
      },
    });

    if (normalizedNotes !== existingJob.notes) {
      await createNotification({
        audienceType: "owner",
        ownerProfileId: cleaningJob.property.ownerProfileId,
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_notes_updated",
        title: "Job notes updated",
        message: `Notes updated for ${cleaningJob.title}`,
      });
    }

    return NextResponse.json({ cleaningJob });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to update cleaning job notes." },
      { status: 500 }
    );
  }
}
