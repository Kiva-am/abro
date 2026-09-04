CREATE TABLE `user_intents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`intent` text NOT NULL CHECK (`intent` IN ('find_home', 'find_roommate', 'list_property')),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_intents_user_intent` ON `user_intents` (`user_id`,`intent`);
--> statement-breakpoint
CREATE INDEX `idx_user_intents_intent` ON `user_intents` (`intent`);
