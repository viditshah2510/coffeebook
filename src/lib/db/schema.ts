import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  color: text("color").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const roasteries = sqliteTable("roasteries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const estates = sqliteTable("estates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  location: text("location"),
  country: text("country"),
  masl: integer("masl"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const coffeeEntries = sqliteTable("coffee_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id),
  roasteryId: text("roastery_id").references(() => roasteries.id),
  estateId: text("estate_id").references(() => estates.id),
  coffeeName: text("coffee_name").notNull(),
  origin: text("origin"),
  location: text("location"),
  roastLevel: text("roast_level"),
  brewType: text("brew_type"),
  processMethod: text("process_method"),
  flavorNotes: text("flavor_notes"),
  coffeeWeight: real("coffee_weight"),
  shotWeight: real("shot_weight"),
  brewTime: integer("brew_time"),
  grindSize: text("grind_size"),
  grinderType: text("grinder_type"),
  rating: real("rating"),
  bestHad: text("best_had"),
  nicheRecipe: text("niche_recipe"),
  tasteNotes: text("taste_notes"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const entryPhotos = sqliteTable("entry_photos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  entryId: text("entry_id")
    .notNull()
    .references(() => coffeeEntries.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  isLabel: integer("is_label", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Profile = typeof profiles.$inferSelect;
export type CoffeeEntry = typeof coffeeEntries.$inferSelect;
export type EntryPhoto = typeof entryPhotos.$inferSelect;
export type NewCoffeeEntry = typeof coffeeEntries.$inferInsert;
export type Roastery = typeof roasteries.$inferSelect;
export type NewRoastery = typeof roasteries.$inferInsert;
export type Estate = typeof estates.$inferSelect;
export type NewEstate = typeof estates.$inferInsert;
