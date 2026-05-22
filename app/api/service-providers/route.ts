import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ServiceProviderBody = {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  serviceType?: string;
  notes?: string;
};

const ALLOWED_SERVICE_TYPES = [
  "cleaner",
  "handyman",
  "restock",
  "inspector",
] as const;

function isAllowedServiceType(
  value: string
): value is (typeof ALLOWED_SERVICE_TYPES)[number] {
  return (ALLOWED_SERVICE_TYPES as readonly string[]).includes(value);
}

function toNullableTrimmed(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const serviceType = requestUrl.searchParams.get("serviceType")?.trim() ?? "";

    const serviceProviders = await prisma.serviceProvider.findMany({
      where: serviceType ? { serviceType } : undefined,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ serviceProviders });
  } catch {
    return NextResponse.json(
      { error: "Failed to load service providers." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ServiceProviderBody;

    const name = body.name?.trim() ?? "";
    const serviceType = body.serviceType?.trim() ?? "";

    if (!name) {
      return NextResponse.json(
        { error: "Provider name is required." },
        { status: 400 }
      );
    }

    if (!serviceType || !isAllowedServiceType(serviceType)) {
      return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
    }

    const serviceProvider = await prisma.serviceProvider.create({
      data: {
        name,
        companyName: toNullableTrimmed(body.companyName),
        email: toNullableTrimmed(body.email),
        phone: toNullableTrimmed(body.phone),
        serviceType,
        notes: toNullableTrimmed(body.notes),
      },
    });

    return NextResponse.json({ serviceProvider });
  } catch {
    return NextResponse.json(
      { error: "Failed to create service provider." },
      { status: 500 }
    );
  }
}
