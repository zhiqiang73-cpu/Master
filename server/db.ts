import { and, desc, eq, like, or, sql, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agentTasks,
  articlePurchases,
  articles,
  bounties,
  emailSubscribers,
  inviteCodes,
  masterLevels,
  masterSubscriptions,
  masters,
  revenueSplits,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createEmailUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  inviteCodeUsed?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    role: "user",
    inviteCodeUsed: data.inviteCodeUsed,
  });
  return getUserByEmail(data.email);
}

export async function listUsers(opts: { search?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const offset = (page - 1) * limit;

  const where = opts.search
    ? or(
        like(users.name, `%${opts.search}%`),
        like(users.email, `%${opts.search}%`)
      )
    : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);
  return { users: rows, total: countResult[0]?.total ?? 0 };
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "master") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function banUser(userId: number, isBanned: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isBanned }).where(eq(users.id, userId));
}

// ─── Invite Codes ─────────────────────────────────────────────────────────────

export async function getInviteCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
  return result[0];
}

export async function useInviteCode(code: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(inviteCodes)
    .set({ usedBy: userId, usedAt: new Date(), useCount: sql`${inviteCodes.useCount} + 1` })
    .where(eq(inviteCodes.code, code));
}

export async function listInviteCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
}

export async function createInviteCode(data: {
  code: string;
  createdBy: number;
  maxUses?: number;
  note?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(inviteCodes).values({
    code: data.code,
    createdBy: data.createdBy,
    maxUses: data.maxUses ?? 1,
    note: data.note,
  });
}

// ─── Masters ──────────────────────────────────────────────────────────────────

export async function listMasters(opts?: { limit?: number; onlyActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const where = opts?.onlyActive ? eq(masters.isActive, true) : undefined;
  return db.select().from(masters).where(where).orderBy(desc(masters.subscriberCount)).limit(opts?.limit ?? 50);
}

export async function getMasterByAlias(alias: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(masters).where(eq(masters.alias, alias)).limit(1);
  return result[0];
}

export async function getMasterByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(masters).where(eq(masters.userId, userId)).limit(1);
  return result[0];
}

export async function getMasterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(masters).where(eq(masters.id, id)).limit(1);
  return result[0];
}

export async function updateMaster(id: number, data: Partial<typeof masters.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(masters).set(data).where(eq(masters.id, id));
}

// ─── Master Levels ────────────────────────────────────────────────────────────

export async function listMasterLevels() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(masterLevels).orderBy(masterLevels.level);
}

