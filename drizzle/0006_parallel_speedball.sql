CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`booking_no` text NOT NULL,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`phone` text,
	`description` text NOT NULL,
	`karat` integer,
	`estimated_weight` real DEFAULT 0 NOT NULL,
	`estimated_amount` real DEFAULT 0 NOT NULL,
	`advance` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`expected_date` text,
	`notes` text,
	`karigar_id` integer,
	`sale_id` integer,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`delivered_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_booking_no_unique` ON `bookings` (`booking_no`);--> statement-breakpoint
CREATE TABLE `supplier_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`kind` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text,
	`entry_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`cnic` text,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
