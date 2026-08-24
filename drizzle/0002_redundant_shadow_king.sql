CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` text NOT NULL,
	`receiver_id` text NOT NULL,
	`body` text NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_sender_receiver_created` ON `messages` (`sender_id`,`receiver_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_messages_receiver_read` ON `messages` (`receiver_id`,`read_at`);