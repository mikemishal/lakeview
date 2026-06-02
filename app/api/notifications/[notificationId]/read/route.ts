import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AuthAccessError,
  getCurrentOwnerProfile,
  getCurrentProviderProfile,
  getRequiredAuthUserId,
} from "@/lib/auth-access";

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    await getRequiredAuthUserId();
    const { notificationId } = await context.params;

    const existingNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existingNotification) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }

    const [ownerProfile, providerProfile] = await Promise.all([
      getCurrentOwnerProfile(),
      getCurrentProviderProfile(),
    ]);

    const ownerCanAccess =
      existingNotification.audienceType === "owner" &&
      Boolean(ownerProfile) &&
      existingNotification.ownerProfileId === ownerProfile?.id;

    const providerCanAccess =
      existingNotification.audienceType === "provider" &&
      Boolean(providerProfile) &&
      existingNotification.providerId === providerProfile?.id;

    if (!ownerCanAccess && !providerCanAccess) {
      return NextResponse.json(
        { error: "You do not have access to this resource." },
        { status: 403 }
      );
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
      },
      include: {
        cleaningJob: true,
        property: true,
        provider: true,
      },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to mark notification as read." },
      { status: 500 }
    );
  }
}
