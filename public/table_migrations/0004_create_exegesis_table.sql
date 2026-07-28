DROP TABLE IF EXISTS `exegesis`;
DROP TABLE IF EXISTS `exegesis_content`;

CREATE TABLE `exegesis` (
	`id` text(15) PRIMARY KEY NOT NULL,
	`source` text(55) NOT NULL,
	`thought_school` integer NOT NULL,
	`ori_name` text(30) NOT NULL,
	`loc_names` text NOT NULL,
	`description` text NOT NULL,
	`authors` text NOT NULL,
	`downloaded_chapters` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exegesis_oriName_unique` ON `exegesis` (`ori_name`);--> statement-breakpoint
CREATE TABLE `exegesis_content` (
	`exegesis_id` text NOT NULL,
	`chapter_id` integer NOT NULL,
	`verse_number` integer NOT NULL,
	`translation` text NOT NULL,
	`exegesis` text,
	`footnotes` text DEFAULT '{}' NOT NULL,
	PRIMARY KEY(`exegesis_id`, `chapter_id`, `verse_number`),
	FOREIGN KEY (`exegesis_id`) REFERENCES `exegesis`(`id`) ON UPDATE no action ON DELETE cascade
);
