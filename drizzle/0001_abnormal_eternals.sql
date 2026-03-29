CREATE TABLE `estates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`country` text,
	`masl` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roasteries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `coffee_entries` ALTER COLUMN "rating" TO "rating" real;--> statement-breakpoint
ALTER TABLE `coffee_entries` ADD `roastery_id` text REFERENCES roasteries(id);--> statement-breakpoint
ALTER TABLE `coffee_entries` ADD `estate_id` text REFERENCES estates(id);--> statement-breakpoint
ALTER TABLE `coffee_entries` ADD `brew_type` text;--> statement-breakpoint
ALTER TABLE `coffee_entries` ADD `shot_weight` real;--> statement-breakpoint
ALTER TABLE `coffee_entries` ADD `grinder_type` text;--> statement-breakpoint
ALTER TABLE `coffee_entries` ADD `taste_notes` text;