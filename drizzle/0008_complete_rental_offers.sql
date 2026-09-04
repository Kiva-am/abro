CREATE TABLE `rental_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`listing_id` integer NOT NULL,
	`renter_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`monthly_rent` integer NOT NULL,
	`deposit` integer DEFAULT 0 NOT NULL,
	`move_in_date` text NOT NULL,
	`lease_months` integer NOT NULL,
	`terms` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'offered' NOT NULL,
	`renter_accepted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `rental_applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`renter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rental_offers_application` ON `rental_offers` (`application_id`);
--> statement-breakpoint
CREATE INDEX `idx_rental_offers_owner_status_created` ON `rental_offers` (`owner_id`,`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_rental_offers_renter_status_created` ON `rental_offers` (`renter_id`,`status`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
--> statement-breakpoint
CREATE TABLE `phone_verification_challenges` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`send_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` text DEFAULT '1970-01-01T00:00:00.000Z' NOT NULL,
	`last_sent_at` text DEFAULT '1970-01-01T00:00:00.000Z' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
