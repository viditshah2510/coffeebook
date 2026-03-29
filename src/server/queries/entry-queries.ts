import { db } from "@/lib/db";
import {
  coffeeEntries,
  entryPhotos,
  profiles,
  roasteries,
  estates,
} from "@/lib/db/schema";
import { and, desc, eq, like, or } from "drizzle-orm";

export async function getEntries(filters?: {
  profileId?: string;
  roastLevel?: string;
  roasteryId?: string;
  estateId?: string;
  search?: string;
}) {
  let query = db
    .select()
    .from(coffeeEntries)
    .innerJoin(profiles, eq(coffeeEntries.profileId, profiles.id))
    .leftJoin(roasteries, eq(coffeeEntries.roasteryId, roasteries.id))
    .leftJoin(estates, eq(coffeeEntries.estateId, estates.id))
    .orderBy(desc(coffeeEntries.createdAt));

  const conditions = [];

  if (filters?.profileId) {
    conditions.push(eq(coffeeEntries.profileId, filters.profileId));
  }
  if (filters?.roastLevel) {
    conditions.push(eq(coffeeEntries.roastLevel, filters.roastLevel));
  }
  if (filters?.roasteryId) {
    conditions.push(eq(coffeeEntries.roasteryId, filters.roasteryId));
  }
  if (filters?.estateId) {
    conditions.push(eq(coffeeEntries.estateId, filters.estateId));
  }
  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(coffeeEntries.coffeeName, term),
        like(coffeeEntries.origin, term),
        like(coffeeEntries.flavorNotes, term),
        like(coffeeEntries.notes, term)
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query;

  // Get photos for all entries
  const entryIds = rows.map((r) => r.coffee_entries.id);
  const photos =
    entryIds.length > 0
      ? await db
          .select()
          .from(entryPhotos)
          .where(
            or(...entryIds.map((id) => eq(entryPhotos.entryId, id)))!
          )
      : [];

  return rows.map((row) => ({
    ...row.coffee_entries,
    profile: row.profiles,
    roastery: row.roasteries,
    estate: row.estates,
    photos: photos.filter((p) => p.entryId === row.coffee_entries.id),
  }));
}

export async function getEntryById(id: string) {
  const rows = await db
    .select()
    .from(coffeeEntries)
    .innerJoin(profiles, eq(coffeeEntries.profileId, profiles.id))
    .leftJoin(roasteries, eq(coffeeEntries.roasteryId, roasteries.id))
    .leftJoin(estates, eq(coffeeEntries.estateId, estates.id))
    .where(eq(coffeeEntries.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const photos = await db
    .select()
    .from(entryPhotos)
    .where(eq(entryPhotos.entryId, id))
    .orderBy(entryPhotos.sortOrder);

  return {
    ...rows[0].coffee_entries,
    profile: rows[0].profiles,
    roastery: rows[0].roasteries,
    estate: rows[0].estates,
    photos,
  };
}
