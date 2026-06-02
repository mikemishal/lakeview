import { prisma } from "@/lib/prisma";

export type CreateNotificationInput = {
  audienceType: "owner" | "provider";
  type: string;
  title: string;
  message: string;
  ownerProfileId?: string | null;
  providerId?: string | null;
  propertyId?: string | null;
  cleaningJobId?: string | null;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    // Owner notifications must be scoped to a specific owner. If the caller did
    // not pass ownerProfileId, derive it from the related property so each owner
    // only ever sees their own notifications.
    let ownerProfileId = input.ownerProfileId ?? null;

    if (input.audienceType === "owner" && !ownerProfileId && input.propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: input.propertyId },
        select: { ownerProfileId: true },
      });
      ownerProfileId = property?.ownerProfileId ?? null;
    }

    await prisma.notification.create({
      data: {
        audienceType: input.audienceType,
        type: input.type,
        title: input.title,
        message: input.message,
        ownerProfileId,
        providerId: input.providerId ?? null,
        propertyId: input.propertyId ?? null,
        cleaningJobId: input.cleaningJobId ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}
