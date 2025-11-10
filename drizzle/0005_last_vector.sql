ALTER TABLE `user` ADD `supabase_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_guest` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user` ADD `guest_expires_at` integer;
