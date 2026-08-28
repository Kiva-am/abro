CREATE TABLE `blocked_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blocker_id` text NOT NULL,
	`blocked_user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocked_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blocked_users_pair` ON `blocked_users` (`blocker_id`,`blocked_user_id`);--> statement-breakpoint
CREATE INDEX `idx_blocked_users_blocked` ON `blocked_users` (`blocked_user_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporter_id` text NOT NULL,
	`target_type` text NOT NULL,
	`listing_id` integer,
	`reported_user_id` text,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`moderator_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reported_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_reports_status_created` ON `reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reports_reporter` ON `reports` (`reporter_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reports_listing` ON `reports` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_reports_user` ON `reports` (`reported_user_id`);