import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS \`masters\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`alias\` varchar(64) NOT NULL,
    \`displayName\` varchar(128) NOT NULL,
    \`displayNameJa\` varchar(128),
    \`displayNameEn\` varchar(128),
    \`avatarUrl\` text,
    \`bio\` text,
    \`bioJa\` text,
    \`bioEn\` text,
    \`expertise\` json,
    \`level\` int NOT NULL DEFAULT 1,
    \`articleCount\` int NOT NULL DEFAULT 0,
    \`subscriberCount\` int NOT NULL DEFAULT 0,
    \`totalRevenue\` decimal(12,2) NOT NULL DEFAULT 0,
    \`isVerified\` boolean NOT NULL DEFAULT false,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`isAiAgent\` boolean NOT NULL DEFAULT false,
    \`agentConfig\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(\`id\`),
    UNIQUE KEY \`masters_userId_unique\` (\`userId\`),
    UNIQUE KEY \`masters_alias_unique\` (\`alias\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`articles\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`code\` varchar(32) NOT NULL,
    \`masterId\` int NOT NULL,
    \`category\` enum('industry','technical','market','policy','other') NOT NULL,
    \`status\` enum('draft','pending','approved','rejected','published') NOT NULL DEFAULT 'draft',
    \`isFree\` boolean NOT NULL DEFAULT false,
    \`price\` decimal(10,2) NOT NULL DEFAULT 0,
    \`titleZh\` text NOT NULL,
    \`summaryZh\` text,
    \`contentZh\` text,
    \`titleEn\` text,
    \`summaryEn\` text,
    \`contentEn\` text,
    \`titleJa\` text,
    \`summaryJa\` text,
    \`contentJa\` text,
    \`tags\` json,
    \`coverImageUrl\` text,
    \`readCount\` int NOT NULL DEFAULT 0,
    \`purchaseCount\` int NOT NULL DEFAULT 0,
    \`complianceScore\` decimal(5,2),
    \`complianceNote\` text,
    \`adminNote\` text,
    \`publishedAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(\`id\`),
    UNIQUE KEY \`articles_code_unique\` (\`code\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`agent_tasks\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`masterId\` int NOT NULL,
    \`createdBy\` int NOT NULL,
    \`taskType\` enum('research','write','translate','compliance') NOT NULL,
    \`status\` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
    \`instruction\` text NOT NULL,
    \`searchTopics\` json,
    \`targetLangs\` json,
    \`resultArticleId\` int,
    \`rawResearch\` text,
    \`progressLog\` json,
    \`errorMessage\` text,
    \`startedAt\` timestamp NULL,
    \`completedAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`revenue_splits\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`masterId\` int NOT NULL,
    \`sourceType\` enum('article_purchase','subscription','bounty') NOT NULL,
    \`sourceId\` int NOT NULL,
    \`grossAmount\` decimal(10,2) NOT NULL,
    \`masterShare\` decimal(5,2) NOT NULL,
    \`masterAmount\` decimal(10,2) NOT NULL,
    \`platformAmount\` decimal(10,2) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of tables) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/)?.[1];
  try {
    await conn.execute(sql);
    console.log(`✅ ${tableName} created`);
  } catch (e) {
    console.error(`❌ ${tableName}: ${e.message}`);
  }
}

// Also add missing columns to bounties if needed
try {
  await conn.execute(`ALTER TABLE bounties ADD COLUMN IF NOT EXISTS \`category\` varchar(64) DEFAULT 'other'`);
  console.log("✅ bounties.category added");
} catch(e) {
  if (!e.message.includes('Duplicate column')) console.log("bounties.category:", e.message);
}

try {
  await conn.execute(`ALTER TABLE bounties ADD COLUMN IF NOT EXISTS \`currency\` varchar(8) DEFAULT 'USD'`);
  console.log("✅ bounties.currency added");
} catch(e) {
  if (!e.message.includes('Duplicate column')) console.log("bounties.currency:", e.message);
}

await conn.end();
console.log("🎉 All tables created!");