export async function getMasterLevel(level: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(masterLevels).where(eq(masterLevels.level, level)).limit(1);
  return result[0];
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export async function listArticles(opts?: {
  masterId?: number;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return { articles: [], total: 0 };
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (opts?.masterId) conditions.push(eq(articles.masterId, opts.masterId));
  if (opts?.category) conditions.push(eq(articles.category, opts.category as any));
  if (opts?.status) conditions.push(eq(articles.status, opts.status as any));
  if (opts?.search) {
    conditions.push(
      or(
        like(articles.titleZh, `%${opts.search}%`),
        like(articles.titleEn, `%${opts.search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, countResult] = await Promise.all([
    db.select().from(articles).where(where).orderBy(desc(articles.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(articles).where(where),
  ]);
  return { articles: rows, total: countResult[0]?.total ?? 0 };
}

export async function getArticleByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.code, code)).limit(1);
  return result[0];
}

export async function getArticleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  return result[0];
}

export async function createArticle(data: typeof articles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(articles).values(data);
  return getArticleByCode(data.code);
}

export async function updateArticle(id: number, data: Partial<typeof articles.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set(data).where(eq(articles.id, id));
}

export async function incrementReadCount(articleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(articles).set({ readCount: sql`${articles.readCount} + 1` }).where(eq(articles.id, articleId));
}

export async function generateArticleCode(category: "industry" | "technical" | "market" | "policy" | "other") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const prefix = { industry: "IND", technical: "TECH", market: "MKT", policy: "POL", other: "OTH" }[category];
  const year = new Date().getFullYear();
  const result = await db
    .select({ total: count() })
    .from(articles)
    .where(like(articles.code, `MST-${prefix}-${year}-%`));
  const seq = (result[0]?.total ?? 0) + 1;
  return `MST-${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

// ─── Article Purchases ────────────────────────────────────────────────────────

export async function hasUserPurchasedArticle(userId: number, articleId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: articlePurchases.id })
    .from(articlePurchases)
    .where(and(eq(articlePurchases.userId, userId), eq(articlePurchases.articleId, articleId)))
    .limit(1);
  return result.length > 0;
}

export async function createArticlePurchase(data: typeof articlePurchases.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(articlePurchases).values(data);
  await db.update(articles).set({ purchaseCount: sql`${articles.purchaseCount} + 1` }).where(eq(articles.id, data.articleId));
}

export async function getUserPurchases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articlePurchases).where(eq(articlePurchases.userId, userId)).orderBy(desc(articlePurchases.createdAt));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(masterSubscriptions)
    .where(and(eq(masterSubscriptions.userId, userId), eq(masterSubscriptions.status, "active")));
}

export async function hasActiveSubscription(userId: number, masterId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: masterSubscriptions.id })
    .from(masterSubscriptions)
    .where(
      and(
        eq(masterSubscriptions.userId, userId),
        eq(masterSubscriptions.masterId, masterId),
        eq(masterSubscriptions.status, "active")
      )
    )
    .limit(1);
  return result.length > 0;
}

export async function createSubscription(data: typeof masterSubscriptions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(masterSubscriptions).values(data);
  await db.update(masters).set({ subscriberCount: sql`${masters.subscriberCount} + 1` }).where(eq(masters.id, data.masterId));
}

export async function cancelSubscription(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(masterSubscriptions).set({ status: "cancelled" }).where(eq(masterSubscriptions.id, id));
}

// ─── Bounties ─────────────────────────────────────────────────────────────────

export async function listBounties(opts?: { status?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { bounties: [], total: 0 };
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 20;
  const offset = (page - 1) * limit;
  const where = opts?.status ? eq(bounties.status, opts.status as any) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(bounties).where(where).orderBy(desc(bounties.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(bounties).where(where),
  ]);
  return { bounties: rows, total: countResult[0]?.total ?? 0 };
}

export async function getBountyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
  return result[0];
}

export async function createBounty(data: typeof bounties.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(bounties).values(data);
}

export async function updateBounty(id: number, data: Partial<typeof bounties.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(bounties).set(data).where(eq(bounties.id, id));
}

// ─── Revenue Splits ───────────────────────────────────────────────────────────

export async function createRevenueSplit(data: typeof revenueSplits.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(revenueSplits).values(data);
  await db
    .update(masters)
    .set({ totalRevenue: sql`${masters.totalRevenue} + ${data.masterAmount}` })
    .where(eq(masters.id, data.masterId));
}

export async function getMasterRevenue(masterId: number) {
  const db = await getDb();
  if (!db) return { total: 0, splits: [] };
  const [splits, totalResult] = await Promise.all([
    db.select().from(revenueSplits).where(eq(revenueSplits.masterId, masterId)).orderBy(desc(revenueSplits.createdAt)).limit(50),
    db.select({ total: sum(revenueSplits.masterAmount) }).from(revenueSplits).where(eq(revenueSplits.masterId, masterId)),
  ]);
  return { total: Number(totalResult[0]?.total ?? 0), splits };
}

// ─── Email Subscribers ────────────────────────────────────────────────────────

export async function addEmailSubscriber(email: string, masterId?: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(emailSubscribers)
    .values({ email, masterId })
    .onDuplicateKeyUpdate({ set: { isActive: true } });
}

// ─── Agent Tasks ──────────────────────────────────────────────────────────────

export async function createAgentTask(data: typeof agentTasks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(agentTasks).values(data);
  const result = await db
    .select()
    .from(agentTasks)
    .where(and(eq(agentTasks.masterId, data.masterId), eq(agentTasks.status, "pending")))
    .orderBy(desc(agentTasks.createdAt))
    .limit(1);
  return result[0];
}

export async function getAgentTask(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agentTasks).where(eq(agentTasks.id, id)).limit(1);
  return result[0];
}

export async function updateAgentTask(id: number, data: Partial<typeof agentTasks.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(agentTasks).set(data).where(eq(agentTasks.id, id));
}

export async function listAgentTasks(opts?: { masterId?: number; status?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.masterId) conditions.push(eq(agentTasks.masterId, opts.masterId));
  if (opts?.status) conditions.push(eq(agentTasks.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(agentTasks).where(where).orderBy(desc(agentTasks.createdAt)).limit(opts?.limit ?? 50);
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const [
    userCount,
    masterCount,
    articleCount,
    bountyCount,
    revenueResult,
    pendingArticles,
    openBounties,
  ] = await Promise.all([
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(masters),
    db.select({ total: count() }).from(articles).where(eq(articles.status, "published")),
    db.select({ total: count() }).from(bounties),
    db.select({ total: sum(revenueSplits.grossAmount) }).from(revenueSplits),
    db.select({ total: count() }).from(articles).where(eq(articles.status, "pending")),
    db.select({ total: count() }).from(bounties).where(eq(bounties.status, "open")),
  ]);

  return {
    totalUsers: userCount[0]?.total ?? 0,
    totalMasters: masterCount[0]?.total ?? 0,
    totalArticles: articleCount[0]?.total ?? 0,
    totalBounties: bountyCount[0]?.total ?? 0,
    totalRevenue: Number(revenueResult[0]?.total ?? 0),
    pendingArticles: pendingArticles[0]?.total ?? 0,
    openBounties: openBounties[0]?.total ?? 0,
  };
}

export async function getRevenueByMonth() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT 
      DATE_FORMAT(createdAt, '%Y-%m') as month,
      SUM(grossAmount) as gross,
      SUM(masterAmount) as masterPayout,
      SUM(platformAmount) as platformRevenue
    FROM revenue_splits
    WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY month
    ORDER BY month ASC
  `);
  return (result[0] as unknown) as Array<{ month: string; gross: string; masterPayout: string; platformRevenue: string }>;
}
