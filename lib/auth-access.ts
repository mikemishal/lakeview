import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export class AuthAccessError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthAccessError";
    this.status = status;
  }
}

export async function getRequiredAuthUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new AuthAccessError(401, "Unauthorized.");
  }

  return userId;
}

export async function getCurrentOwnerProfile() {
  const userId = await getRequiredAuthUserId();

  return prisma.ownerProfile.findUnique({
    where: { authUserId: userId },
  });
}

export async function getCurrentProviderProfile() {
  const userId = await getRequiredAuthUserId();

  return prisma.serviceProvider.findUnique({
    where: { authUserId: userId },
    include: { capabilities: true },
  });
}

export async function requireOwnerProfile() {
  const ownerProfile = await getCurrentOwnerProfile();

  if (!ownerProfile) {
    throw new AuthAccessError(403, "Owner profile is required.");
  }

  return ownerProfile;
}

export async function requireProviderProfile() {
  const serviceProvider = await getCurrentProviderProfile();

  if (!serviceProvider) {
    throw new AuthAccessError(403, "Provider profile is required.");
  }

  return serviceProvider;
}

export async function canOwnerAccessProperty(
  ownerProfileId: string,
  propertyId: string
): Promise<boolean> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerProfileId: true },
  });

  if (!property) {
    return false;
  }

  if (property.ownerProfileId === ownerProfileId) {
    return true;
  }

  // TODO: after legacy data migration, require ownerProfileId match.
  if (property.ownerProfileId === null) {
    return true;
  }

  return false;
}

export async function canOwnerAccessCleaningJob(
  ownerProfileId: string,
  jobId: string
): Promise<boolean> {
  const cleaningJob = await prisma.cleaningJob.findUnique({
    where: { id: jobId },
    include: {
      property: {
        select: { ownerProfileId: true },
      },
    },
  });

  if (!cleaningJob) {
    return false;
  }

  if (cleaningJob.property.ownerProfileId === ownerProfileId) {
    return true;
  }

  // TODO: after legacy data migration, require ownerProfileId match.
  if (cleaningJob.property.ownerProfileId === null) {
    return true;
  }

  return false;
}

export async function canProviderAccessCleaningJob(
  providerId: string,
  jobId: string
): Promise<boolean> {
  const cleaningJob = await prisma.cleaningJob.findUnique({
    where: { id: jobId },
    select: { assignedProviderId: true },
  });

  if (!cleaningJob) {
    return false;
  }

  return cleaningJob.assignedProviderId === providerId;
}
