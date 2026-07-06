PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `word_translations`;--> statement-breakpoint
CREATE TABLE `word_translations` (
	`locale` integer NOT NULL,
	`chapter` integer NOT NULL,
	`ayat` integer NOT NULL,
	`word` integer NOT NULL,
	`meaning_sunni` text(255) NOT NULL,
	`meaning_shia` text(255)
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_word_translation` ON `word_translations` (`locale`,`chapter`,`ayat`,`word`);