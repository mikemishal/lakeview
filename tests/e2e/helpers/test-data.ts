import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

// Random suffix for test data uniqueness
const E2E_SUFFIX = Math.floor(Math.random() * 100000);

// E2E Test Data Helpers
export function uniqueE2EName(prefix: string): string {
  return `${prefix} ${E2E_SUFFIX}`;
}

export function uniqueE2EEmailLabel(prefix: string): string {
  return `${prefix}-${E2E_SUFFIX}`;
}

export function e2ePhone(): string {
  return "3125550199";
}

export function e2eAddress(): string {
  return "123 E2E Test Avenue";
}

export function e2eCity(): string {
  return "Chicago";
}

export function e2eState(): string {
  return "IL";
}

export function e2eZip(): string {
  return "60612";
}

export function e2eServiceRadius(): string {
  return "50";
}

export function e2eCompanyName(role: "owner" | "provider"): string {
  return role === "owner"
    ? uniqueE2EName("E2E Property Management")
    : uniqueE2EName("E2E Cleaning Team");
}

export function e2eOwnerName(): string {
  return uniqueE2EName("E2E Owner");
}

export function e2eProviderName(): string {
  return uniqueE2EName("E2E Provider");
}

export const e2eData = {
  baseUrl: process.env.E2E_BASE_URL?.trim() || "http://localhost:3000",
  ownerEmail: required("E2E_OWNER_EMAIL"),
  ownerPassword: required("E2E_OWNER_PASSWORD"),
  providerEmail: required("E2E_PROVIDER_EMAIL"),
  providerPassword: required("E2E_PROVIDER_PASSWORD"),
  airbnbIcalUrl: required("E2E_AIRBNB_ICAL_URL"),
  propertyName: "E2E Lakeview Test Property",
  adHocJobTitle: "E2E Cleaning Job",
  providerNote: "E2E Provider Note",
  issueTitle: "E2E Test Issue",
  issueNotes: "Automated test issue",
  cleaningFlatRate: "150",
  cleaningHourlyRate: "35",
};

