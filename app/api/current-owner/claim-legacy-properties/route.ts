import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { authUserId: userId },
    });

    if (!ownerProfile) {
      return NextResponse.json({ error: "Owner profile is required." }, { status: 400 });
    }

    const result = await prisma.property.updateMany({
      where: { ownerProfileId: null },
      data: { ownerProfileId: ownerProfile.id },
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch {
    return NextResponse.json(
      { error: "Failed to claim legacy properties." },
      { status: 500 }
    );
  }
}
