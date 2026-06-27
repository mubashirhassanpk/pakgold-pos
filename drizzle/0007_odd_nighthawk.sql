CREATE TABLE `committee_installments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`committee_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`month_no` integer NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`grams` real DEFAULT 0 NOT NULL,
	`rate_per_tola` real DEFAULT 0 NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`paid_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`user_id` integer,
	`note` text,
	FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `committee_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `committee_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`committee_id` integer NOT NULL,
	`customer_id` integer,
	`name` text NOT NULL,
	`phone` text,
	`payout_month` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `committee_payouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`committee_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`month_no` integer NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`grams` real DEFAULT 0 NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`sale_id` integer,
	`paid_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`user_id` integer,
	`note` text,
	FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `committee_members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `committees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'gold' NOT NULL,
	`total_months` integer DEFAULT 11 NOT NULL,
	`monthly_amount` real DEFAULT 0 NOT NULL,
	`monthly_grams` real DEFAULT 0 NOT NULL,
	`start_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `committees_code_unique` ON `committees` (`code`);--> statement-breakpoint
CREATE TABLE `item_stones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`stone_type` text DEFAULT 'diamond' NOT NULL,
	`shape` text,
	`count` integer DEFAULT 1 NOT NULL,
	`carat_weight` real DEFAULT 0 NOT NULL,
	`color_grade` text,
	`clarity_grade` text,
	`cert_lab` text,
	`cert_no` text,
	`rate_per_carat` real DEFAULT 0 NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `hallmark_lab` text;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `cert_no` text;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `cert_date` text;