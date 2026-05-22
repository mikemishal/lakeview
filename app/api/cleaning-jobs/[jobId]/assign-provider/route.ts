import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

type AssignProviderBody = {
  providerId?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const body = (await request.json()) as AssignProviderBody;
    const providerIdRaw = body.providerId;
    const providerId = typeof providerIdRaw === "string" ? providerIdRaw.trim() : null;

    const existingJob = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Cleaning job not found." }, { status: 404 });
    }

    if (providerId) {
      const provider = await prisma.serviceProvider.findUnique({
        where: { id: providerId },
      });

      if (!provider || !provider.active || provider.serviceType !== "cleaner") {
        return NextResponse.json(
          { error: "Valid cleaner provider is required." },
          { status: 400 }
        );
      }

      const cleaningJob = await prisma.cleaningJob.update({
        where: { id: jobId },
        data: {
          assignedProviderId: providerId,
          status: "assigned",
        },
        include: {
          calendarEvent: true,
          assignedProvider: true,
        },
      });

      return NextResponse.json({ cleaningJob });
    }

    const cleaningJob = await prisma.cleaningJob.update({
      where: { id: jobId },
      data: {
        assignedProviderId: null,
        status: "needs_assignment",
      },
      include: {
        calendarEvent: true,
        assignedProvider: true,
      },
    });

    return NextResponse.json({ cleaningJob });
  } catch {
    return NextResponse.json(
      { error: "Failed to assign cleaning job provider." },
      { status: 500 }
    );
  }
}
