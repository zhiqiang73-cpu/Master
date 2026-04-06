ALTER TABLE `agent_roles` ADD `intelligenceSources` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `outputFormats` json DEFAULT ('["article"]');--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `triggerMode` enum('manual','scheduled','keyword') DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `triggerKeywords` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `specialty` text;