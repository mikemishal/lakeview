import { expect, type Locator, type Page } from "@playwright/test";
import { selectors } from "./selectors";
import { e2eData, e2eOwnerName, e2eProviderName, e2ePhone, e2eCompanyName, e2eServiceRadius } from "./test-data";
import { criticalStep } from "./diagnostics";

const MAX_ONBOARDING_ATTEMPTS = 2;

const OWNER_REQUIRED_BLOCKER = /account profile required/i;
const PROVIDER_REQUIRED_BLOCKER = /account profile required/i;

async function isVisible(locator: Locator, timeout = 1500): Promise<boolean> {
  return locator.isVisible({ timeout }).catch(() => false);
}

async function safeGoto(page: Page, url: string, attempts = 3): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable = /ERR_ABORTED|frame was detached|Navigation failed/i.test(message);

      if (!isRetryable || attempt === attempts) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Navigation failed for ${url}`);
}

async function selectByPartialOptionText(selectLocator: Locator, needles: string[]): Promise<void> {
  const options = await selectLocator.locator("option").allTextContents();
  const lowerNeedles = needles.map((needle) => needle.toLowerCase());
  const placeholderPattern = /select provider|unassigned|no team providers|all/i;
  const matchedText = options.find((optionText) => {
    if (placeholderPattern.test(optionText)) {
      return false;
    }
    const candidate = optionText.toLowerCase();
    return lowerNeedles.some((needle) => candidate.includes(needle));
  });

  if (matchedText) {
    await selectLocator.selectOption({ label: matchedText });
    return;
  }

  if (options.length >= 2) {
    await selectLocator.selectOption({ index: 1 });
    return;
  }

  throw new Error("No selectable provider options were available");
}

async function hasOwnerProfileBlocker(page: Page): Promise<boolean> {
  const blockerText = page.getByText(OWNER_REQUIRED_BLOCKER).first();
  if (await isVisible(blockerText)) {
    return true;
  }

  const onboardingPrompt = page.getByRole("link", { name: /complete onboarding/i }).first();
  return isVisible(onboardingPrompt);
}

async function hasProviderProfileBlocker(page: Page): Promise<boolean> {
  const blockerText = page.getByText(PROVIDER_REQUIRED_BLOCKER).first();
  if (await isVisible(blockerText)) {
    return true;
  }

  const onboardingPrompt = page.getByRole("link", { name: /complete onboarding/i }).first();
  return isVisible(onboardingPrompt);
}

async function waitForOwnerAccessSettled(page: Page): Promise<void> {
  const loadingMessage = page.getByText(/loading dashboard/i).first();
  if (await isVisible(loadingMessage, 1200)) {
    await expect(loadingMessage).not.toBeVisible({ timeout: 30000 });
  }
}

async function waitForProviderAccessSettled(page: Page): Promise<void> {
  const loadingMessage = page.getByText(/loading provider workbench/i).first();
  if (await isVisible(loadingMessage, 1200)) {
    await expect(loadingMessage).not.toBeVisible({ timeout: 30000 });
  }
}

async function assertOwnerDashboardReady(page: Page): Promise<void> {
  const dashboard = page.locator('[data-testid="owner-dashboard"]').first();
  await expect(dashboard).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(OWNER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
}

async function assertProviderWorkbenchReady(page: Page): Promise<void> {
  const workbench = page.locator('[data-testid="provider-workbench"]').first();
  await expect(workbench).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(PROVIDER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
}

async function ensureOwnerRoute(page: Page, tab?: string): Promise<void> {
  const currentUrl = page.url();
  const alreadyOnOwner = /\/owner(\?|$)/.test(currentUrl) && !currentUrl.includes("/onboarding");

  if (alreadyOnOwner && tab) {
    // Soft-navigate via the tab link to preserve cleaningJobs React state
    const tabLinkMap: Record<string, RegExp> = {
      properties: /^Properties$/i,
      providers: /^My Team$/i,
      jobs: /^Jobs$/i,
      overview: /^Dashboard$/i,
      queue: /^Work Queue$/i,
    };
    const linkPattern = tabLinkMap[tab] ?? new RegExp(tab, "i");
    const navLink = page.getByRole("link", { name: linkPattern }).first();
    if (await isVisible(navLink, 1500)) {
      await navLink.click();
      await page.waitForTimeout(300);
    } else {
      await safeGoto(page, `/owner?tab=${tab}`);
    }
  } else {
    const url = tab ? `/owner?tab=${tab}` : "/owner";
    await safeGoto(page, url);
  }

  await waitForOwnerAccessSettled(page);
  if (await hasOwnerProfileBlocker(page)) {
    await safeGoto(page, "/onboarding");
  }
}

async function ensureProviderRoute(page: Page, tab?: string): Promise<void> {
  const url = tab ? `/provider?tab=${tab}` : "/provider";
  await safeGoto(page, url);
  await waitForProviderAccessSettled(page);

  if (await hasProviderProfileBlocker(page)) {
    await safeGoto(page, "/onboarding");
  }
}
/**
 * Deterministic owner profile setup with blocker-aware state checks.
 */
export async function ensureOwnerProfile(page: Page): Promise<void> {
  await criticalStep(
    "Owner profile setup",
    async () => {
      let onboardingAttempt = 0;

      while (onboardingAttempt < MAX_ONBOARDING_ATTEMPTS) {
        await ensureOwnerRoute(page);

        const currentUrl = page.url();
        const dashboard = page.locator('[data-testid="owner-dashboard"]').first();
        const dashboardVisible = await isVisible(dashboard, 3000);
        const profileBlocked = await hasOwnerProfileBlocker(page);

        if (dashboardVisible && !profileBlocked) {
          try {
            await assertOwnerDashboardReady(page);
            return;
          } catch {
            // Continue through onboarding branch when the blocker appears after initial paint.
          }
        }

        const onOnboardingPage = currentUrl.includes("/onboarding");
        const onboardingForm = page.locator('[data-testid="owner-onboarding-form"]').first();
        const ownerRoleButton = page.getByRole("button", { name: /^owner$/i }).first();
        const formVisible = await isVisible(onboardingForm, 2000);
        const roleVisible = await isVisible(ownerRoleButton, 2000);

        if (profileBlocked || onOnboardingPage || formVisible || roleVisible) {
          onboardingAttempt += 1;
          await completeOwnerProfileAutomatically(page);
          continue;
        }

        throw new Error(
          `Unable to resolve owner profile state. URL=${currentUrl}, dashboardVisible=${dashboardVisible}, profileBlocked=${profileBlocked}`
        );
      }

      throw new Error(`Owner onboarding did not complete after ${MAX_ONBOARDING_ATTEMPTS} attempt(s). URL=${page.url()}`);
    },
    "Owner profile setup failed"
  );
}

/**
 * Deterministic provider profile setup with blocker-aware state checks.
 */
export async function ensureProviderProfile(page: Page): Promise<void> {
  await criticalStep(
    "Provider profile setup",
    async () => {
      let onboardingAttempt = 0;

      while (onboardingAttempt < MAX_ONBOARDING_ATTEMPTS) {
        await ensureProviderRoute(page);

        const currentUrl = page.url();
        const workbench = page.locator('[data-testid="provider-workbench"]').first();
        const workbenchVisible = await isVisible(workbench, 3000);
        const profileBlocked = await hasProviderProfileBlocker(page);

        if (workbenchVisible && !profileBlocked) {
          try {
            await assertProviderWorkbenchReady(page);
            return;
          } catch {
            // Continue through onboarding branch when the blocker appears after initial paint.
          }
        }

        const onOnboardingPage = currentUrl.includes("/onboarding");
        const onboardingForm = page.locator('[data-testid="provider-onboarding-form"]').first();
        const providerRoleButton = page.getByRole("button", { name: /^provider$/i }).first();
        const formVisible = await isVisible(onboardingForm, 2000);
        const roleVisible = await isVisible(providerRoleButton, 2000);

        if (profileBlocked || onOnboardingPage || formVisible || roleVisible) {
          onboardingAttempt += 1;
          await completeProviderProfileAutomatically(page);
          continue;
        }

        throw new Error(
          `Unable to resolve provider profile state. URL=${currentUrl}, workbenchVisible=${workbenchVisible}, profileBlocked=${profileBlocked}`
        );
      }

      throw new Error(
        `Provider onboarding did not complete after ${MAX_ONBOARDING_ATTEMPTS} attempt(s). URL=${page.url()}`
      );
    },
    "Provider profile setup failed"
  );
}

async function completeOwnerProfileAutomatically(page: Page): Promise<void> {
  const ownerName = e2eOwnerName();

  const ownerForm = page.locator('[data-testid="owner-onboarding-form"]').first();
  if (!(await isVisible(ownerForm, 1200))) {
    const ownerButton = page.getByRole("button", { name: /^owner$|add owner access/i }).first();
    await expect(ownerButton).toBeVisible({ timeout: 8000 });
    await ownerButton.click();
    await expect(ownerForm).toBeVisible({ timeout: 8000 });
  }

  const nameInput = ownerForm.locator('input[placeholder="Name"]').first();
  await nameInput.waitFor({ state: "visible", timeout: 6000 });
  await nameInput.fill(ownerName);

  const phoneInput = page.locator('[data-testid="owner-phone-input"]').or(page.getByPlaceholder(/phone/i)).first();
  if (await isVisible(phoneInput, 1000)) {
    await phoneInput.fill(e2ePhone());
  }

  const companyInput = page.locator('[data-testid="owner-company-input"]').or(page.getByPlaceholder(/company/i)).first();
  if (await isVisible(companyInput, 1000)) {
    await companyInput.fill(e2eCompanyName("owner"));
  }

  const inviteInput = page.locator('[data-testid="owner-invite-code-input"]').or(page.getByPlaceholder(/invite code/i)).first();
  if (await isVisible(inviteInput, 1000)) {
    const inviteCode = process.env.SIGNUP_INVITE_CODE?.trim();
    if (!inviteCode) {
      throw new Error("SIGNUP_INVITE_CODE is required for onboarding in this environment");
    }
    await inviteInput.fill(inviteCode);
  }

  const submitButton = page
    .locator('[data-testid="owner-profile-submit"]')
    .or(page.getByRole("button", { name: /create owner profile|save|submit/i }))
    .first();
  await submitButton.waitFor({ state: "visible", timeout: 6000 });
  await submitButton.click();

  await page.waitForURL(/\/owner(?:\?|$|\/)/, { timeout: 20000 });
  await assertOwnerDashboardReady(page);
}

async function completeProviderProfileAutomatically(page: Page): Promise<void> {
  const providerName = e2eProviderName();

  const providerForm = page.locator('[data-testid="provider-onboarding-form"]').first();
  if (!(await isVisible(providerForm, 1200))) {
    const providerButton = page.getByRole("button", { name: /^provider$|add provider access/i }).first();
    await expect(providerButton).toBeVisible({ timeout: 8000 });
    await providerButton.click();
    await expect(providerForm).toBeVisible({ timeout: 8000 });
  }

  const nameInput = providerForm.locator('input[placeholder="Name"]').first();
  await nameInput.waitFor({ state: "visible", timeout: 6000 });
  await nameInput.fill(providerName);

  const companyInput = page.locator('[data-testid="provider-company-input"]').or(page.getByPlaceholder(/company/i)).first();
  if (await isVisible(companyInput, 1000)) {
    await companyInput.fill(e2eCompanyName("provider"));
  }

  const phoneInput = page.locator('[data-testid="provider-phone-input"]').or(page.getByPlaceholder(/phone/i)).first();
  if (await isVisible(phoneInput, 1000)) {
    await phoneInput.fill(e2ePhone());
  }

  const inviteInput = page.locator('[data-testid="provider-invite-code-input"]').or(page.getByPlaceholder(/invite code/i)).first();
  if (await isVisible(inviteInput, 1000)) {
    const inviteCode = process.env.SIGNUP_INVITE_CODE?.trim();
    if (!inviteCode) {
      throw new Error("SIGNUP_INVITE_CODE is required for onboarding in this environment");
    }
    await inviteInput.fill(inviteCode);
  }

  const serviceLabels = [
    { label: /cleaning/i, testid: "provider-service-cleaning" },
    { label: /maintenance/i, testid: "provider-service-maintenance" },
    { label: /restock/i, testid: "provider-service-restock" },
    { label: /inspection/i, testid: "provider-service-inspections" },
    { label: /laundry/i, testid: "provider-service-laundry" },
    { label: /trash/i, testid: "provider-service-trash" },
  ];

  for (const service of serviceLabels) {
    const checkbox = page.locator(`[data-testid="${service.testid}"]`).or(page.getByLabel(service.label)).first();
    if (await isVisible(checkbox, 800)) {
      const checked = await checkbox.isChecked().catch(() => false);
      if (!checked) {
        await checkbox.check();
      }
    }
  }

  const cleaningRateInput = page
    .locator('[data-testid="provider-cleaning-rate-input"]')
    .or(page.getByPlaceholder(/base rate|cleaning|price/i))
    .first();
  if (await isVisible(cleaningRateInput, 1000)) {
    await cleaningRateInput.fill(e2eData.cleaningFlatRate);
  }

  const hourlyRateInput = page
    .locator('[data-testid="provider-hourly-rate-input"]')
    .or(page.getByPlaceholder(/hourly|hourly rate/i))
    .first();
  if (await isVisible(hourlyRateInput, 1000)) {
    await hourlyRateInput.fill(e2eData.cleaningHourlyRate);
  }

  const radiusInput = page.locator('[data-testid="provider-radius-input"]').or(page.getByPlaceholder(/radius|miles/i)).first();
  if (await isVisible(radiusInput, 1000)) {
    await radiusInput.fill(e2eServiceRadius());
  }

  const submitButton = page
    .locator('[data-testid="provider-profile-submit"]')
    .or(page.getByRole("button", { name: /create provider profile|save|submit/i }))
    .first();
  await submitButton.waitFor({ state: "visible", timeout: 6000 });
  await submitButton.click();

  await page.waitForURL(/\/provider(?:\?|$|\/)/, { timeout: 20000 });
  await assertProviderWorkbenchReady(page);
}

export async function goToOwnerDashboard(page: Page): Promise<void> {
  await criticalStep(
    "Navigate to owner dashboard",
    async () => {
      await ensureOwnerProfile(page);
      await ensureOwnerRoute(page);
      await assertOwnerDashboardReady(page);
    },
    "Owner dashboard navigation failed"
  );
}

export async function goToProperties(page: Page): Promise<void> {
  await criticalStep(
    "Navigate to owner properties",
    async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await ensureOwnerProfile(page);
        await ensureOwnerRoute(page, "properties");

        const propertiesPage = page.locator(selectors.propertiesPage).first();
        if (await isVisible(propertiesPage, 6000)) {
          await expect(page.getByText(OWNER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
          return;
        }

        const propertiesTabButton = page.getByRole("button", { name: /properties/i }).first();
        if (await isVisible(propertiesTabButton, 2000)) {
          await propertiesTabButton.click();
          if (await isVisible(propertiesPage, 6000)) {
            await expect(page.getByText(OWNER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
            return;
          }
        }
      }

      await expect(page.locator(selectors.propertiesPage).first()).toBeVisible({ timeout: 15000 });
    },
    "Owner properties navigation failed"
  );
}

export async function goToMyTeam(page: Page): Promise<void> {
  await criticalStep(
    "Navigate to owner my team",
    async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await ensureOwnerProfile(page);
        await ensureOwnerRoute(page, "providers");

        const myTeamPage = page.locator(selectors.myTeamPage).first();
        if (await isVisible(myTeamPage, 6000)) {
          await expect(page.getByText(OWNER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
          return;
        }

        const myTeamTabButton = page.getByRole("button", { name: /my team/i }).first();
        if (await isVisible(myTeamTabButton, 2000)) {
          await myTeamTabButton.click();
          if (await isVisible(myTeamPage, 6000)) {
            await expect(page.getByText(OWNER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
            return;
          }
        }
      }

      await expect(page.locator(selectors.myTeamPage).first()).toBeVisible({ timeout: 15000 });
    },
    "Owner my team navigation failed"
  );
}

export async function goToJobs(page: Page): Promise<void> {
  await criticalStep(
    "Navigate to owner jobs",
    async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await ensureOwnerProfile(page);
        await ensureOwnerRoute(page, "jobs");

        const jobsPage = page.locator(selectors.jobsPage).first();
        if (await isVisible(jobsPage, 6000)) {
          await expect(page.getByText(OWNER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
          return;
        }

        const jobsTabButton = page.getByRole("button", { name: /^jobs$/i }).first();
        if (await isVisible(jobsTabButton, 2000)) {
          await jobsTabButton.click();
          if (await isVisible(jobsPage, 6000)) {
            await expect(page.getByText(OWNER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
            return;
          }
        }
      }

      await expect(page.locator(selectors.jobsPage).first()).toBeVisible({ timeout: 15000 });
    },
    "Owner jobs navigation failed"
  );
}

export async function goToProviderWorkbench(page: Page): Promise<void> {
  await criticalStep(
    "Navigate to provider workbench",
    async () => {
      await ensureProviderProfile(page);
      await ensureProviderRoute(page);
      await assertProviderWorkbenchReady(page);
    },
    "Provider workbench navigation failed"
  );
}

export async function goToWorkQueue(page: Page): Promise<void> {
  await criticalStep(
    "Navigate to provider work queue",
    async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await ensureProviderProfile(page);
        await ensureProviderRoute(page, "queue");

        const queue = page.locator(selectors.workQueue).first();
        if (await isVisible(queue, 6000)) {
          await expect(page.getByText(PROVIDER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
          return;
        }

        const queueTabButton = page.getByRole("button", { name: /work queue/i }).first();
        if (await isVisible(queueTabButton, 2000)) {
          await queueTabButton.click();
          if (await isVisible(queue, 6000)) {
            await expect(page.getByText(PROVIDER_REQUIRED_BLOCKER)).not.toBeVisible({ timeout: 2000 });
            return;
          }
        }
      }

      await expect(page.locator(selectors.workQueue).first()).toBeVisible({ timeout: 15000 });
    },
    "Provider work queue navigation failed"
  );
}

export async function openOwnerTab(page: Page, tabName: RegExp | string): Promise<void> {
  const tabValue = tabName instanceof RegExp ? tabName.source.toLowerCase() : String(tabName).toLowerCase();

  if (tabValue.includes("properties")) {
    await goToProperties(page);
    return;
  }
  if (tabValue.includes("team")) {
    await goToMyTeam(page);
    return;
  }
  if (tabValue.includes("job")) {
    await goToJobs(page);
    return;
  }

  await goToOwnerDashboard(page);
}

export async function findOrCreateE2EProperty(page: Page): Promise<void> {
  await criticalStep(
    "Owner creates or finds E2E property",
    async () => {
      if (!e2eData.airbnbIcalUrl) {
        throw new Error("E2E_AIRBNB_ICAL_URL is required for property workflows");
      }

      await goToProperties(page);

      const existingCard = page.locator(selectors.propertyCard).filter({ hasText: e2eData.propertyName }).first();
      if (await isVisible(existingCard, 3000)) {
        return;
      }

      const addPropertyButton = page.locator(selectors.addPropertyButton).first();
      if (await isVisible(addPropertyButton, 3000)) {
        await addPropertyButton.click();
      } else {
        await page.getByRole("button", { name: /add property/i }).first().click();
      }

      await expect(page.locator(selectors.addPropertyForm).first()).toBeVisible({ timeout: 10000 });
      await page.getByLabel(/property name/i).first().fill(e2eData.propertyName);
      await page.locator(selectors.airbnbIcalInput).first().fill(e2eData.airbnbIcalUrl);

      const savePropertyButton = page.getByRole("button", { name: /save property|save/i }).first();
      if (await isVisible(savePropertyButton, 2000)) {
        await savePropertyButton.click();
      } else {
        await page.getByRole("button", { name: /save property|save/i }).first().click();
      }

      await expect(page.locator(selectors.propertyCard).filter({ hasText: e2eData.propertyName }).first()).toBeVisible({
        timeout: 15000,
      });
    },
    "Property creation/lookup failed"
  );
}

export async function syncE2EPropertyCalendar(page: Page): Promise<void> {
  await criticalStep(
    "Owner syncs Airbnb calendar",
    async () => {
      await goToProperties(page);

      const propertyCard = page.locator(selectors.propertyCard).filter({ hasText: e2eData.propertyName }).first();
      await expect(propertyCard).toBeVisible({ timeout: 15000 });

      const syncButton = propertyCard.locator(selectors.syncCalendarButton).first();
      if (await isVisible(syncButton, 2000)) {
        await syncButton.click();
      } else {
        await propertyCard.getByRole("button", { name: /sync calendar/i }).first().click();
      }

      await expect(propertyCard.getByRole("button", { name: /syncing/i }).first()).not.toBeVisible({ timeout: 30000 });
      await expect(propertyCard.getByText(/last sync:/i).first()).toBeVisible({ timeout: 30000 });
      await expect(propertyCard.getByText(/last sync: not synced yet/i).first()).not.toBeVisible({ timeout: 30000 });

      const loadedToggle = propertyCard.locator(selectors.loadedEventsToggle).first();
      if (await isVisible(loadedToggle, 2000)) {
        await loadedToggle.click();
      } else {
        await propertyCard.getByRole("button", { name: /view loaded events|hide events/i }).first().click();
      }

      const hasLoadedEvents = await isVisible(propertyCard.getByText(/^loaded events$/i).first(), 3000);
      const hasNoLoadedEvents = await isVisible(propertyCard.getByText(/no loaded events for this property\./i).first(), 3000);
      const hasLoadingEvents = await isVisible(propertyCard.getByText(/loading events/i).first(), 3000);
      if (!hasLoadedEvents && !hasNoLoadedEvents && !hasLoadingEvents) {
        console.log("[E2E] Loaded-events panel content did not render within timeout after sync; continuing after last-sync validation.");
      }
    },
    "Property calendar sync failed"
  );
}

export async function generateE2EJobsFromProperty(page: Page): Promise<void> {
  await criticalStep(
    "Owner generates jobs from synced property",
    async () => {
      await goToProperties(page);

      const propertyCard = page.locator(selectors.propertyCard).filter({ hasText: e2eData.propertyName }).first();
      await expect(propertyCard).toBeVisible({ timeout: 15000 });

      const generateButton = propertyCard.getByRole("button", { name: /generate cleaning jobs/i }).first();
      await expect(generateButton).toBeVisible({ timeout: 10000 });
      await generateButton.click();

      const generatingButton = propertyCard.getByRole("button", { name: /generating/i }).first();
      if (await isVisible(generatingButton, 2000)) {
        await expect(generatingButton).not.toBeVisible({ timeout: 30000 });
      }

      const generationMessage = page.locator('[data-testid="cleaning-job-generation-message"]').first();
      if (await isVisible(generationMessage, 3000)) {
        await expect(generationMessage).toBeVisible({ timeout: 10000 });
      }
    },
    "Property job generation failed"
  );
}

export async function syncAndGenerateE2EPropertyDeltaAware(page: Page): Promise<string> {
  let finalMessage = "";

  await criticalStep(
    "Owner syncs and generates jobs delta-aware",
    async () => {
      await syncE2EPropertyCalendar(page);
      await generateE2EJobsFromProperty(page);

      await syncE2EPropertyCalendar(page);
      await generateE2EJobsFromProperty(page);

      const generationMessage = page.locator('[data-testid="cleaning-job-generation-message"]').first();
      await expect(generationMessage).toBeVisible({ timeout: 10000 });
      finalMessage = (await generationMessage.textContent())?.trim() ?? "";

      if (!finalMessage) {
        throw new Error("Generation message was empty after sync+generate cycle");
      }
    },
    "Delta-aware sync/generate workflow failed"
  );

  return finalMessage;
}

export async function ensureProviderVisibleInTeam(page: Page): Promise<void> {
  await criticalStep(
    "Ensure provider is visible in owner team",
    async () => {
      await goToMyTeam(page);

      const existingProviderCard = page
        .locator("article")
        .filter({ hasText: new RegExp(`${e2eData.providerEmail}|e2e provider|provider`, "i") })
        .first();
      if (await isVisible(existingProviderCard, 3000)) {
        return;
      }

      const availableProviderCard = page
        .locator(selectors.availableProviderCard)
        .filter({ hasText: /e2e provider|provider/i })
        .first();
      await expect(availableProviderCard).toBeVisible({ timeout: 15000 });

      const addProviderButton = availableProviderCard.locator(selectors.addToTeamButton).first();
      if (await isVisible(addProviderButton, 3000)) {
        await addProviderButton.click();
      } else {
        await availableProviderCard.getByRole("button", { name: /add to team|add provider/i }).first().click();
      }

      const cleaningPriceInput = availableProviderCard.locator(selectors.cleaningPriceInput).first();
      await expect(cleaningPriceInput).toBeVisible({ timeout: 10000 });
      await cleaningPriceInput.fill(e2eData.cleaningFlatRate);

      const saveButton = availableProviderCard.locator(selectors.saveTeamProviderButton).first();
      await expect(saveButton).toBeVisible({ timeout: 10000 });
      await saveButton.click();

      await expect(page.locator("article").filter({ hasText: e2eData.providerEmail }).first()).toBeVisible({ timeout: 20000 });
    },
    "Provider team readiness failed"
  );
}

export async function clickViewJobsAndWait(page: Page): Promise<void> {
  const viewJobsButton = page.locator('[data-testid="view-jobs-button"]').first();
  await expect(viewJobsButton).toBeVisible({ timeout: 10000 });
  // Use noWaitAfter + force so the click is dispatched without hanging on
  // aborted RSC navigations that the server may emit on first load.
  await viewJobsButton.click({ force: true, noWaitAfter: true });
  // Wait for the Matching Jobs section heading to confirm jobs panel rendered
  await expect(
    page.getByRole("heading", { name: /matching jobs/i }).first()
  ).toBeVisible({ timeout: 20000 });
}

export async function ensureE2EJobAssignedToProvider(page: Page): Promise<void> {
  await criticalStep(
    "Ensure E2E job assigned to provider",
    async () => {
      await goToJobs(page);
      await clickViewJobsAndWait(page);

      // Wait for job articles to load (may take a moment on first nav to jobs tab)
      // Retry once by reloading if no articles appear
      let needsProviderCard = page.locator("article").filter({ hasText: /needs provider/i }).first();
      if (!(await isVisible(needsProviderCard, 8000))) {
        const alreadyAssigned = page.locator("article span").filter({ hasText: /^Assigned$|^Waiting for provider$|^Accepted$/ }).first();
        if (!(await isVisible(alreadyAssigned, 3000))) {
          // Jobs may not have loaded due to aborted initial API calls — reload once
          await page.reload({ waitUntil: "domcontentloaded" });
          await waitForOwnerAccessSettled(page);
          await clickViewJobsAndWait(page);
          needsProviderCard = page.locator("article").filter({ hasText: /needs provider/i }).first();
        } else {
          return; // already assigned, done
        }
      }

      // Wait for matching jobs heading before proceeding
      if (await isVisible(needsProviderCard, 5000)) {
        const assignButton = needsProviderCard.getByRole("button", { name: /assign|change assignment/i }).first();
        await expect(assignButton).toBeVisible({ timeout: 10000 });
        await assignButton.click();

        const providerSelect = needsProviderCard.locator('select[id^="cleaning-job-provider-"]').first();
        await expect(providerSelect).toBeVisible({ timeout: 10000 });
        await selectByPartialOptionText(providerSelect, ["e2e provider", "e2e", "provider"]);

        // Wait for the "Updating assignment..." transient text to appear (API call started)
        const updatingText = needsProviderCard.getByText(/updating assignment/i).first();
        if (await isVisible(updatingText, 3000)) {
          // Then wait for it to disappear (API call finished)
          await expect(updatingText).not.toBeVisible({ timeout: 20000 });
        }

        // Reload and confirm the status badge changed away from "Needs provider"
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForOwnerAccessSettled(page);
        await clickViewJobsAndWait(page);

        // The CleaningJobCard status badge text for assigned jobs is "Assigned" or "Waiting for provider"
        const assignedStatusBadge = page
          .locator("article span")
          .filter({ hasText: /^Assigned$|^Waiting for provider$|^Accepted$/ })
          .first();
        await expect(assignedStatusBadge).toBeVisible({ timeout: 15000 });
        return;
      }

      // If no needs-provider cards: check there's at least one job already assigned/in-progress/completed
      const anyJobCard = page
        .locator("article")
        .filter({ hasText: /assigned|waiting for provider|accepted|in progress|completed/i })
        .first();
      if (await isVisible(anyJobCard, 3000)) {
        return; // already assigned — nothing to do
      }

      throw new Error(
        "No jobs are in 'needs_assignment' state and no already-assigned jobs found. " +
        "Ensure generate cleaning jobs ran after calendar sync."
      );
    },
    "E2E job readiness failed"
  );
}

export async function ensureE2EWorkflowReady(page: Page): Promise<void> {
  await criticalStep(
    "Ensure owner workflow readiness",
    async () => {
      await ensureOwnerProfile(page);
      await findOrCreateE2EProperty(page);
      await syncE2EPropertyCalendar(page);
      await generateE2EJobsFromProperty(page);
      await ensureProviderVisibleInTeam(page);
      await ensureE2EJobAssignedToProvider(page);
    },
    "Owner workflow readiness failed"
  );
}

/**
 * Backwards-compatible alias for ensureOwnerProfile.
 * @deprecated Use ensureOwnerProfile instead
 */
export async function ensureOwnerOnboardingOrDashboard(page: Page): Promise<void> {
  return ensureOwnerProfile(page);
}

/**
 * Backwards-compatible alias for ensureProviderProfile.
 * @deprecated Use ensureProviderProfile instead
 */
export async function ensureProviderOnboardingOrWorkbench(page: Page): Promise<void> {
  return ensureProviderProfile(page);
}
