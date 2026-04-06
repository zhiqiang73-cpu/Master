ALTER TABLE `agent_roles` ADD `speakingStyle` text;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `catchphrase` varchar(200);--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `backgroundStory` text;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `workFocus` text;--> statement-breakpoint
ALTER TABLE `agent_roles` ADD `viewpoints` json DEFAULT ('[]');