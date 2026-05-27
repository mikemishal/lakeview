import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const serviceProviders = await prisma.serviceProvider.findMany({
      where: {
        active: true,
        authUserId: null,
      },
      include: {
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
