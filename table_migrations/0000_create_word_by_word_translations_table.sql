CREATE TABLE "word_by_word_translations" (
	"locale" varchar(6) NOT NULL,
	"surat" integer NOT NULL,
	"ayat" integer NOT NULL,
	"word" integer NOT NULL,
	"meaning" varchar(255) NOT NULL,
	CONSTRAINT "unique_word_by_word_translation" UNIQUE("locale","surat","ayat","word")
);
