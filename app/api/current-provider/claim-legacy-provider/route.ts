import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type ClaimLegacyProviderBody = {
  providerId?: string;
};

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Only invite-verified, onboarded accounts may claim a provider profile.
    // Without this, any signed-in user could attach themselves to any unclaimed
    // provider profile (account takeover). A per-provider claim token would be
    // stronger; this reuses the existing onboarding invite gate for the pilot.
    const accountProfile = await prisma.accountProfile.findUnique({
      where: { authUserId: userId },
      select: { inviteCodeVerified: true },
    });

    if (!accountProfile?.inviteCodeVerified) {
      return NextResponse.json(
        { error: "Complete onboarding before claiming a provider profile." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as ClaimLegacyProviderBody;
    const providerId = body.providerId?.trim() ?? "";

    if (!providerId) {
      return NextResponse.json({ error: "Provider ID is required." }, { status: 400 });
    }

    const existingProviderForUser = await prisma.serviceProvider.findUnique({
      where: { authUserId: userId },
    });

    if (existingProviderForUser) {
      return NextResponse.json(
        { error: "This account already has a provider profile." },
        { status: 400 }
      );
    }

    const serviceProvider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
      include: { capabilities: true },
    });

    if (!serviceProvider) {
      return NextResponse.json({ error: "Service provider not found." }, { status: 404 });
    }

    if (serviceProvider.authUserId) {
      return NextResponse.json(
        { error: "Service provider is already claimed." },
        { status: 400 }
      );
    }

    const updatedProvider = await prisma.serviceProvider.update({
      where: { id: serviceProvider.id },
      data: {
        authUserId: userId,
        onboardingComplete: true,
        active: true,
      },
      include: { capabilities: true },
    });

    return NextResponse.json({ serviceProvider: updatedProvider });
  } catch {
    return NextResponse.json(
      { error: "Failed to claim legacy provider profile." },
      { status: 500 }
    );
  }
}
