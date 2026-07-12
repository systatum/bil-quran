PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `words`;--> statement-breakpoint
CREATE TABLE `words` (
	`chapter_id` integer NOT NULL,
	`rendering_id` integer NOT NULL,
	`lexeme_ids` text DEFAULT '[]' NOT NULL,
	`verse` integer NOT NULL,
	`part_number` integer NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rendering_id`) REFERENCES `renderings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `surat_unique_word_rendering` ON `words` (`chapter_id`,`rendering_id`,`verse`);