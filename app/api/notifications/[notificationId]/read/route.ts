import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const { notificationId } = await context.params;

    const existingNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existingNotification) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
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
  } catch {
    return NextResponse.json(
      { error: "Failed to mark notification as read." },
      { status: 500 }
    );
  }
}
