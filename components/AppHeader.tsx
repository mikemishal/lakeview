"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import RoleSwitcher from "@/components/RoleSwitcher";

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

  // Color-code the bar by role: owner reads blue, provider reads green.
  const sectionAccent =
    currentSection === "owner"
      ? { border: "border-blue-500", chip: "border-blue-300 bg-blue-50 text-blue-700" }
      : currentSection === "provider"
      ? { border: "border-emerald-500", chip: "border-emerald-300 bg-emerald-50 text-emerald-700" }
      : { border: "border-slate-200", chip: "border-slate-300 bg-slate-100 text-slate-700" };

  return (
    <header className={`border-b-2 ${sectionAccent.border} bg-white/95`}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="truncate text-sm font-semibold uppercase tracking-[0.2em] text-slate-700"
          >
            Lakeview
          </Link>
          {roleLabel ? (
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${sectionAccent.chip}`}>
              {roleLabel}
            </span>
          ) : null}
        </div>

        <RoleSwitcher
          currentSection={currentSection}
          showOwner={showOwnerLink}
          showProvider={showProviderLink}
          showOnboarding={!showOwnerLink && !showProviderLink && showProfilesLink}
        />

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
