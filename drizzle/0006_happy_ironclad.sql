CREATE TABLE `rental_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` integer NOT NULL,
	`renter_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`message` text NOT NULL,
	`move_in_date` text NOT NULL,
	`occupants` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`renter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rental_applications_listing_renter` ON `rental_applications` (`listing_id`,`renter_id`);--> statement-breakpoint
CREATE INDEX `idx_rental_applications_owner_status_created` ON `rental_applications` (`owner_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_rental_applications_renter_status_created` ON `rental_applications` (`renter_id`,`status`,`created_at`);--> statement-breakpoint
PRAGMA optimize;
