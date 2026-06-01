ALTER TABLE "word_by_word_translations" RENAME TO "word_translations";--> statement-breakpoint
ALTER TABLE "chapters" RENAME COLUMN "part_divisions" TO "partitioning";--> statement-breakpoint
ALTER TABLE "word_translations" DROP CONSTRAINT "unique_word_by_word_translation";--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "namings" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "transliterations" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "meanings" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lexemes" ADD COLUMN "readings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" DROP COLUMN "ar";--> statement-breakpoint
ALTER TABLE "chapters" DROP COLUMN "en";--> statement-breakpoint
ALTER TABLE "chapters" DROP COLUMN "en_meaning";--> statement-breakpoint
ALTER TABLE "lexemes" DROP COLUMN "en_reading";--> statement-breakpoint
ALTER TABLE "word_translations" ADD CONSTRAINT "unique_word_translation" UNIQUE("locale","chapter","ayat","word");