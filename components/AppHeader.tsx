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
    ? "rounded-full bg-[#B8860B] px-3 py-1.5 text-sm font-semibold text-[#0D1B2A]"
    : "rounded-full px-3 py-1.5 text-sm font-medium text-[#7A7060] transition hover:bg-[#FAF7F2] hover:text-[#0D1B2A]";
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
  const dashboardHref =
    currentSection === "provider" && showProviderLink
      ? "/provider?tab=overview"
      : showOwnerLink
      ? "/owner?tab=overview"
      : showProviderLink
      ? "/provider?tab=overview"
      : "/";

  const isOwnerContext = dashboardHref.startsWith("/owner");

  const roleLabel =
    roleContext === "both"
      ? "Both"
      : roleContext === "owner"
      ? "Owner"
      : roleContext === "provider"
      ? "Provider"
      : null;

  return (
    <header className="border-b border-[#E5E0D8] bg-white/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="truncate text-sm font-semibold uppercase tracking-[0.2em] text-[#0D1B2A]"
          >
            Lakeview
          </Link>
          {roleLabel ? (
            <span className="rounded-full border border-[#E5E0D8] bg-[#FAF7F2] px-2.5 py-1 text-xs font-semibold text-[#7A7060]">
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
          {showOwnerLink || showProviderLink ? (
            <Link href={dashboardHref} className={navClass(currentSection === "owner" || currentSection === "provider")}>
              Dashboard
            </Link>
          ) : null}
          {isOwnerContext ? (
            <Link href="/owner?tab=calendar" className={navClass(false)}>
              Calendar
            </Link>
          ) : showProviderLink ? (
            <Link href="/provider?tab=calendar" className={navClass(false)}>
              Calendar
            </Link>
          ) : null}
          {showPropertiesLink && isOwnerContext ? (
            <Link href="/owner?tab=properties" className={navClass(false)}>
              Properties
            </Link>
          ) : null}
          {showOwnerLink && isOwnerContext ? (
            <Link href="/owner?tab=properties" className={navClass(false)}>
              Add Property
            </Link>
          ) : null}
          {showJobsLink ? (
            <Link
              href={isOwnerContext ? "/owner?tab=jobs" : "/provider?tab=queue"}
              className={navClass(false)}
            >
              Jobs
            </Link>
          ) : null}
          {showOwnerLink && isOwnerContext ? (
            <Link href="/owner?tab=jobs" className={navClass(false)}>
              Create Job
            </Link>
          ) : null}
          {showOwnerLink && isOwnerContext ? (
            <Link href="/owner?tab=providers" className={navClass(false)}>
              My Team
            </Link>
          ) : null}
          {showOwnerLink && isOwnerContext ? (
            <Link href="/owner?tab=providers" className={navClass(false)}>
              Add Provider
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
