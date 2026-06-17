import { type Page, type TestInfo, expect, test } from "@playwright/test";

export async function criticalStep<T>(
  name: string,
  run: () => Promise<T>,
  failMessage: string
): Promise<T> {
  return test.step(name, async () => {
    try {
      return await run();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${failMessage}. Cause: ${reason}`);
    }
  });
}

export async function attachConsoleDiagnostics(page: Page): Promise<void> {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      // keep logs available in test output; avoid secrets
      console.error(`[browser-console] ${msg.text()}`);
    }
  });

  page.on("requestfailed", (request) => {
    console.error(`[network-failed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText}`);
  });
}

export async function expectVisibleOrThrow(
  locator: ReturnType<Page["locator"]>,
  failMessage: string,
  timeout = 15000
): Promise<void> {
  try {
    await expect(locator).toBeVisible({ timeout });
  } catch {
    throw new Error(failMessage);
  }
}

export function failureEvidenceHint(testInfo: TestInfo): string {
  return `Screenshot/trace available in: ${testInfo.outputDir}`;
}
