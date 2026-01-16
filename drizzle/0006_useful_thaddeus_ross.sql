DROP INDEX `user_kinde_id_unique`;--> statement-breakpoint
DROP INDEX "board_state_index";--> statement-breakpoint
DROP INDEX "links_token_unique";--> statement-breakpoint
DROP INDEX "links_board_id_index";--> statement-breakpoint
DROP INDEX "members_user_id_index";--> statement-breakpoint
DROP INDEX "members_board_id_index";--> statement-breakpoint
DROP INDEX "member_board_id_user_id_unique";--> statement-breakpoint
DROP INDEX "post_board_id_index";--> statement-breakpoint
DROP INDEX "actions_user_id_index";--> statement-breakpoint
DROP INDEX "actions_board_id_index";--> statement-breakpoint
DROP INDEX "action_board_id_user_id_post_id_unique";--> statement-breakpoint
DROP INDEX "user_name_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "user_name_index";--> statement-breakpoint
DROP INDEX "votes_composite_index";--> statement-breakpoint
DROP INDEX "vote_board_id_user_id_post_id_unique";--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "kinde_id" TO "kinde_id" text NOT NULL DEFAULT '';--> statement-breakpoint
CREATE INDEX `board_state_index` ON `board` (`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `links_token_unique` ON `links` (`token`);--> statement-breakpoint
CREATE INDEX `links_board_id_index` ON `links` (`board_id`);--> statement-breakpoint
CREATE INDEX `members_user_id_index` ON `member` (`user_id`);--> statement-breakpoint
CREATE INDEX `members_board_id_index` ON `member` (`board_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_board_id_user_id_unique` ON `member` (`board_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `post_board_id_index` ON `post` (`board_id`);--> statement-breakpoint
CREATE INDEX `actions_user_id_index` ON `action` (`user_id`);--> statement-breakpoint
CREATE INDEX `actions_board_id_index` ON `action` (`board_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `action_board_id_user_id_post_id_unique` ON `action` (`board_id`,`user_id`,`post_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_name_index` ON `user` (`name`);--> statement-breakpoint
CREATE INDEX `votes_composite_index` ON `vote` (`board_id`,`user_id`,`post_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `vote_board_id_user_id_post_id_unique` ON `vote` (`board_id`,`user_id`,`post_id`);--> statement-breakpoint
ALTER TABLE `user` ALTER COLUMN "is_guest" TO "is_guest" integer DEFAULT false;