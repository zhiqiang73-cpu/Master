ALTER TABLE `agent_roles` ADD `isBanned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `bannedReason` text;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `bannedAt` timestamp;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `creatorType` enum('admin','master','user') DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `ownerUserId` int;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `dailyPostLimit` int DEFAULT 10;