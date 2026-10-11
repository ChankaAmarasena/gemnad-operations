ALTER TABLE members ADD COLUMN sections text;
--> statement-breakpoint
ALTER TABLE members ADD COLUMN all_companies integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE members ADD COLUMN company_ids text NOT NULL DEFAULT '[]';
--> statement-breakpoint
UPDATE members SET all_companies=1 WHERE role IN ('Admin','Manager');
