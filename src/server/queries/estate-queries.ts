import { db } from "@/lib/db";
import { estates } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getEstates() {
  return db.select().from(estates).orderBy(asc(estates.name));
}

export async function getEstateById(id: string) {
  const rows = await db
    .select()
    .from(estates)
    .where(eq(estates.id, id))
    .limit(1);
  return rows[0] ?? null;
}
