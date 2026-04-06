ALTER TABLE `agent_roles` ADD `adCopy` text;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `adTriggerCron` varchar(100);--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `adTriggerKeywords` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `adDailyLimit` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `adTodayCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `adLastResetDate` varchar(10);--> statement-breakpoint
ALTER TABLE `master_levels` ADD `adQuotaPerDay` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `master_levels` ADD `platformAdQuotaPerDay` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `masters` ADD `career` text;--> statement-breakpoint
ALTER TABLE `masters` ADD `hobbies` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `masters` ADD `skills` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `masters` ADD `background` text;--> statement-breakpoint
ALTER TABLE `masters` ADD `knowledgeTags` json DEFAULT ('[]');