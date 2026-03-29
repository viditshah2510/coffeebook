import { test as base, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { db, cleanupAll, seedProfiles } from "./helpers/db";

const SESSION_FILE = path.resolve(__dirname, "../playwright/.auth/session.json");

function getSessionData(): Record<string, string> {
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Fallback: inject auth manually if no session file yet
    return { "coffeebook-auth": "true" };
  }
}

export const test = base.extend<{
  // no extra fixture types needed
}>({
  // Override context to inject sessionStorage before every page load
  context: async ({ context }, use) => {
    const sessionData = getSessionData();
    if (Object.keys(sessionData).length > 0) {
      await context.addInitScript((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          window.sessionStorage.setItem(key, value as string);
        }
      }, sessionData);
    }
    await use(context);
  },
});

export { expect } from "@playwright/test";

// Helper: seed profiles and clean up before/after each test
export async function withCleanDb(fn: () => Promise<void>) {
  await cleanupAll();
  await seedProfiles();
  try {
    await fn();
  } finally {
    await cleanupAll();
    await seedProfiles();
  }
}
