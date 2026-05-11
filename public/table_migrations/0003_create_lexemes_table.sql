CREATE TABLE "lexemes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lexemes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"token" varchar(25) NOT NULL,
	"root" varchar(15) NOT NULL,
	"en_reading" varchar(50) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "words" DROP CONSTRAINT "surat_unique_word_rendering";--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "lexeme_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_lexeme_id_lexemes_id_fk" FOREIGN KEY ("lexeme_id") REFERENCES "public"."lexemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" DROP COLUMN "word";--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "surat_unique_word_rendering" UNIQUE("chapter_id","rendering_id","lexeme_id","verse","order");