import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthAccessError,
  requireOwnerProfile,
  requireProviderProfile,
} from "@/lib/auth-access";
import { log } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const audienceType = (searchParams.get("audienceType") ?? "").trim();
    const providerId = (searchParams.get("providerId") ?? "").trim();
    const ownerId = (searchParams.get("ownerId") ?? "").trim();
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (audienceType !== "owner" && audienceType !== "provider") {
      return NextResponse.json({ error: "Invalid audience type." }, { status: 400 });
    }

    const where: {
      audienceType: "owner" | "provider";
      ownerProfileId?: string;
      providerId?: string;
      readAt?: null;
    } = {
      audienceType,
    };

    if (audienceType === "owner") {
      const ownerProfile = await requireOwnerProfile();

      // Owner notifications are scoped to the signed-in owner only.
      where.ownerProfileId = ownerProfile.id;
    }

    if (audienceType === "provider") {
      const currentProviderProfile = await requireProviderProfile();

      if (!providerId) {
        return NextResponse.json({ error: "Provider ID is required." }, { status: 400 });
      }

      if (providerId !== currentProviderProfile.id) {
        return NextResponse.json(
          { error: "You do not have access to this resource." },
          { status: 403 }
        );
      }

      where.providerId = currentProviderProfile.id;
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
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    log.error("notifications.list failed", {
      route: "GET /api/notifications",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}
