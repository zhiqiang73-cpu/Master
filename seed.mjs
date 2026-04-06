import { createConnection } from "mysql2/promise";

async function hashPassword(password) {
  const { default: bcrypt } = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

const db = await createConnection(process.env.DATABASE_URL);
console.log("Connected to database");

// Get admin user id (for invite code createdBy)
const [adminRows] = await db.execute("SELECT id FROM users WHERE email = ?", ["admin@masterai.com"]);
const adminId = adminRows[0]?.id ?? 1;

// Check if master1 already exists
const [existingMaster] = await db.execute("SELECT id FROM users WHERE email = ?", ["master1@test.com"]);
let masterId;
if (existingMaster.length > 0) {
  console.log("Master1 user already exists");
  masterId = existingMaster[0].id;
} else {
  const masterHash = await hashPassword("Master@123");
  const masterOpenId = `email_master1_${Date.now()}`;
  await db.execute(
    "INSERT INTO users (openId, email, name, passwordHash, loginMethod, role) VALUES (?, ?, ?, ?, ?, ?)",
    [masterOpenId, "master1@test.com", "测试Master张三", masterHash, "email", "master"]
  );
  const [newMaster] = await db.execute("SELECT id FROM users WHERE email = ?", ["master1@test.com"]);
  masterId = newMaster[0].id;
  console.log("✅ Created master user: master1@test.com / Master@123");
}

// Check if master profile exists for master1
const [existingMasterProfile] = await db.execute("SELECT id FROM masters WHERE userId = ?", [masterId]);
if (existingMasterProfile.length === 0 && masterId) {
  await db.execute(
    "INSERT INTO masters (userId, alias, displayName, bio, expertise, level, isVerified, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [masterId, "test-master-zhang", "张三 · 先进封装专家", "专注于先进封装技术研究，拥有10年半导体行业经验。", JSON.stringify(["先进封装", "CoWoS", "HBM", "Chiplet"]), 3, 1, 1]
  );
  console.log("✅ Created master profile for master1");
}

// Check if member1 already exists
const [existingMember] = await db.execute("SELECT id FROM users WHERE email = ?", ["member1@test.com"]);
if (existingMember.length > 0) {
  console.log("Member1 user already exists");
} else {
  const memberHash = await hashPassword("Member@123");
  const memberOpenId = `email_member1_${Date.now()}`;
  await db.execute(
    "INSERT INTO users (openId, email, name, passwordHash, loginMethod, role) VALUES (?, ?, ?, ?, ?, ?)",
    [memberOpenId, "member1@test.com", "测试用户李四", memberHash, "email", "user"]
  );
  console.log("✅ Created member user: member1@test.com / Member@123");
}

// Create sample invite codes
const [existingCodes] = await db.execute("SELECT id FROM invite_codes WHERE code = ?", ["MASTER2026"]);
if (existingCodes.length === 0) {
  await db.execute(
    "INSERT INTO invite_codes (code, createdBy, maxUses, useCount, isActive, note) VALUES (?, ?, ?, ?, ?, ?)",
    ["MASTER2026", adminId, 50, 0, 1, "Master专属邀请码（2026年）"]
  );
  await db.execute(
    "INSERT INTO invite_codes (code, createdBy, maxUses, useCount, isActive, note) VALUES (?, ?, ?, ?, ?, ?)",
    ["SEMI2026", adminId, 100, 0, 1, "半导体行业内部邀请码"]
  );
  await db.execute(
    "INSERT INTO invite_codes (code, createdBy, maxUses, useCount, isActive, note) VALUES (?, ?, ?, ?, ?, ?)",
    ["EARLYBIRD", adminId, 200, 0, 1, "早鸟用户专属码"]
  );
  console.log("✅ Created invite codes: MASTER2026, SEMI2026, EARLYBIRD");
} else {
  console.log("Invite codes already exist");
}

await db.end();
console.log("\n🎉 Seed data complete!");
console.log("\n📋 Test Accounts:");
console.log("  Admin:  admin@masterai.com  /  Admin@2026");
console.log("  Master: master1@test.com    /  Master@123");
console.log("  Member: member1@test.com    /  Member@123");
console.log("\n🎫 Invite Codes: MASTER2026, SEMI2026, EARLYBIRD");
