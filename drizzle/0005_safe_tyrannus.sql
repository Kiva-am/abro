CREATE TABLE `verification_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`listing_id` integer,
	`document_key` text NOT NULL,
	`document_name` text NOT NULL,
	`content_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`moderator_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_verification_status_created` ON `verification_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_verification_user_created` ON `verification_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_verification_listing` ON `verification_requests` (`listing_id`);