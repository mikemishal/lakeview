import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Only invite-verified accounts can see the list of claimable provider
    // profiles. This avoids exposing provider records to any signed-in user.
    const accountProfile = await prisma.accountProfile.findUnique({
      where: { authUserId: userId },
      select: { inviteCodeVerified: true },
    });

    if (!accountProfile?.inviteCodeVerified) {
      return NextResponse.json({ serviceProviders: [] });
    }

    // Return only the fields the claim UI needs, not contact details.
    const serviceProviders = await prisma.serviceProvider.findMany({
      where: {
        active: true,
        authUserId: null,
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        serviceType: true,
        primaryServiceType: true,
        capabilities: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ serviceProviders });
  } catch {
    return NextResponse.json(
      { error: "Failed to load unclaimed service providers." },
      { status: 500 }
    );
  }
}
