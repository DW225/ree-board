CREATE TABLE `team_invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "team_invitations_email_normalized_check" CHECK("team_invitation"."email" = lower(trim("team_invitation"."email")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitation_token_hash_unique` ON `team_invitation` (`token_hash`);--> statement-breakpoint
CREATE INDEX `team_invitations_invited_by_index` ON `team_invitation` (`invited_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitations_team_email_unique` ON `team_invitation` (`team_id`,`email`);--> statement-breakpoint
CREATE TABLE `team_member` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "team_members_role_check" CHECK("team_member"."role" in ('owner', 'member'))
);
--> statement-breakpoint
CREATE INDEX `team_members_user_id_index` ON `team_member` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_team_user_unique` ON `team_member` (`team_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `team` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `board` ADD `description` text;--> statement-breakpoint
ALTER TABLE `board` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `board` ADD `team_id` text REFERENCES team(id);--> statement-breakpoint
CREATE INDEX `board_team_id_index` ON `board` (`team_id`);