import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

type AdHocJobBody = {
  propertyId?: string;
  title?: string;
  scheduledDate?: string;
  dueTime?: string | null;
  requestedServiceType?: string;
  priority?: string;
  estimatedDurationMinutes?: number | string | null;
  ownerInstructions?: string | null;
  assignedProviderId?: string | null;
  ownerSelfAssigned?: boolean;
};

const REQUESTED_SERVICE_TYPES = new Set([
  "cleaning",
  "maintenance",
  "restock",
  "inspection",
  "laundry",
  "trash_removal",
]);

const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

function normalizeServiceType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized === "cleaner" ? "cleaning" : normalized;
}

function toNullableTrimmedString(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function parseNullableInteger(value: number | string | null | undefined): number | null | "invalid" {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : "invalid";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^-?\d+$/.test(trimmed)) {
    return "invalid";
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : "invalid";
}

function providerCanHandleServiceType(provider: {
  serviceType: string;
  primaryServiceType: string | null;
  capabilities: { serviceType: string; active: boolean }[];
}, requestedServiceType: string): boolean {
  const normalizedRequested = normalizeServiceType(requestedServiceType);
  const providerServiceType = normalizeServiceType(provider.serviceType);
  const providerPrimaryType = normalizeServiceType(provider.primaryServiceType);

  return (
    providerServiceType === normalizedRequested ||
    providerPrimaryType === normalizedRequested ||
    provider.capabilities.some(
      (capability) => capability.active && normalizeServiceType(capability.serviceType) === normalizedRequested
    )
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AdHocJobBody;
    const propertyId = body.propertyId?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const scheduledDateInput = body.scheduledDate?.trim() ?? "";
    const requestedServiceType = normalizeServiceType(body.requestedServiceType);
    const priority = body.priority?.trim().toLowerCase() || "normal";
    const dueTime = toNullableTrimmedString(body.dueTime);
    const ownerInstructions = toNullableTrimmedString(body.ownerInstructions);
    const assignedProviderId = body.assignedProviderId?.trim() ?? "";
    const ownerSelfAssigned = Boolean(body.ownerSelfAssigned);

    if (!propertyId || !title || !scheduledDateInput || !requestedServiceType) {
      return NextResponse.json(
        { error: "Property, title, scheduled date, and service type are required." },
        { status: 400 }
      );
    }

    if (!REQUESTED_SERVICE_TYPES.has(requestedServiceType)) {
      return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
    }

    if (!PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledDateInput);
    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled date." }, { status: 400 });
    }

    const estimatedDurationMinutes = parseNullableInteger(body.estimatedDurationMinutes);
    if (estimatedDurationMinutes === "invalid") {
      return NextResponse.json({ error: "Invalid estimated duration." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    let assignedProvider = null;
    let status = "needs_assignment";
    let ownerSelfAssignedValue = false;

    if (assignedProviderId) {
      assignedProvider = await prisma.serviceProvider.findUnique({
        where: { id: assignedProviderId },
        include: { capabilities: true },
      });

      if (
        !assignedProvider ||
        !assignedProvider.active ||
        !providerCanHandleServiceType(assignedProvider, requestedServiceType)
      ) {
        return NextResponse.json(
          { error: "Valid provider with matching capability is required." },
          { status: 400 }
        );
      }

      status = "assigned";
    } else if (ownerSelfAssigned) {
      status = "accepted";
      ownerSelfAssignedValue = true;
    }

    const cleaningType = requestedServiceType === "cleaning" ? "ad_hoc_cleaning" : "ad_hoc_service";

    const cleaningJob = await prisma.cleaningJob.create({
      data: {
        propertyId,
        calendarEventId: null,
        title,
        scheduledDate,
        dueTime,
        requestedServiceType,
        priority,
        estimatedDurationMinutes,
        ownerInstructions,
        jobSource: "manual",
        sourcePlatform: "manual",
        cleaningType,
        status,
        ownerSelfAssigned: ownerSelfAssignedValue,
        assignedProviderId: assignedProvider?.id ?? null,
        acceptedAt: ownerSelfAssignedValue ? new Date() : null,
        notes: null,
      },
      include: {
        property: true,
        calendarEvent: true,
        assignedProvider: true,
      },
    });

    if (assignedProvider) {
      await createNotification({
        audienceType: "provider",
        providerId: assignedProvider.id,
        propertyId: cleaningJob.propertyId,
        cleaningJobId: cleaningJob.id,
        type: "job_assigned",
        title: "New job assigned",
        message: `${property.name}: ${title}`,
      });
    }

    return NextResponse.json({ cleaningJob });
  } catch {
    return NextResponse.json({ error: "Failed to create ad hoc job." }, { status: 500 });
  }
}