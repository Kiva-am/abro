CREATE TABLE `viewing_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`renter_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`requested_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`renter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_viewing_requests_owner_status_date` ON `viewing_requests` (`owner_id`,`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_viewing_requests_renter_status_date` ON `viewing_requests` (`renter_id`,`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_viewing_requests_listing` ON `viewing_requests` (`listing_id`);