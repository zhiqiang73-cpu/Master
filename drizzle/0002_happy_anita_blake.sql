CREATE TABLE `ai_master_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterId` int NOT NULL,
	`modelProvider` enum('builtin','qwen','glm','minimax','openai','anthropic','custom') NOT NULL DEFAULT 'builtin',
	`apiKey` text,
	`apiEndpoint` text,
	`modelName` text,
	`systemPrompt` text,
	`researchPrompt` text,
	`writingPrompt` text,
	`researchTopics` json DEFAULT ('[]'),
	`targetLanguages` json DEFAULT ('["zh","en","ja"]'),
	`autoPublish` boolean NOT NULL DEFAULT false,
	`publishSchedule` varchar(50),
	`totalArticlesGenerated` int DEFAULT 0,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_master_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_master_configs_masterId_unique` UNIQUE(`masterId`)
);
--> statement-breakpoint
CREATE TABLE `content_moderation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int,
	`bountyId` int,
	`contentType` enum('article','bounty','comment') NOT NULL,
	`complianceScore` int DEFAULT 0,
	`passed` boolean NOT NULL DEFAULT false,
	`sensitiveWordsFound` json DEFAULT ('[]'),
	`redactedContent` text,
	`issues` json DEFAULT ('[]'),
	`suggestion` text,
	`triggeredBy` enum('auto','manual','appeal') NOT NULL DEFAULT 'auto',
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_moderation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractType` enum('early_bird','revenue_right','bounty_split') NOT NULL,
	`articleId` int,
	`masterId` int NOT NULL,
	`userId` int,
	`earlyBirdSlots` int DEFAULT 10,
	`earlyBirdFilled` int DEFAULT 0,
	`earlyBirdSharePct` int DEFAULT 5,
	`revenueSharePct` int DEFAULT 0,
	`salePrice` int DEFAULT 0,
	`status` enum('active','fulfilled','expired','cancelled') NOT NULL DEFAULT 'active',
	`totalPaidOut` int DEFAULT 0,
	`terms` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smart_contracts_id` PRIMARY KEY(`id`)
);
