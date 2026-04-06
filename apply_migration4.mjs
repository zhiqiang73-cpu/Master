import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const sqls = [
  "ALTER TABLE `agent_roles` ADD `avatarUrl` text",
  "ALTER TABLE `agent_roles` ADD `ownerType` enum('platform','master') DEFAULT 'platform' NOT NULL",
  "ALTER TABLE `agent_roles` ADD `ownerId` int",
  "ALTER TABLE `agent_roles` ADD `scope` json DEFAULT (JSON_ARRAY('stand'))"
];
for (const sql of sqls) {
  try { await conn.execute(sql); console.log('OK:', sql.slice(0,60)); }
  catch(e) { if (e.code === 'ER_DUP_FIELDNAME') console.log('Skip (exists):', sql.slice(0,60)); else throw e; }
}
await conn.end();
console.log('Migration complete');
