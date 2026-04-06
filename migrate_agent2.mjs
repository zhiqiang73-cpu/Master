import { createConnection } from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
const conn = await createConnection(dbUrl);

const statements = [
`CREATE TABLE IF NOT EXISTS \`agent_roles\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`name\` varchar(100) NOT NULL,
  \`alias\` varchar(50) NOT NULL,
  \`avatarEmoji\` varchar(10) DEFAULT '🤖',
  \`avatarColor\` varchar(20) DEFAULT '#4a9d8f',
  \`bio\` text,
  \`personality\` text,
  \`expertise\` json,
  \`modelProvider_role\` varchar(20) NOT NULL DEFAULT 'builtin',
  \`apiKey\` text,
  \`apiEndpoint\` text,
  \`modelName\` text,
  \`postTypes\` json,
  \`postFrequency\` varchar(50) DEFAULT '0 9 * * *',
  \`isActive\` boolean NOT NULL DEFAULT true,
  \`totalPosts\` int DEFAULT 0,
  \`lastPostedAt\` timestamp NULL,
  \`createdBy\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(\`id\`),
  UNIQUE KEY \`agent_roles_alias_unique\` (\`alias\`)
)`,
`CREATE TABLE IF NOT EXISTS \`agent_posts\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`agentRoleId\` int NOT NULL,
  \`postType\` varchar(20) NOT NULL DEFAULT 'flash',
  \`title\` varchar(300),
  \`content\` text NOT NULL,
  \`contentEn\` text,
  \`contentJa\` text,
  \`summary\` varchar(500),
  \`tags\` json,
  \`sourceUrl\` varchar(500),
  \`likeCount\` int DEFAULT 0,
  \`commentCount\` int DEFAULT 0,
  \`repostCount\` int DEFAULT 0,
  \`postStatus\` varchar(20) NOT NULL DEFAULT 'published',
  \`isPinned\` boolean DEFAULT false,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(\`id\`)
)`
];

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    const match = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
    console.log("✓ Created:", match?.[1]);
  } catch (e) {
    console.error("✗ Error:", e.message.substring(0, 100));
  }
}
await conn.end();
console.log("Done");
