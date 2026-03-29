import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../../src/lib/db/schema";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? "file:./data/test.db";

const client = createClient({ url: TEST_DB_URL });
export const db = drizzle(client, { schema });

export const PROFILES = [
  { id: "karan", name: "Karan", initials: "K", color: "#d4a12a" },
  { id: "vidit", name: "Vidit", initials: "V", color: "#0e4444" },
  { id: "amar", name: "Amar", initials: "A", color: "#76553c" },
];

export async function seedProfiles() {
  await db.insert(schema.profiles).values(PROFILES).onConflictDoNothing();
}

export async function seedRoasteries(
  rows: (typeof schema.roasteries.$inferInsert)[]
) {
  if (rows.length === 0) return;
  await db.insert(schema.roasteries).values(rows).onConflictDoNothing();
}

export async function seedEstates(
  rows: (typeof schema.estates.$inferInsert)[]
) {
  if (rows.length === 0) return;
  await db.insert(schema.estates).values(rows).onConflictDoNothing();
}

export async function seedEntries(
  rows: (typeof schema.coffeeEntries.$inferInsert)[]
) {
  if (rows.length === 0) return;
  await db.insert(schema.coffeeEntries).values(rows).onConflictDoNothing();
}

export async function cleanupAll() {
  // Delete photos first (cascade should handle it, but be explicit)
  await db.delete(schema.entryPhotos);
  await db.delete(schema.coffeeEntries);
  await db.delete(schema.roasteries);
  await db.delete(schema.estates);
  // Keep profiles
}

// Standard test roasteries
export const ROASTERIES = {
  subko: { id: "r-subko", name: "Subko", createdAt: "2024-01-01T00:00:00" },
  bt: { id: "r-bt", name: "Blue Tokai", createdAt: "2024-01-01T00:00:01" },
  disposable: {
    id: "r-disposable",
    name: "Disposable Roastery",
    createdAt: "2024-01-01T00:00:02",
  },
};

// Standard test estates
export const ESTATES = {
  moolay: {
    id: "e-moolay",
    name: "Moolay Estate",
    location: "Coorg, Karnataka",
    country: "India",
    masl: 1200,
    createdAt: "2024-01-01T00:00:00",
  },
  krh: {
    id: "e-krh",
    name: "Kerehaklu",
    location: "Chikmagalur",
    country: "India",
    masl: 1100,
    createdAt: "2024-01-01T00:00:01",
  },
  disposable: {
    id: "e-disposable",
    name: "Disposable Estate",
    createdAt: "2024-01-01T00:00:02",
  },
};

// Standard test entries
export const ENTRIES = {
  detailTest: {
    id: "e-detail-test",
    profileId: "vidit",
    coffeeName: "Detail Test Blend",
    roasteryId: "r-subko",
    estateId: "e-moolay",
    roastLevel: "medium-dark",
    brewType: "espresso",
    coffeeWeight: 18,
    shotWeight: 36,
    brewTime: 28,
    grindSize: "4.5",
    grinderType: "Niche Zero",
    flavorNotes: "chocolate, caramel",
    rating: 8.5,
    tasteNotes: "Rich and sweet",
    notes: "Pull at 9 bar",
    createdAt: "2024-01-01T10:00:00",
    updatedAt: "2024-01-01T10:00:00",
  },
  deleteTest: {
    id: "e-delete-test",
    profileId: "vidit",
    coffeeName: "Delete Me Coffee",
    roastLevel: "light",
    createdAt: "2024-01-01T09:00:00",
    updatedAt: "2024-01-01T09:00:00",
  },
  minimal: {
    id: "e-minimal",
    profileId: "vidit",
    coffeeName: "Minimal Entry",
    createdAt: "2024-01-01T08:00:00",
    updatedAt: "2024-01-01T08:00:00",
  },
  feed1: {
    id: "e-feed-1",
    profileId: "vidit",
    coffeeName: "Vidit Light",
    roastLevel: "light",
    roasteryId: "r-subko",
    estateId: "e-moolay",
    rating: 7.0,
    createdAt: "2024-01-05T12:00:00",
    updatedAt: "2024-01-05T12:00:00",
  },
  feed2: {
    id: "e-feed-2",
    profileId: "vidit",
    coffeeName: "Vidit Dark",
    roastLevel: "dark",
    roasteryId: "r-bt",
    estateId: "e-krh",
    rating: 6.5,
    createdAt: "2024-01-04T12:00:00",
    updatedAt: "2024-01-04T12:00:00",
  },
  feed3: {
    id: "e-feed-3",
    profileId: "karan",
    coffeeName: "Karan Medium",
    roastLevel: "medium",
    roasteryId: "r-subko",
    rating: 8.0,
    createdAt: "2024-01-03T12:00:00",
    updatedAt: "2024-01-03T12:00:00",
  },
  feed4: {
    id: "e-feed-4",
    profileId: "amar",
    coffeeName: "Amar Espresso",
    roastLevel: "medium-dark",
    brewType: "espresso",
    rating: 7.5,
    createdAt: "2024-01-02T12:00:00",
    updatedAt: "2024-01-02T12:00:00",
  },
};
