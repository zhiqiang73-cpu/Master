import { createConnection } from '/home/ubuntu/master-ai/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js';

const conn = await createConnection(process.env.DATABASE_URL);
console.log('Connected to DB');

const sql = `CREATE TABLE IF NOT EXISTS \`stand_subscriptions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`agentRoleId\` int NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`keywords\` json,
  \`frequency\` enum('daily','weekly','realtime') NOT NULL DEFAULT 'daily',
  \`isActive\` boolean NOT NULL DEFAULT true,
  \`lastSentAt\` timestamp,
  \`userId\` int,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`stand_subscriptions_id\` PRIMARY KEY(\`id\`)
)`;

try {
  await conn.execute(sql);
  console.log('OK: stand_subscriptions table created');
} catch (e) {
  console.error('ERROR:', e.message);
}

await conn.end();
console.log('Migration complete');
