CREATE TABLE `agent_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterId` int NOT NULL,
	`createdBy` int NOT NULL,
	`taskType` enum('research','write','translate','compliance') NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`instruction` text NOT NULL,
	`searchTopics` json DEFAULT ('[]'),
	`targetLangs` json DEFAULT ('["zh","en","ja"]'),
	`resultArticleId` int,
	`rawResearch` text,
	`progressLog` json DEFAULT ('[]'),
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `article_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`status` enum('pending','completed','refunded') NOT NULL DEFAULT 'completed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`masterId` int NOT NULL,
	`category` enum('industry','technical','market','policy','other') NOT NULL,
	`status` enum('draft','pending','approved','rejected','published') NOT NULL DEFAULT 'draft',
	`isFree` boolean NOT NULL DEFAULT false,
	`price` decimal(10,2) NOT NULL DEFAULT '0',
	`titleZh` text NOT NULL,
	`summaryZh` text,
	`contentZh` text,
	`titleEn` text,
	`summaryEn` text,
	`contentEn` text,
	`titleJa` text,
	`summaryJa` text,
	`contentJa` text,
	`tags` json DEFAULT ('[]'),
	`coverImageUrl` text,
	`readCount` int NOT NULL DEFAULT 0,
	`purchaseCount` int NOT NULL DEFAULT 0,
	`complianceScore` decimal(5,2),
	`complianceNote` text,
	`adminNote` text,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `bounties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`masterId` int,
	`articleId` int,
	`titleZh` text NOT NULL,
	`titleEn` text,
	`titleJa` text,
	`descriptionZh` text,
	`descriptionEn` text,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('open','accepted','submitted','completed','disputed','cancelled') NOT NULL DEFAULT 'open',
	`stripePaymentIntentId` varchar(255),
	`deadline` timestamp,
	`acceptedAt` timestamp,
	`submittedAt` timestamp,
	`completedAt` timestamp,
	`memberRating` int,
	`memberFeedback` text,
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bounties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`masterId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_subscribers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`createdBy` int NOT NULL,
	`usedBy` int,
	`usedAt` timestamp,
	`maxUses` int NOT NULL DEFAULT 1,
	`useCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `master_levels` (
	`level` int NOT NULL,
	`title` varchar(64) NOT NULL,
	`titleJa` varchar(64),
	`titleEn` varchar(64),
	`minArticles` int NOT NULL DEFAULT 0,
	`minSubscribers` int NOT NULL DEFAULT 0,
	`revenueShare` decimal(5,2) NOT NULL,
	`monthlyPrice` decimal(10,2) NOT NULL,
	`yearlyPrice` decimal(10,2) NOT NULL,
	CONSTRAINT `master_levels_level` PRIMARY KEY(`level`)
);
--> statement-breakpoint
CREATE TABLE `master_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`masterId` int NOT NULL,
	`plan` enum('monthly','yearly') NOT NULL,
	`status` enum('active','cancelled','expired') NOT NULL DEFAULT 'active',
	`stripeSubscriptionId` varchar(255),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`amount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `master_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `masters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alias` varchar(64) NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`displayNameJa` varchar(128),
	`displayNameEn` varchar(128),
	`avatarUrl` text,
	`bio` text,
	`bioJa` text,
	`bioEn` text,
	`expertise` json DEFAULT ('[]'),
	`level` int NOT NULL DEFAULT 1,
	`articleCount` int NOT NULL DEFAULT 0,
	`subscriberCount` int NOT NULL DEFAULT 0,
	`totalRevenue` decimal(12,2) NOT NULL DEFAULT '0',
	`isVerified` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`isAiAgent` boolean NOT NULL DEFAULT false,
	`agentConfig` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `masters_id` PRIMARY KEY(`id`),
	CONSTRAINT `masters_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `masters_alias_unique` UNIQUE(`alias`)
);
--> statement-breakpoint
CREATE TABLE `revenue_splits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterId` int NOT NULL,
	`sourceType` enum('article_purchase','subscription','bounty') NOT NULL,
	`sourceId` int NOT NULL,
	`grossAmount` decimal(10,2) NOT NULL,
	`masterShare` decimal(5,2) NOT NULL,
	`masterAmount` decimal(10,2) NOT NULL,
	`platformAmount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_splits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','master') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isBanned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `memberLevel` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `inviteCodeUsed` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLang` enum('zh','en','ja') DEFAULT 'zh' NOT NULL;