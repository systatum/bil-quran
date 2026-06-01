CREATE TABLE "chapters" (
	"id" bigint PRIMARY KEY NOT NULL,
	"ar" varchar(20) NOT NULL,
	"en" varchar(15) NOT NULL,
	"en_meaning" varchar(35) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renderings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "renderings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(20) NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "renderings_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "words" (
	"chapter_id" bigint NOT NULL,
	"rendering_id" bigint NOT NULL,
	"verse" integer NOT NULL,
	"word" varchar(13),
	CONSTRAINT "surat_unique_word_rendering" UNIQUE("chapter_id","rendering_id","verse")
);
--> statement-breakpoint
ALTER TABLE "word_by_word_translations" RENAME COLUMN "surat" TO "chapter";--> statement-breakpoint
ALTER TABLE "word_by_word_translations" DROP CONSTRAINT "unique_word_by_word_translation";--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_rendering_id_renderings_id_fk" FOREIGN KEY ("rendering_id") REFERENCES "public"."renderings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_by_word_translations" ADD CONSTRAINT "unique_word_by_word_translation" UNIQUE("locale","chapter","ayat","word");