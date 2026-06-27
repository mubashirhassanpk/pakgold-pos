CREATE TABLE `silver_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fineness` integer DEFAULT 999 NOT NULL,
	`purity_factor` real DEFAULT 0.999 NOT NULL,
	`sell_per_tola` real NOT NULL,
	`buy_per_tola` real NOT NULL,
	`sell_per_kg` real DEFAULT 0 NOT NULL,
	`buy_per_kg` real DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`effective_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `metal` text DEFAULT 'gold' NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `silver_purity` integer;--> statement-breakpoint
ALTER TABLE `sale_items` ADD `metal` text DEFAULT 'gold' NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_items` ADD `silver_purity` integer;--> statement-breakpoint
ALTER TABLE `old_gold_items` ADD `metal` text DEFAULT 'gold' NOT NULL;--> statement-breakpoint
ALTER TABLE `old_gold_items` ADD `silver_purity` integer;--> statement-breakpoint
ALTER TABLE `old_gold_purchase_items` ADD `metal` text DEFAULT 'gold' NOT NULL;--> statement-breakpoint
ALTER TABLE `old_gold_purchase_items` ADD `silver_purity` integer;
