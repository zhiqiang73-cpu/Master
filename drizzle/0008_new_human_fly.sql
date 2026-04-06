ALTER TABLE `agent_roles` MODIFY COLUMN `intelligenceSources` json;--> statement-breakpoint
ALTER TABLE `agent_roles` MODIFY COLUMN `outputFormats` json;--> statement-breakpoint
ALTER TABLE `agent_roles` MODIFY COLUMN `triggerKeywords` json;--> statement-breakpoint
ALTER TABLE `agent_posts` ADD `imageUrls` json DEFAULT ('[]');