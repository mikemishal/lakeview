import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type UpdateNotesBody = {
  notes?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
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
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_notes_updated",
        title: "Job notes updated",
        message: `Notes updated for ${cleaningJob.title}`,
      });
    }

    return NextResponse.json({ cleaningJob });
  } catch {
    return NextResponse.json(
      { error: "Failed to update cleaning job notes." },
      { status: 500 }
    );
  }
}
