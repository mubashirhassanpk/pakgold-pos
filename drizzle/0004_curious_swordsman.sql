CREATE TABLE `karigar_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karigar_id` integer NOT NULL,
	`kind` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text,
	`ref_type` text,
	`ref_id` text,
	`entry_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`karigar_id`) REFERENCES `karigars`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `karigars` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`cnic` text,
	`role` text DEFAULT 'karigar' NOT NULL,
	`wage_type` text DEFAULT 'monthly' NOT NULL,
	`monthly_salary` real DEFAULT 0 NOT NULL,
	`dehari_rate` real DEFAULT 0 NOT NULL,
	`commission_pct` real DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `old_gold_purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`weight_grams` real DEFAULT 0 NOT NULL,
	`karat` integer DEFAULT 22 NOT NULL,
	`buy_rate_per_tola` real DEFAULT 0 NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`purchase_id`) REFERENCES `old_gold_purchases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `old_gold_purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_no` text NOT NULL,
	`customer_id` integer,
	`customer_name` text,
	`phone` text,
	`total_weight` real DEFAULT 0 NOT NULL,
	`total_value` real DEFAULT 0 NOT NULL,
	`paid` real DEFAULT 0 NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`notes` text,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `old_gold_purchases_voucher_no_unique` ON `old_gold_purchases` (`voucher_no`);--> statement-breakpoint
ALTER TABLE `repair_jobs` ADD `karigar_id` integer;