CREATE TABLE `board` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`state` integer NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`userId` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text,
	`boardId` integer,
	`role` integer NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`boardId`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`userId` text,
	`boardId` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`boardId`) REFERENCES `board`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kinde_id` text NOT NULL,
	`email` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `board_state_index` ON `board` (`state`);--> statement-breakpoint
CREATE INDEX `members_user_id_index` ON `member` (`userId`);--> statement-breakpoint
CREATE INDEX `members_board_id_index` ON `member` (`boardId`);--> statement-breakpoint
CREATE INDEX `post_board_id_index` ON `post` (`boardId`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_kinde_id_unique` ON `user` (`kinde_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_name_index` ON `user` (`name`);
