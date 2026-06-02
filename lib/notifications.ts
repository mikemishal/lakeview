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
    // Always require explicit recipient scope before writing a notification.
    if (input.audienceType === "owner" && !input.ownerProfileId) {
      return;
    }

    if (input.audienceType === "provider" && !input.providerId) {
      return;
    }

    await prisma.notification.create({
      data: {
        audienceType: input.audienceType,
        type: input.type,
        title: input.title,
        message: input.message,
        ownerProfileId: input.ownerProfileId ?? null,
        providerId: input.providerId ?? null,
        propertyId: input.propertyId ?? null,
        cleaningJobId: input.cleaningJobId ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}
