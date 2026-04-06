CREATE TABLE `stand_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentRoleId` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`keywords` json,
	`frequency` enum('daily','weekly','realtime') NOT NULL DEFAULT 'daily',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSentAt` timestamp,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stand_subscriptions_id` PRIMARY KEY(`id`)
);
