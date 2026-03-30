import { db } from "./index";
import { profiles, roasteries, estates } from "./schema";
import { PROFILES } from "../constants";

const ROASTERIES = [
  "Blue Tokai",
  "Third Wave Coffee",
  "Subko",
  "Boojee",
  "Badra Estates",
  "Flying Squirrel",
  "Maverick & Farmer",
  "Corridor Seven",
  "Toffee Coffee Roasters",
  "Curious Life",
  "Naivo",
  "Araku Coffee",
  "Black Baza",
  "Savorworks",
  "Quick Brown Fox",
  "Koinonia",
  "Bloom Coffee",
  "IKKIS",
  "Kaveri Coffee",
  "Bombay Island Coffee",
  "Nandan Coffee",
  "Seven Beans",
  "Halli Berri",
  "Dope Coffee",
  "Rossette Coffee",
  "South India Coffee Company",
  "Leo Coffee",
  "Devan's Coffee",
  "Roastery Coffee House",
  "Riverdale Coffee",
];

const ESTATES: { name: string; location: string; country: string; masl: number | null }[] = [
  { name: "Kerehaklu Estate", location: "Chikmagalur, Karnataka", country: "India", masl: 1200 },
  { name: "Thogarihunkal Estate", location: "Bababudangiri, Chikmagalur", country: "India", masl: 1350 },
  { name: "Ratnagiri Estate", location: "Bababudangiri, Chikmagalur", country: "India", masl: 1350 },
  { name: "Baarbara Estate", location: "Chikmagalur, Karnataka", country: "India", masl: 1220 },
  { name: "Badra Estate", location: "Balehonnur, Chikmagalur", country: "India", masl: 1050 },
  { name: "Yelnoorkhan Estate", location: "Mullayanagiri, Chikmagalur", country: "India", masl: 1616 },
  { name: "Kambihalli Estate", location: "Bababudangiri, Chikmagalur", country: "India", masl: 1200 },
  { name: "Attikan Estate", location: "Biligirirangan Hills, Chamarajanagar", country: "India", masl: 1200 },
  { name: "Sangameshwar Estate", location: "Kodagu, Karnataka", country: "India", masl: 1100 },
  { name: "Bibi Plantation", location: "Suntikoppa, Kodagu", country: "India", masl: 800 },
  { name: "Riverdale Estate", location: "Coorg, Karnataka", country: "India", masl: 1050 },
  { name: "Zoya Estate", location: "Coorg, Karnataka", country: "India", masl: 1100 },
  { name: "Melkodige Estate", location: "Coorg, Karnataka", country: "India", masl: 1000 },
  { name: "Harley Estate", location: "Sakleshpur, Hassan", country: "India", masl: 1000 },
  { name: "Seethargundu Estate", location: "Chikmagalur, Karnataka", country: "India", masl: 1150 },
  { name: "Balanoor Estate", location: "Chikmagalur, Karnataka", country: "India", masl: 1050 },
  { name: "Moolay Estate", location: "Coorg, Karnataka", country: "India", masl: 1100 },
  { name: "Gowri Estate", location: "Coorg, Karnataka", country: "India", masl: 1050 },
  { name: "Kelachandra Estate", location: "Wayanad, Kerala", country: "India", masl: 950 },
  { name: "Nachammai Estate", location: "Yercaud, Shevaroy Hills", country: "India", masl: 1400 },
  { name: "Pulney Hills Estate", location: "Dindigul, Tamil Nadu", country: "India", masl: 1700 },
  { name: "Araku Valley Estate", location: "Araku Valley, Andhra Pradesh", country: "India", masl: 1000 },
];

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
  console.log(`  ${PROFILES.length} profiles`);

  console.log("Seeding roasteries...");
  for (const name of ROASTERIES) {
    // Check if exists by name
    const existing = await db.select().from(roasteries).where(
      require("drizzle-orm").eq(roasteries.name, name)
    );
    if (existing.length === 0) {
      await db.insert(roasteries).values({ name });
    }
  }
  console.log(`  ${ROASTERIES.length} roasteries`);

  console.log("Seeding estates...");
  for (const estate of ESTATES) {
    const existing = await db.select().from(estates).where(
      require("drizzle-orm").eq(estates.name, estate.name)
    );
    if (existing.length === 0) {
      await db.insert(estates).values(estate);
    }
  }
  console.log(`  ${ESTATES.length} estates`);

  console.log("Done!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
