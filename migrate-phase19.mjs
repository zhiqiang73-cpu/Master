import { createConnection } from "/home/ubuntu/master-ai/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js";

// TiDB does not support JSON DEFAULT with expression syntax ('[]')
// Use NULL default and handle in application layer
const statements = [
  "ALTER TABLE `agent_roles` ADD `intelligenceSources` json",
  "ALTER TABLE `agent_roles` ADD `outputFormats` json",
  "ALTER TABLE `agent_roles` ADD `triggerKeywords` json",
];

const conn = await createConnection(process.env.DATABASE_URL);
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 70));
  } catch(e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("SKIP (already exists):", stmt.slice(0, 70));
    } else {
      console.error("ERROR:", e.message, "\nSQL:", stmt);
    }
  }
}
await conn.end();
console.log("Migration complete");
