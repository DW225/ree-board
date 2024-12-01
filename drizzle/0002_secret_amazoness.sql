CREATE TABLE `action` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`post_id` text NOT NULL,
	`board_id` text NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `actions_user_id_index` ON `action` (`user_id`);--> statement-breakpoint
CREATE INDEX `actions_board_id_index` ON `action` (`board_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `action_board_id_user_id_post_id_unique` ON `action` (`board_id`,`user_id`,`post_id`);