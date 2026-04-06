import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Seed master_levels
await conn.execute(`
  INSERT INTO master_levels (level, title, monthlyPrice, yearlyPrice, revenueShare, minSubscribers) VALUES
  (1, '见习洞察者', 9.90, 99.00, 70, 0),
  (2, '初级分析师', 14.90, 149.00, 72, 50),
  (3, '资深分析师', 19.90, 199.00, 74, 200),
  (4, '行业专家', 29.90, 299.00, 76, 500),
  (5, '首席研究员', 39.90, 399.00, 78, 1000),
  (6, '技术权威', 49.90, 499.00, 80, 2000),
  (7, '行业领袖', 69.90, 699.00, 82, 5000),
  (8, '产业大师', 99.90, 999.00, 83, 10000),
  (9, '战略顾问', 149.90, 1499.00, 84, 20000),
  (10, '传奇大师', 199.90, 1999.00, 85, 50000)
  ON DUPLICATE KEY UPDATE title=VALUES(title),
  monthlyPrice=VALUES(monthlyPrice), yearlyPrice=VALUES(yearlyPrice),
  revenueShare=VALUES(revenueShare), minSubscribers=VALUES(minSubscribers)
`);
console.log("✅ master_levels seeded");

// 2. Seed demo users
await conn.execute(`
  INSERT INTO users (openId, name, email, loginMethod, role) VALUES
  ('demo-admin-001', '平台管理员', 'admin@masterai.com', 'email', 'admin'),
  ('demo-master-001', '芯片洞察者', 'master1@masterai.com', 'email', 'user'),
  ('demo-master-002', '封装技术专家', 'master2@masterai.com', 'email', 'user'),
  ('demo-member-001', '半导体从业者A', 'member1@masterai.com', 'email', 'user'),
  ('demo-member-002', '半导体从业者B', 'member2@masterai.com', 'email', 'user')
  ON DUPLICATE KEY UPDATE name=VALUES(name)
`);
console.log("✅ demo users seeded");

// 3. Get user IDs
const [users] = await conn.execute(
  `SELECT id, openId FROM users WHERE openId IN ('demo-master-001', 'demo-master-002', 'demo-member-001')`
);
const master1UserId = users.find(u => u.openId === 'demo-master-001')?.id;
const master2UserId = users.find(u => u.openId === 'demo-master-002')?.id;
const member1UserId = users.find(u => u.openId === 'demo-member-001')?.id;

