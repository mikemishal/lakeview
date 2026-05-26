import { prisma } from "@/lib/prisma";

export type CreateNotificationInput = {
  audienceType: "owner" | "provider";
  type: string;
  title: string;
  message: string;
  providerId?: string | null;
  propertyId?: string | null;
  cleaningJobId?: string | null;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        audienceType: input.audienceType,
        type: input.type,
        title: input.title,
        message: input.message,
        providerId: input.providerId ?? null,
        propertyId: input.propertyId ?? null,
        cleaningJobId: input.cleaningJobId ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}
