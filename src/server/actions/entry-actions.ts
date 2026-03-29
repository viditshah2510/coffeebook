"use server";

import { db } from "@/lib/db";
import { coffeeEntries, entryPhotos } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const entrySchema = z.object({
  profileId: z.string().min(1),
  coffeeName: z.string().min(1, "Coffee name is required"),
  origin: z.string().optional().default(""),
  location: z.string().optional().default(""),
  roastLevel: z.string().optional().default(""),
  flavorNotes: z.string().optional().default(""),
  coffeeWeight: z.coerce.number().positive().optional().nullable(),
  brewTime: z.coerce.number().int().positive().optional().nullable(),
  grindSize: z.string().optional().default(""),
  rating: z.coerce.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().optional().default(""),
  photoUrls: z.array(z.string()).optional().default([]),
});

export async function createEntry(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());

  // Parse photo URLs from form
  const photoUrls: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("photo_") && typeof value === "string" && value) {
      photoUrls.push(value);
    }
  }

  const data = entrySchema.parse({
    ...raw,
    coffeeWeight: raw.coffeeWeight || null,
    brewTime: raw.brewTime || null,
    rating: raw.rating || null,
    photoUrls,
  });

  const id = crypto.randomUUID();

  await db.insert(coffeeEntries).values({
    id,
    profileId: data.profileId,
    coffeeName: data.coffeeName,
    origin: data.origin || null,
    location: data.location || null,
    roastLevel: data.roastLevel || null,
    flavorNotes: data.flavorNotes || null,
    coffeeWeight: data.coffeeWeight ?? null,
    brewTime: data.brewTime ?? null,
    grindSize: data.grindSize || null,
    rating: data.rating ?? null,
    notes: data.notes || null,
  });

  // Insert photos
  for (let i = 0; i < data.photoUrls.length; i++) {
    await db.insert(entryPhotos).values({
      entryId: id,
      blobUrl: data.photoUrls[i],
      sortOrder: i,
    });
  }

  revalidatePath("/feed");
  return { id };
}

export async function updateEntry(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());

  const photoUrls: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("photo_") && typeof value === "string" && value) {
      photoUrls.push(value);
    }
  }

  const data = entrySchema.parse({
    ...raw,
    coffeeWeight: raw.coffeeWeight || null,
    brewTime: raw.brewTime || null,
    rating: raw.rating || null,
    photoUrls,
  });

  await db
    .update(coffeeEntries)
    .set({
      coffeeName: data.coffeeName,
      origin: data.origin || null,
      location: data.location || null,
      roastLevel: data.roastLevel || null,
      flavorNotes: data.flavorNotes || null,
      coffeeWeight: data.coffeeWeight ?? null,
      brewTime: data.brewTime ?? null,
      grindSize: data.grindSize || null,
      rating: data.rating ?? null,
      notes: data.notes || null,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(coffeeEntries.id, id));

  // Replace photos: delete old, insert new
  await db.delete(entryPhotos).where(eq(entryPhotos.entryId, id));
  for (let i = 0; i < data.photoUrls.length; i++) {
    await db.insert(entryPhotos).values({
      entryId: id,
      blobUrl: data.photoUrls[i],
      sortOrder: i,
    });
  }

  revalidatePath("/feed");
  revalidatePath(`/entry/${id}`);
  return { id };
}

export async function deleteEntry(id: string) {
  await db.delete(coffeeEntries).where(eq(coffeeEntries.id, id));
  revalidatePath("/feed");
}
