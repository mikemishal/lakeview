import { z } from "zod";

// Optional free text: trims, and turns blank into null so the DB stores null
// rather than empty strings. Accepts string, null, or a missing field.
const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  });

// Optional number: accepts a number, a numeric string, "", null, or missing.
// Blank becomes null; anything non-numeric is a validation error.
const optionalNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string" && value.trim() === "") {
      return null;
    }

    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a number." });
      return z.NEVER;
    }
    return parsed;
  });

// Shared property schema. The API route and the form can both import this so
// they validate by the same rules. The calendar URL is checked for shape here
// and still passes through normalizeCalendarUrl in the route for the SSRF guard.
export const createPropertySchema = z.object({
  name: z.string().trim().min(1, "Property name is required."),
  airbnbCalendarUrl: z.string().trim().min(1, "Airbnb calendar URL is required."),
  address: optionalText,
  listingUrl: optionalText,
  propertyType: optionalText,
  bedrooms: optionalNumber,
  bathrooms: optionalNumber,
  squareFeet: optionalNumber,
  maxGuests: optionalNumber,
  defaultCheckInTime: optionalText,
  defaultCheckOutTime: optionalText,
  floorNumber: optionalText,
  hasElevator: z.boolean().optional().default(false),
  parkingInfo: optionalText,
  accessNotes: optionalText,
  cleaningNotes: optionalText,
  supplyLocation: optionalText,
  laundryLocation: optionalText,
  trashInstructions: optionalText,
  petInfo: optionalText,
  providerInstructions: optionalText,
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
