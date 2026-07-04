CREATE TABLE `exegesis` (
	`id` text(15) PRIMARY KEY NOT NULL,
	`ori_name` text(30) NOT NULL,
	`loc_names` text NOT NULL,
	`description` text NOT NULL,
	`author` text(30) NOT NULL,
	`author_bio` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exegesis_oriName_unique` ON `exegesis` (`ori_name`);