if (master1UserId && master2UserId) {
  // 4. Seed masters
  await conn.execute(`
    INSERT INTO masters (userId, displayName, alias, bio, level, isVerified, isAiAgent, totalRevenue, subscriberCount, articleCount) VALUES
    (?, '芯片洞察者', 'chip-insight', '专注半导体行业10年，深度解析芯片设计、制造与封装技术趋势。曾任职于台积电和英特尔，现为独立研究员。', 5, 1, 0, 12580.00, 1280, 47),
    (?, '封装技术专家', 'packaging-pro', '先进封装领域权威专家，专注CoWoS、HBM、Chiplet等前沿技术研究。IEEE会员，多篇SCI论文作者。', 7, 1, 0, 38900.00, 4200, 128)
    ON DUPLICATE KEY UPDATE displayName=VALUES(displayName), bio=VALUES(bio), level=VALUES(level)
  `, [master1UserId, master2UserId]);
  console.log("✅ masters seeded");

  // 5. Get master IDs
  const [masters] = await conn.execute(
    `SELECT id, userId FROM masters WHERE userId IN (?, ?)`,
    [master1UserId, master2UserId]
  );
  const master1Id = masters.find(m => m.userId === master1UserId)?.id;
  const master2Id = masters.find(m => m.userId === master2UserId)?.id;

  if (master1Id && master2Id) {
    // 6. Seed articles
    const articles = [
      [master1Id, 'MST-IND-2026-0001',
        '2024年先进封装技术全景：CoWoS与HBM的协同演进',
        '2024 Advanced Packaging Panorama: Co-evolution of CoWoS and HBM',
        '2024年先進パッケージング技術全景：CoWoSとHBMの協調進化',
        'CoWoS与HBM技术的协同发展正在重塑AI芯片的性能边界，本文深度解析两大技术路线的最新进展与未来走向。',
        '## 引言\n\nCoWoS（Chip-on-Wafer-on-Substrate）与HBM（High Bandwidth Memory）的协同演进，正在成为AI时代半导体行业最重要的技术叙事之一。\n\n## CoWoS技术现状\n\n台积电的CoWoS-S和CoWoS-L两条技术路线分别针对不同的集成密度需求...\n\n## HBM3E的突破\n\nSK海力士和三星在HBM3E上的竞争已经进入白热化阶段...\n\n## 市场展望\n\n预计2025年CoWoS产能将扩大至每月超过15,000片晶圆...',
        'technical', JSON.stringify(['先进封装','CoWoS','HBM','AI芯片']), 0, 29.90, 'published', 3847, 312],
      [master1Id, 'MST-IND-2026-0002',
        'EUV光刻机：ASML的技术护城河与竞争格局',
        'EUV Lithography: ASML Technical Moat and Competition',
        'EUVリソグラフィ：ASMLの技術的堡と競争構造',
        'ASML在EUV光刻领域的垄断地位如何形成？未来High-NA EUV将如何改变竞争格局？',
        '## ASML的技术垄断\n\nASML是全球唯一能够生产EUV光刻机的公司，这一地位的形成经历了数十年的技术积累...\n\n## High-NA EUV的挑战\n\nHigh-NA EUV（数值孔径0.55）是下一代光刻技术的核心...',
        'industry', JSON.stringify(['EUV','ASML','光刻','半导体设备']), 1, 0.00, 'published', 5621, 0],
      [master2Id, 'MST-IND-2026-0003',
        'Chiplet时代的互联标准战争：UCIe vs EMIB',
        'Chiplet Era Interconnect Standard War: UCIe vs EMIB',
        'Chiplet時代の相互接続標準戦争：UCIe対EMIB',
        'UCIe联盟与英特尔EMIB技术的标准之争将决定Chiplet生态的未来走向。',
        '## Chiplet生态的崛起\n\nChiplet技术正在从概念走向大规模商业化，AMD、英特尔、台积电等巨头纷纷押注...\n\n## UCIe标准解析\n\nUCIe（Universal Chiplet Interconnect Express）由英特尔主导，已获得AMD、ARM、高通等50余家企业支持...',
        'technical', JSON.stringify(['Chiplet','UCIe','EMIB','先进封装']), 0, 39.90, 'published', 2934, 428],
    ];

    for (const a of articles) {
      await conn.execute(
        `INSERT INTO articles (masterId, code, titleZh, titleEn, titleJa, summaryZh, contentZh, category, tags, isFree, price, status, readCount, purchaseCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE titleZh=VALUES(titleZh), status=VALUES(status)`,
        a
      );
    }
    console.log("✅ articles seeded");

    // 7. Seed bounties
    if (member1UserId) {
      await conn.execute(
      `INSERT INTO bounties (userId, titleZh, titleEn, descriptionZh, amount, currency, status, category) VALUES
         (?, '请分析英伟辽H200与B200的性能差距及市场定位', 'Analysis of Performance Gap Between NVIDIA H200 and B200',
          '希望深度分析H200和B200在AI训练和推理场景下的性能差异，以及两款产品的目标市场和定价策略。',
          500.00, 'USD', 'open', 'market'),
         (?, '台积电2nm工艺节点量产时间表与良率预测', 'TSMC 2nm Process Node Mass Production Timeline',
          '需要对台积电2nm（N2）工艺节点的量产时间表进行深度分析，包括良率爬坡曲线预测和主要客户情况。',
          800.00, 'USD', 'open', 'technical')
         ON DUPLICATE KEY UPDATE titleZh=VALUES(titleZh)`,
        [member1UserId, member1UserId]
      );
      console.log("✅ bounties seeded");
    }
  }
}

// 8. Seed invite codes
// Get admin user id
const [adminRows] = await conn.execute(`SELECT id FROM users WHERE openId='demo-admin-001' LIMIT 1`);
const adminId = adminRows[0]?.id ?? 1;
await conn.execute(`
  INSERT INTO invite_codes (code, createdBy, maxUses, useCount, isActive, note) VALUES
  ('MASTER-ALPHA-2026', ${adminId}, 10, 0, 1, '内测邀请码'),
  ('CHIP-EXPERT-001', ${adminId}, 5, 0, 1, 'Master专属邀请码'),
  ('SEMI-INSIDER-2026', ${adminId}, 20, 0, 1, '行业内部邀请码')
  ON DUPLICATE KEY UPDATE isActive=VALUES(isActive)
`);
console.log("✅ invite_codes seeded");

await conn.end();
console.log("🎉 All seed data inserted successfully!");
