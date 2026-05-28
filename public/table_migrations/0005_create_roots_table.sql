CREATE TABLE "roots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"root" varchar(18) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lexemes" ADD COLUMN "root_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "lexemes" ADD CONSTRAINT "lexemes_root_id_roots_id_fk" FOREIGN KEY ("root_id") REFERENCES "public"."roots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexemes" DROP COLUMN "root";