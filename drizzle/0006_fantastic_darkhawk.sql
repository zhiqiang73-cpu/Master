ALTER TABLE `agent_roles` ADD `personalityTags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `interestTags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `replyProbability` int DEFAULT 70;