CREATE TABLE IF NOT EXISTS "learning_progress" (
	"user_id" varchar(200) PRIMARY KEY NOT NULL,
	"progress" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
