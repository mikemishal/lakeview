// Validates and normalizes external calendar URLs before the server fetches them.
//
// This guards against SSRF. The previous version accepted any http/https URL,
// which let a caller make the server fetch internal addresses (cloud metadata
// endpoints, localhost, private network hosts). We now:
//   - convert webcal:// to https://
//   - require http/https only
//   - reject IP-literal hosts (e.g. 169.254.169.254, 127.0.0.1, ::1)
//   - allow only known calendar provider hosts (Airbnb plus a configurable list)

// Base provider domains that are allowed. Subdomains are allowed automatically
// (for example www.airbnb.com matches airbnb.com). Extend at deploy time with the
// LAKEVIEW_CALENDAR_HOST_ALLOWLIST env var (comma separated, no scheme).
const DEFAULT_ALLOWED_HOST_SUFFIXES = [
  "vrbo.com",
  "homeaway.com",
  "booking.com",
  "calendar.google.com",
  "hospitable.com",
  "hostaway.com",
  "ownerrez.com",
  "lodgify.com",
  "guesty.com",
];

function getAllowedHostSuffixes(): string[] {
  const fromEnv = (process.env.LAKEVIEW_CALENDAR_HOST_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return [...DEFAULT_ALLOWED_HOST_SUFFIXES, ...fromEnv];
}

// Matches any Airbnb domain, including country variants like airbnb.co.uk.
function isAirbnbHost(hostname: string): boolean {
  return /(^|\.)airbnb\.[a-z]{2,}(\.[a-z]{2,})?$/.test(hostname);
}

// Rejects raw IPv4/IPv6 literals so callers cannot target internal addresses directly.
function isIpLiteralHost(hostname: string): boolean {
  const host = hostname.replace(/^\[/, "").replace(/\]$/, "");
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isIpv6 = host.includes(":");
  return isIpv4 || isIpv6;
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (!host || isIpLiteralHost(host)) {
    return false;
  }

  if (isAirbnbHost(host)) {
    return true;
  }

  return getAllowedHostSuffixes().some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

export function normalizeCalendarUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Calendar URL is required.");
  }

  const candidate = trimmed.replace(/^webcal:\/\//i, "https://");

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Invalid calendar URL. Please enter a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid calendar URL protocol. Use http:// or https://.");
  }

  if (!isAllowedHost(parsed.hostname)) {
    throw new Error(
      "Calendar host is not allowed. Use an Airbnb (or other supported) calendar URL."
    );
  }

  return parsed.toString();
}
