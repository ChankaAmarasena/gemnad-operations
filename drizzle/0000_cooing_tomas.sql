CREATE TABLE `activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#7951d3' NOT NULL,
	`drive_url` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_name` ON `companies` (`name`);--> statement-breakpoint
CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`publish_date` text NOT NULL,
	`publish_time` text DEFAULT '' NOT NULL,
	`type` text DEFAULT 'Single Post' NOT NULL,
	`platform` text DEFAULT 'Instagram' NOT NULL,
	`status` text DEFAULT 'Planned' NOT NULL,
	`design_status` text DEFAULT 'Pending' NOT NULL,
	`creator_id` text,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`drive_url` text DEFAULT '' NOT NULL,
	`source_key` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creator_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_source` ON `content` (`source_key`);--> statement-breakpoint
CREATE INDEX `content_date` ON `content` (`publish_date`);--> statement-breakpoint
CREATE INDEX `content_creator` ON `content` (`creator_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_email` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_user` ON `members` (`user_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`due_date` text NOT NULL,
	`assignee_id` text,
	`status` text DEFAULT 'Pending' NOT NULL,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source_key` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_source` ON `tasks` (`source_key`);--> statement-breakpoint
CREATE TRIGGER content_validate_insert BEFORE INSERT ON content BEGIN
 SELECT RAISE(ABORT,'Invalid content workflow value') WHERE NEW.status NOT IN ('Planned','In Progress','Ready','Published','On Hold') OR NEW.design_status NOT IN ('Pending','Created','Uploaded to Drive') OR NEW.priority NOT IN ('Low','Medium','High','Urgent');
END;
--> statement-breakpoint
CREATE TRIGGER content_validate_update BEFORE UPDATE ON content BEGIN
 SELECT RAISE(ABORT,'Invalid content workflow value') WHERE NEW.status NOT IN ('Planned','In Progress','Ready','Published','On Hold') OR NEW.design_status NOT IN ('Pending','Created','Uploaded to Drive') OR NEW.priority NOT IN ('Low','Medium','High','Urgent');
 SELECT RAISE(ABORT,'Invalid design transition') WHERE NEW.design_status <> OLD.design_status AND NOT ((OLD.design_status='Pending' AND NEW.design_status='Created') OR (OLD.design_status='Created' AND NEW.design_status='Uploaded to Drive'));
 SELECT RAISE(ABORT,'Upload transition must set Ready atomically') WHERE NEW.design_status='Uploaded to Drive' AND OLD.design_status<>'Uploaded to Drive' AND NEW.status<>'Ready';
END;
--> statement-breakpoint
CREATE TRIGGER content_created AFTER INSERT ON content BEGIN
 INSERT INTO activity(actor_id,entity_type,entity_id,action,detail,created_at) VALUES(NEW.updated_by,'content',NEW.id,'Created',NEW.title || ' · ' || NEW.status,NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER content_updated AFTER UPDATE ON content BEGIN
 INSERT INTO activity(actor_id,entity_type,entity_id,action,detail,created_at) VALUES(NEW.updated_by,'content',NEW.id,'Updated',NEW.title || ' · content: ' || OLD.status || ' → ' || NEW.status || ' · design: ' || OLD.design_status || ' → ' || NEW.design_status,NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER task_created AFTER INSERT ON tasks BEGIN
 INSERT INTO activity(actor_id,entity_type,entity_id,action,detail,created_at) VALUES(NEW.updated_by,'task',NEW.id,'Created',NEW.title || ' · ' || NEW.status,NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER task_updated AFTER UPDATE ON tasks BEGIN
 INSERT INTO activity(actor_id,entity_type,entity_id,action,detail,created_at) VALUES(NEW.updated_by,'task',NEW.id,'Updated',NEW.title || ' · ' || OLD.status || ' → ' || NEW.status,NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER protect_last_admin BEFORE UPDATE ON members WHEN OLD.role='Admin' AND OLD.active=1 AND (NEW.role<>'Admin' OR NEW.active<>1) BEGIN
 SELECT RAISE(ABORT,'Cannot remove last active administrator') WHERE (SELECT count(*) FROM members WHERE role='Admin' AND active=1)=1;
END;
--> statement-breakpoint
CREATE TRIGGER member_validate_insert BEFORE INSERT ON members BEGIN
 SELECT RAISE(ABORT,'Invalid membership') WHERE NEW.role NOT IN ('Admin','Manager','Designer','Staff') OR NEW.active NOT IN (0,1);
END;
--> statement-breakpoint
CREATE TRIGGER member_validate_update BEFORE UPDATE ON members BEGIN
 SELECT RAISE(ABORT,'Invalid membership') WHERE NEW.role NOT IN ('Admin','Manager','Designer','Staff') OR NEW.active NOT IN (0,1);
END;
