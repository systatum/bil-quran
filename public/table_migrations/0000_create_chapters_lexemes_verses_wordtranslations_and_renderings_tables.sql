CREATE TABLE `chapters` (
	`id` integer PRIMARY KEY NOT NULL,
	`is_meccan` integer NOT NULL,
	`partitioning` text NOT NULL,
	`namings` text NOT NULL,
	`transliterations` text NOT NULL,
	`meanings` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lexemes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`root_id` integer NOT NULL,
	`token` text(25) NOT NULL,
	`readings` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`root_id`) REFERENCES `roots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `renderings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(20) NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `renderings_name_unique` ON `renderings` (`name`);--> statement-breakpoint
CREATE TABLE `roots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`root` text(18) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `word_translations` (
	`locale` text(6) NOT NULL,
	`chapter` integer NOT NULL,
	`ayat` integer NOT NULL,
	`word` integer NOT NULL,
	`meaning` text(255) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_word_translation` ON `word_translations` (`locale`,`chapter`,`ayat`,`word`);--> statement-breakpoint
CREATE TABLE `words` (
	`chapter_id` integer NOT NULL,
	`rendering_id` integer NOT NULL,
	`lexeme_id` integer NOT NULL,
	`verse` integer NOT NULL,
	`order` integer NOT NULL,
	`part_number` integer NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rendering_id`) REFERENCES `renderings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lexeme_id`) REFERENCES `lexemes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `surat_unique_word_rendering` ON `words` (`chapter_id`,`rendering_id`,`lexeme_id`,`verse`,`order`);