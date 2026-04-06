CREATE TABLE `coupon_usages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int,
	`discountAmount` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`couponType` enum('fixed','percent') NOT NULL,
	`value` int NOT NULL,
	`minSpend` int NOT NULL DEFAULT 0,
	`maxDiscount` int,
	`totalCount` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`perUserLimit` int NOT NULL DEFAULT 1,
	`targetUserId` int,
	`description` varchar(200),
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`txType` enum('recharge','spend','refund','coupon','admin_grant','admin_deduct') NOT NULL,
	`amount` int NOT NULL,
	`balanceBefore` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` varchar(200),
	`relatedId` varchar(100),
	`couponId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`frozenBalance` int NOT NULL DEFAULT 0,
	`totalCharged` int NOT NULL DEFAULT 0,
	`totalSpent` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallets_userId_unique` UNIQUE(`userId`)
);
