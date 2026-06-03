import { z } from "zod";

// Closed value sets used across the app. These mirror the strings the API
// routes already accept, so swapping in these enums does not change behavior,
// it just rejects values outside the set at the boundary.

export const serviceTypeEnum = z.enum([
  "cleaning",
  "maintenance",
  "restock",
  "inspection",
  "laundry",
  "trash_removal",
]);

export const priorityEnum = z.enum(["low", "normal", "high", "urgent"]);

export const jobStatusEnum = z.enum([
  "needs_assignment",
  "assigned",
  "declined",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
]);

export const cleaningTypeEnum = z.enum([
  "checkout_cleaning",
  "turnover_cleaning",
  "ad_hoc_cleaning",
  "ad_hoc_service",
]);

export type ServiceType = z.infer<typeof serviceTypeEnum>;
export type Priority = z.infer<typeof priorityEnum>;
export type JobStatus = z.infer<typeof jobStatusEnum>;
export type CleaningType = z.infer<typeof cleaningTypeEnum>;
