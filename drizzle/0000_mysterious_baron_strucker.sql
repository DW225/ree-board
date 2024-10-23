CREATE TABLE `board` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`state` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `board_state_index` ON `board` (`state`);--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`board_id` text NOT NULL,
	`role` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `members_user_id_index` ON `member` (`user_id`);--> statement-breakpoint
CREATE INDEX `members_board_id_index` ON `member` (`board_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_board_id_user_id_unique` ON `member` (`board_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `post` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`user_id` text,
	`board_id` text NOT NULL,
	`post_type` integer NOT NULL,
	`vote_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "vote_count_check" CHECK("post"."vote_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `post_board_id_index` ON `post` (`board_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kinde_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_kinde_id_unique` ON `user` (`kinde_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_name_index` ON `user` (`name`);--> statement-breakpoint
CREATE TABLE `vote` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`post_id` text NOT NULL,
	`board_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `votes_composite_index` ON `vote` (`board_id`,`user_id`,`post_id`);

--> statement-breakpoint
-- Trigger to increment vote_count when a vote is added
CREATE TRIGGER increment_vote_count
AFTER INSERT ON `vote`
BEGIN
    UPDATE `post`
    SET `vote_count` = (SELECT COUNT(*) FROM `vote` WHERE `post_id` = NEW.post_id)
    WHERE id = NEW.post_id;
END;
--> statement-breakpoint
-- Trigger to decrement vote_count when a vote is removed
CREATE TRIGGER decrement_vote_count
AFTER DELETE ON `vote`
BEGIN
    UPDATE `post`
    SET `vote_count` = (SELECT COUNT(*) FROM `vote` WHERE `post_id` = OLD.post_id)
    WHERE id = OLD.post_id;
END;
