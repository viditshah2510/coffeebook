import { db } from "./index";
import { profiles } from "./schema";
import { PROFILES } from "../constants";

async function seed() {
  console.log("Seeding profiles...");

  for (const profile of PROFILES) {
    await db
      .insert(profiles)
      .values({
        id: profile.id,
        name: profile.name,
        initials: profile.initials,
        color: profile.color,
      })
      .onConflictDoNothing();
  }

  console.log("Seeded 3 profiles: Karan, Vidit, Amar");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
