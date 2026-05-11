ALTER TABLE "chapters" ADD COLUMN "is_meccan" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "part_divisions" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "part_number" integer NOT NULL;