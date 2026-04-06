import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "master"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  isBanned: boolean("isBanned").default(false).notNull(),
  memberLevel: int("memberLevel").default(1).notNull(),
  inviteCodeUsed: varchar("inviteCodeUsed", { length: 32 }),
  preferredLang: mysqlEnum("preferredLang", ["zh", "en", "ja"]).default("zh").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Invite Codes ─────────────────────────────────────────────────────────────
export const inviteCodes = mysqlTable("invite_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  createdBy: int("createdBy").notNull(),
  usedBy: int("usedBy"),
  usedAt: timestamp("usedAt"),
  maxUses: int("maxUses").default(1).notNull(),
  useCount: int("useCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InviteCode = typeof inviteCodes.$inferSelect;

// ─── Master Levels ─────────────────────────────────────────────────────────────
export const masterLevels = mysqlTable("master_levels", {
  level: int("level").primaryKey(),
  title: varchar("title", { length: 64 }).notNull(),
  titleJa: varchar("titleJa", { length: 64 }),
  titleEn: varchar("titleEn", { length: 64 }),
  minArticles: int("minArticles").default(0).notNull(),
  minSubscribers: int("minSubscribers").default(0).notNull(),
  revenueShare: decimal("revenueShare", { precision: 5, scale: 2 }).notNull(),
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearlyPrice", { precision: 10, scale: 2 }).notNull(),
});

// ─── Masters ──────────────────────────────────────────────────────────────────
export const masters = mysqlTable("masters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  alias: varchar("alias", { length: 64 }).notNull().unique(),
  displayName: varchar("displayName", { length: 128 }).notNull(),
  displayNameJa: varchar("displayNameJa", { length: 128 }),
  displayNameEn: varchar("displayNameEn", { length: 128 }),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  bioJa: text("bioJa"),
  bioEn: text("bioEn"),
  expertise: json("expertise").$type<string[]>().default([]),
  level: int("level").default(1).notNull(),
  articleCount: int("articleCount").default(0).notNull(),
  subscriberCount: int("subscriberCount").default(0).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isAiAgent: boolean("isAiAgent").default(false).notNull(),
  agentConfig: json("agentConfig").$type<{
    searchTopics?: string[];
    autoPublish?: boolean;
    publishFrequency?: string;
    targetLang?: string[];
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Master = typeof masters.$inferSelect;
export type InsertMaster = typeof masters.$inferInsert;

// ─── Articles ─────────────────────────────────────────────────────────────────
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(), // MST-IND-2026-0001
  masterId: int("masterId").notNull(),
  category: mysqlEnum("category", ["industry", "technical", "market", "policy", "other"]).notNull(),
  status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "published"]).default("draft").notNull(),
  isFree: boolean("isFree").default(false).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0").notNull(),
  // Chinese content (primary)
  titleZh: text("titleZh").notNull(),
  summaryZh: text("summaryZh"),
  contentZh: text("contentZh"),
  // English content
  titleEn: text("titleEn"),
  summaryEn: text("summaryEn"),
  contentEn: text("contentEn"),
  // Japanese content
  titleJa: text("titleJa"),
  summaryJa: text("summaryJa"),
  contentJa: text("contentJa"),
  tags: json("tags").$type<string[]>().default([]),
  coverImageUrl: text("coverImageUrl"),
  readCount: int("readCount").default(0).notNull(),
  purchaseCount: int("purchaseCount").default(0).notNull(),
  complianceScore: decimal("complianceScore", { precision: 5, scale: 2 }),
  complianceNote: text("complianceNote"),
  adminNote: text("adminNote"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

// ─── Master Subscriptions ─────────────────────────────────────────────────────
export const masterSubscriptions = mysqlTable("master_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  masterId: int("masterId").notNull(),
  plan: mysqlEnum("plan", ["monthly", "yearly"]).notNull(),
  status: mysqlEnum("status", ["active", "cancelled", "expired"]).default("active").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Article Purchases ────────────────────────────────────────────────────────
export const articlePurchases = mysqlTable("article_purchases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  articleId: int("articleId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  status: mysqlEnum("status", ["pending", "completed", "refunded"]).default("completed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Revenue Splits ───────────────────────────────────────────────────────────
export const revenueSplits = mysqlTable("revenue_splits", {
  id: int("id").autoincrement().primaryKey(),
  masterId: int("masterId").notNull(),
  sourceType: mysqlEnum("sourceType", ["article_purchase", "subscription", "bounty"]).notNull(),
  sourceId: int("sourceId").notNull(),
  grossAmount: decimal("grossAmount", { precision: 10, scale: 2 }).notNull(),
  masterShare: decimal("masterShare", { precision: 5, scale: 2 }).notNull(),
  masterAmount: decimal("masterAmount", { precision: 10, scale: 2 }).notNull(),
  platformAmount: decimal("platformAmount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Bounties ─────────────────────────────────────────────────────────────────
export const bounties = mysqlTable("bounties", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  masterId: int("masterId"),
  articleId: int("articleId"),
  titleZh: text("titleZh").notNull(),
  titleEn: text("titleEn"),
  titleJa: text("titleJa"),
  descriptionZh: text("descriptionZh"),
  descriptionEn: text("descriptionEn"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["open", "accepted", "submitted", "completed", "disputed", "cancelled"]).default("open").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  deadline: timestamp("deadline"),
  acceptedAt: timestamp("acceptedAt"),
  submittedAt: timestamp("submittedAt"),
  completedAt: timestamp("completedAt"),
  memberRating: int("memberRating"),
  memberFeedback: text("memberFeedback"),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bounty = typeof bounties.$inferSelect;
export type InsertBounty = typeof bounties.$inferInsert;

// ─── Email Subscribers ────────────────────────────────────────────────────────
export const emailSubscribers = mysqlTable("email_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  masterId: int("masterId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── AI Agent Tasks ───────────────────────────────────────────────────────────
export const agentTasks = mysqlTable("agent_tasks", {
  id: int("id").autoincrement().primaryKey(),
  masterId: int("masterId").notNull(),
  createdBy: int("createdBy").notNull(),
  taskType: mysqlEnum("taskType", ["research", "write", "translate", "compliance"]).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  instruction: text("instruction").notNull(),
  searchTopics: json("searchTopics").$type<string[]>().default([]),
  targetLangs: json("targetLangs").$type<string[]>().default(["zh", "en", "ja"]),
  resultArticleId: int("resultArticleId"),
  rawResearch: text("rawResearch"),
  progressLog: json("progressLog").$type<Array<{ time: string; message: string }>>().default([]),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = typeof agentTasks.$inferInsert;
