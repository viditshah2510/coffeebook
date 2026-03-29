"use server";

import { db } from "@/lib/db";
import { estates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const estateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional().default(""),
  country: z.string().optional().default(""),
  masl: z.coerce.number().int().positive().optional().nullable(),
});

export async function createEstate(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const data = estateSchema.parse({
    ...raw,
    masl: raw.masl || null,
  });

  const id = crypto.randomUUID();
  await db.insert(estates).values({
    id,
    name: data.name,
    location: data.location || null,
    country: data.country || null,
    masl: data.masl ?? null,
  });

  revalidatePath("/estates");
  revalidatePath("/entry/new");
  return { id, name: data.name };
}

export async function updateEstate(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const data = estateSchema.parse({
    ...raw,
    masl: raw.masl || null,
  });

  await db
    .update(estates)
    .set({
      name: data.name,
      location: data.location || null,
      country: data.country || null,
      masl: data.masl ?? null,
    })
    .where(eq(estates.id, id));

  revalidatePath("/estates");
  revalidatePath("/feed");
}

export async function deleteEstate(id: string) {
  await db.delete(estates).where(eq(estates.id, id));
  revalidatePath("/estates");
  revalidatePath("/feed");
}
