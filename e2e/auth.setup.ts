import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_FILE = path.resolve(__dirname, "../playwright/.auth/user.json");
const SESSION_FILE = path.resolve(__dirname, "../playwright/.auth/session.json");

setup("authenticate as Vidit", async ({ page }) => {
  await page.goto("http://localhost:3456/");

  // Step 1: Enter password
  await page.getByPlaceholder("Enter password").fill("scale@123");
  await page.getByRole("button", { name: "Enter" }).click();

  // Step 2: Profile selector appears — select Vidit
  await expect(page.getByRole("button", { name: /Vidit/i })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /Vidit/i }).click();

  // Step 3: Confirm redirect to /feed
  await page.waitForURL("**/feed", { timeout: 10_000 });

  // Step 4: Save storageState (localStorage + cookies)
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  // Step 5: Save sessionStorage manually (not included in storageState)
  const sessionData = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)!;
      data[key] = sessionStorage.getItem(key)!;
    }
    return data;
  });

  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), "utf-8");
  console.log("Auth setup complete. Session data:", sessionData);
});
