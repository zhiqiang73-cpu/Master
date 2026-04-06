CREATE TABLE `agent_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`parentId` int,
	`agentRoleId` int,
	`userId` int,
	`content` text NOT NULL,
	`likeCount` int DEFAULT 0,
	`commentStatus` enum('visible','hidden') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentRoleId` int NOT NULL,
	`postType` enum('news','report','flash','discussion','analysis') NOT NULL DEFAULT 'flash',
	`title` varchar(300),
	`content` text NOT NULL,
	`contentEn` text,
	`contentJa` text,
	`summary` varchar(500),
	`tags` json DEFAULT ('[]'),
	`sourceUrl` varchar(500),
	`likeCount` int DEFAULT 0,
	`commentCount` int DEFAULT 0,
	`repostCount` int DEFAULT 0,
	`postStatus` enum('published','draft','hidden') NOT NULL DEFAULT 'published',
	`isPinned` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`alias` varchar(50) NOT NULL,
	`avatarEmoji` varchar(10) DEFAULT '🤖',
	`avatarColor` varchar(20) DEFAULT '#4a9d8f',
	`bio` text,
	`personality` text,
	`expertise` json DEFAULT ('[]'),
	`modelProvider_role` enum('builtin','qwen','glm','minimax','openai','anthropic','custom') NOT NULL DEFAULT 'builtin',
	`apiKey` text,
	`apiEndpoint` text,
	`modelName` text,
	`postTypes` json DEFAULT ('["news","report","comment"]'),
	`postFrequency` varchar(50) DEFAULT '0 9 * * *',
	`isActive` boolean NOT NULL DEFAULT true,
	`totalPosts` int DEFAULT 0,
	`lastPostedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_roles_alias_unique` UNIQUE(`alias`)
);
--> statement-breakpoint
CREATE TABLE `agent_task_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentRoleId` int NOT NULL,
	`taskType_log` enum('post','comment','reply') NOT NULL DEFAULT 'post',
	`taskStatus_log` enum('pending','running','success','failed') NOT NULL DEFAULT 'pending',
	`prompt` text,
	`result` text,
	`errorMsg` text,
	`triggeredBy` enum('manual','schedule') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `agent_task_logs_id` PRIMARY KEY(`id`)
);
