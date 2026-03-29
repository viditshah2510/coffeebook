import { db } from "@/lib/db";
import { roasteries } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

export async function getRoasteries() {
  return db.select().from(roasteries).orderBy(asc(roasteries.name));
}

export async function getRoasteryById(id: string) {
  const rows = await db
    .select()
    .from(roasteries)
    .where(eq(roasteries.id, id))
    .limit(1);
  return rows[0] ?? null;
}
