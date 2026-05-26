import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MarkReadAllBody = {
  audienceType?: "owner" | "provider" | string;
  providerId?: string;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as MarkReadAllBody;
    const audienceType = (body.audienceType ?? "").trim();
    const providerId = (body.providerId ?? "").trim();

    if (audienceType !== "owner" && audienceType !== "provider") {
      return NextResponse.json({ error: "Invalid audience type." }, { status: 400 });
    }

    if (audienceType === "provider" && !providerId) {
      return NextResponse.json({ error: "Provider ID is required." }, { status: 400 });
    }

    const where: {
      audienceType: "owner" | "provider";
      providerId?: string;
      readAt: null;
    } = {
      audienceType,
      readAt: null,
    };

    if (audienceType === "provider") {
      where.providerId = providerId;
    }

    const result = await prisma.notification.updateMany({
      where,
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch {
    return NextResponse.json(
      { error: "Failed to mark notifications as read." },
      { status: 500 }
    );
  }
}
