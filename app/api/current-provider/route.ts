import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const currentProviderProfile = await prisma.serviceProvider.findUnique({
      where: { authUserId: userId },
      include: { capabilities: true },
    });

    return NextResponse.json({ currentProviderProfile });
  } catch {
    return NextResponse.json(
      { error: "Failed to load current provider profile." },
      { status: 500 }
    );
  }
}
