import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthAccessError,
  requireOwnerProfile,
  requireProviderProfile,
} from "@/lib/auth-access";

type MarkReadAllBody = {
  audienceType?: "owner" | "provider" | string;
  providerId?: string;
  ownerId?: string;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as MarkReadAllBody;
    const audienceType = (body.audienceType ?? "").trim();
    const providerId = (body.providerId ?? "").trim();
    const ownerId = (body.ownerId ?? "").trim();

    if (audienceType !== "owner" && audienceType !== "provider") {
      return NextResponse.json({ error: "Invalid audience type." }, { status: 400 });
    }

    const where: {
      audienceType: "owner" | "provider";
      ownerProfileId?: string;
      providerId?: string;
      readAt: null;
    } = {
      audienceType,
      readAt: null,
    };

    if (audienceType === "owner") {
      const ownerProfile = await requireOwnerProfile();

      if (ownerId && ownerId !== ownerProfile.id) {
        return NextResponse.json(
          { error: "You do not have access to this resource." },
          { status: 403 }
        );
      }

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

    const result = await prisma.notification.updateMany({
      where,
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to mark notifications as read." },
      { status: 500 }
    );
  }
}
