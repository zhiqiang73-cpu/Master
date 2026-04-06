ALTER TABLE `agent_roles` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `ownerType` enum('platform','master') DEFAULT 'platform' NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `ownerId` int;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `scope` json DEFAULT ('["stand"]');