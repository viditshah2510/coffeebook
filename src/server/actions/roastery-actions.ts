"use server";

import { db } from "@/lib/db";
import { roasteries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const roasterySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function createRoastery(formData: FormData) {
  const data = roasterySchema.parse({
    name: formData.get("name"),
  });

  const id = crypto.randomUUID();
  await db.insert(roasteries).values({ id, name: data.name });

  revalidatePath("/roasteries");
  revalidatePath("/entry/new");
  return { id, name: data.name };
}

export async function updateRoastery(id: string, formData: FormData) {
  const data = roasterySchema.parse({
    name: formData.get("name"),
  });

  await db.update(roasteries).set({ name: data.name }).where(eq(roasteries.id, id));

  revalidatePath("/roasteries");
  revalidatePath("/feed");
}

export async function deleteRoastery(id: string) {
  await db.delete(roasteries).where(eq(roasteries.id, id));
  revalidatePath("/roasteries");
  revalidatePath("/feed");
}
