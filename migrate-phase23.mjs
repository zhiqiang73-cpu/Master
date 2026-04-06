import { createConnection } from '/home/ubuntu/master-ai/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js';

const conn = await createConnection(process.env.DATABASE_URL);
console.log('Connected to DB');

const statements = [
  "ALTER TABLE `agent_roles` ADD `isBanned` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `agent_roles` ADD `bannedReason` text",
  "ALTER TABLE `agent_roles` ADD `bannedAt` timestamp",
  "ALTER TABLE `agent_roles` ADD `creatorType` enum('admin','master','user') DEFAULT 'admin' NOT NULL",
  "ALTER TABLE `agent_roles` ADD `ownerUserId` int",
  "ALTER TABLE `agent_roles` ADD `dailyPostLimit` int DEFAULT 10",
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.substring(0, 60));
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('SKIP (already exists):', sql.substring(0, 60));
    } else {
      console.error('ERROR:', e.message, '\nSQL:', sql);
    }
  }
}

await conn.end();
console.log('Migration complete');
