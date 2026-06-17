import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const jobs = await prisma.cleaningJob.findMany({
    where: { status: { in: ["assigned", "accepted", "needs_assignment", "pending_acceptance", "in_progress"] } },
    include: {
      assignedProvider: { select: { id: true, name: true, email: true } },
      property: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  if (jobs.length === 0) { console.log("No active jobs found."); }
  for (const j of jobs) {
    console.log(`${j.status} | ${j.title.slice(0, 40)} | provider=${j.assignedProvider?.email ?? "UNASSIGNED"} | prop=${j.property?.name}`);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
