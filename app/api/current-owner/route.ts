import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { authUserId: userId },
    });

    return NextResponse.json({ ownerProfile });
  } catch {
    return NextResponse.json({ error: "Failed to load current owner profile." }, { status: 500 });
  }
}
