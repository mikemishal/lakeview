import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreatePropertyBody = {
  name?: string;
  address?: string;
  airbnbCalendarUrl?: string;
};

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ properties });
  } catch {
    return NextResponse.json({ error: "Failed to load properties." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePropertyBody;

    const name = body.name?.trim() ?? "";
    const address = body.address?.trim() ?? "";
    const airbnbCalendarUrl = body.airbnbCalendarUrl?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "Property name is required." }, { status: 400 });
    }

    if (!airbnbCalendarUrl) {
      return NextResponse.json(
        { error: "Airbnb calendar URL is required." },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        name,
        address: address || null,
        airbnbCalendarUrl,
      },
    });

    return NextResponse.json({ property });
  } catch {
    return NextResponse.json({ error: "Failed to create property." }, { status: 500 });
  }
}
