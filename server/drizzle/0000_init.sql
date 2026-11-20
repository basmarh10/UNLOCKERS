CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`status` text NOT NULL,
	`seed` text,
	`duration` integer NOT NULL,
	`max_errors` integer NOT NULL,
	`errors` integer DEFAULT 0 NOT NULL,
	`result` text,
	`end_reason` text,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`ended_at` integer
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`nickname` text NOT NULL,
	`slot` text NOT NULL,
	`connected` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `players_game_idx` ON `players` (`game_id`);