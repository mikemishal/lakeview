import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Bulk self-claim of every unowned property was a cross-tenant data risk: any
// owner could attach all orphaned properties to their own account. Legacy data
// migration is now handled server-side by scripts/backfill-owner-ids.ts.
//
// This endpoint is kept so the existing client call does not error, but it no
// longer reassigns any properties.
export async function PATCH() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    updatedCount: 0,
    message:
      "Legacy property claiming is disabled. Ask an administrator to run the backfill.",
  });
}
