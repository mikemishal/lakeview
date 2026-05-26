import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const audienceType = (searchParams.get("audienceType") ?? "").trim();
    const providerId = (searchParams.get("providerId") ?? "").trim();
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (audienceType !== "owner" && audienceType !== "provider") {
      return NextResponse.json({ error: "Invalid audience type." }, { status: 400 });
    }

    if (audienceType === "provider" && !providerId) {
      return NextResponse.json({ error: "Provider ID is required." }, { status: 400 });
    }

    const where: {
      audienceType: "owner" | "provider";
      providerId?: string;
      readAt?: null;
    } = {
      audienceType,
    };

    if (audienceType === "provider") {
      where.providerId = providerId;
    }

    if (unreadOnly) {
      where.readAt = null;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
      include: {
        cleaningJob: true,
        property: true,
        provider: true,
      },
    });

    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}
