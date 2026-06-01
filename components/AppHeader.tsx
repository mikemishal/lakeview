"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

type AppHeaderProps = {
  currentSection?: "owner" | "provider" | "onboarding";
  roleContext?: "owner" | "provider" | "both";
  showOwnerLink?: boolean;
  showProviderLink?: boolean;
  showPropertiesLink?: boolean;
  showJobsLink?: boolean;
  showProfilesLink?: boolean;
};

function navClass(isActive: boolean): string {
  return isActive
    ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100";
}

export default function AppHeader({
  currentSection,
  roleContext,
  showOwnerLink = false,
  showProviderLink = false,
  showPropertiesLink = false,
  showJobsLink = false,
  showProfilesLink = true,
}: AppHeaderProps) {
  const roleLabel =
    roleContext === "both"
      ? "Both"
      : roleContext === "owner"
      ? "Owner"
      : roleContext === "provider"
      ? "Provider"
      : null;

  return (
    <header className="border-b border-slate-200 bg-white/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="truncate text-sm font-semibold uppercase tracking-[0.2em] text-slate-700"
          >
            Lakeview
          </Link>
          {roleLabel ? (
            <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {roleLabel}
            </span>
          ) : null}
        </div>

        <nav className="hidden max-w-full flex-wrap items-center justify-end gap-2 md:flex">
          {showOwnerLink ? (
            <Link href="/owner" className={navClass(currentSection === "owner")}>
              Owner Dashboard
            </Link>
          ) : null}
          {showProviderLink ? (
            <Link href="/provider" className={navClass(currentSection === "provider")}>
              Provider Dashboard
            </Link>
          ) : null}
          {showPropertiesLink ? (
            <Link href="/owner?tab=properties" className={navClass(false)}>
              Properties
            </Link>
          ) : null}
          {showJobsLink ? (
            <Link
              href={showOwnerLink ? "/owner?tab=jobs" : "/provider?tab=queue"}
              className={navClass(false)}
            >
              Jobs
            </Link>
          ) : null}
          {showProfilesLink ? (
            <Link href="/onboarding" className={navClass(currentSection === "onboarding")}>
              Profile
            </Link>
          ) : null}
        </nav>

        <div className="shrink-0">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
