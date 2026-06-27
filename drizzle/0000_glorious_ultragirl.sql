CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`entity` text,
	`entity_id` text,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name_en` text NOT NULL,
	`name_ur` text
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`cnic` text,
	`address` text,
	`notes` text,
	`balance` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gold_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`karat` integer NOT NULL,
	`purity_factor` real NOT NULL,
	`sell_per_tola` real NOT NULL,
	`buy_per_tola` real NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`effective_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barcode` text,
	`name_en` text NOT NULL,
	`name_ur` text,
	`category_id` integer,
	`karat` integer DEFAULT 22 NOT NULL,
	`gross_weight` real DEFAULT 0 NOT NULL,
	`net_weight` real DEFAULT 0 NOT NULL,
	`making_type` text DEFAULT 'per_gram' NOT NULL,
	`making_value` real DEFAULT 0 NOT NULL,
	`wastage_type` text DEFAULT 'charge_pct' NOT NULL,
	`wastage_value` real DEFAULT 0 NOT NULL,
	`stones_value` real DEFAULT 0 NOT NULL,
	`other_charges` real DEFAULT 0 NOT NULL,
	`hallmark` text,
	`cost_price` real DEFAULT 0 NOT NULL,
	`supplier` text,
	`image_path` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'in_stock' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_items_barcode_unique` ON `inventory_items` (`barcode`);--> statement-breakpoint
CREATE TABLE `old_gold_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer,
	`weight_grams` real DEFAULT 0 NOT NULL,
	`karat` integer DEFAULT 22 NOT NULL,
	`buy_rate_per_tola` real DEFAULT 0 NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer,
	`method` text DEFAULT 'cash' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`reference` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`item_id` integer,
	`type` text DEFAULT 'item' NOT NULL,
	`description` text NOT NULL,
	`karat` integer DEFAULT 22 NOT NULL,
	`weight_grams` real DEFAULT 0 NOT NULL,
	`rate_per_tola` real DEFAULT 0 NOT NULL,
	`gold_value` real DEFAULT 0 NOT NULL,
	`making` real DEFAULT 0 NOT NULL,
	`wastage` real DEFAULT 0 NOT NULL,
	`other` real DEFAULT 0 NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`line_total` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_no` text NOT NULL,
	`customer_id` integer,
	`user_id` integer,
	`gold_value_total` real DEFAULT 0 NOT NULL,
	`making_total` real DEFAULT 0 NOT NULL,
	`wastage_total` real DEFAULT 0 NOT NULL,
	`other_total` real DEFAULT 0 NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax_total` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`old_gold_total` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`paid_total` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_invoice_no_unique` ON `sales` (`invoice_no`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `tax_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`basis` text DEFAULT 'making_only' NOT NULL,
	`rate_pct` real,
	`fixed_amount` real,
	`active` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'salesman' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);