import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await createConnection(url);

try {
  await conn.execute(`CREATE TABLE IF NOT EXISTS \`stand_documents\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`agentRoleId\` int NOT NULL,
    \`fileName\` varchar(255) NOT NULL,
    \`fileKey\` varchar(500) NOT NULL,
    \`fileUrl\` text NOT NULL,
    \`fileType\` enum('pdf','excel','csv') NOT NULL,
    \`fileSize\` int DEFAULT 0,
    \`extractedText\` text,
    \`partNumbers\` json,
    \`keyInfo\` text,
    \`autoPost\` boolean NOT NULL DEFAULT true,
    \`postCount\` int NOT NULL DEFAULT 0,
    \`lastPostedAt\` timestamp NULL,
    \`docStatus\` enum('pending','processing','ready','failed') NOT NULL DEFAULT 'pending',
    \`errorMsg\` text,
    \`uploadedBy\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`stand_documents_id\` PRIMARY KEY(\`id\`)
  )`);
  console.log('✅ stand_documents table created!');
} catch (err) {
  if (err.code === 'ER_TABLE_EXISTS_ERROR') {
    console.log('ℹ️ Table already exists, skipping.');
  } else {
    throw err;
  }
} finally {
  await conn.end();
}
