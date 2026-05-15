ALTER TABLE "chapters" ADD COLUMN "readings" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "meanings" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lexemes" ADD COLUMN "readings" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" DROP COLUMN "ar";--> statement-breakpoint
ALTER TABLE "chapters" DROP COLUMN "en";--> statement-breakpoint
ALTER TABLE "chapters" DROP COLUMN "en_meaning";--> statement-breakpoint
ALTER TABLE "lexemes" DROP COLUMN "en_reading";