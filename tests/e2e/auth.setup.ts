import { test as setup } from "@playwright/test";
import { signInAsOwner, signInAsProvider, signOut } from "./helpers/auth";

// signInAsOwner / signInAsProvider each call ensureOwnerProfile / ensureProviderProfile
// internally, so no duplicate call is needed here.
setup("create owner auth state", async ({ page }) => {
  await signInAsOwner(page);
  await page.context().storageState({ path: "playwright/.auth/owner.json" });
  await signOut(page);
});

setup("create provider auth state", async ({ page }) => {
  await signInAsProvider(page);
  await page.context().storageState({ path: "playwright/.auth/provider.json" });
  await signOut(page);
});
