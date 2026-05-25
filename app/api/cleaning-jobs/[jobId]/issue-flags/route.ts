import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { jobId } = await context.params;
    const body = (await request.json()) as UpdateIssueFlagsBody;

    const existingJob = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Cleaning job not found." }, { status: 404 });
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

    return NextResponse.json({ cleaningJob });
  } catch {
    return NextResponse.json(
      { error: "Failed to update cleaning job issue flags." },
      { status: 500 }
    );
  }
}
