import mysql from "/home/ubuntu/master-ai/node_modules/.pnpm/mysql2@3.15.1/node_modules/mysql2/promise.js";

const conn = await mysql.createConnection(process.env.DATABASE_URL || "");

try {
  // Add imageUrls to agent_posts
  await conn.execute("ALTER TABLE `agent_posts` ADD COLUMN IF NOT EXISTS `imageUrls` json");
  console.log("✓ imageUrls column added to agent_posts");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("✓ imageUrls column already exists");
  } else {
    console.error("Error:", e.message);
  }
}

await conn.end();
process.exit(0);
