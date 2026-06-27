CREATE TABLE `repair_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_no` text NOT NULL,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`phone` text,
	`item_description` text NOT NULL,
	`job_type` text DEFAULT 'repair' NOT NULL,
	`karat` integer,
	`metal_weight` real DEFAULT 0 NOT NULL,
	`estimated_charge` real DEFAULT 0 NOT NULL,
	`advance` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`expected_date` text,
	`notes` text,
	`sale_id` integer,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`delivered_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repair_jobs_job_no_unique` ON `repair_jobs` (`job_no`);