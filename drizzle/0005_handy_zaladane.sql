CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text DEFAULT 'misc' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text,
	`method` text DEFAULT 'cash' NOT NULL,
	`expense_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
