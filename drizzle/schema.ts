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
  // 广告配额
  adQuotaPerDay: int("adQuotaPerDay").default(0).notNull(), // 该等级Master替身每日可发广告数，0=不可发广告
  platformAdQuotaPerDay: int("platformAdQuotaPerDay").default(3).notNull(), // 平台替身全局每日广告上限（管理员设置）
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
  // 人物画像（决定替身方向）
  career: text("career"),                                   // 职业背景/工作经历
  hobbies: json("hobbies").$type<string[]>().default([]),   // 兴趣爱好
  skills: json("skills").$type<string[]>().default([]),     // 擅长领域/技能
  background: text("background"),                           // 个人背景故事
  knowledgeTags: json("knowledgeTags").$type<string[]>().default([]), // 知识点标签
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

// ─── Smart Contracts (早期发现者分成 / 收益权记录) ────────────────────────────
export const smartContracts = mysqlTable("smart_contracts", {
  id: int("id").autoincrement().primaryKey(),
  contractType: mysqlEnum("contractType", [
    "early_bird",       // 早期发现者分成：前N个付费读者获得分成
    "revenue_right",    // 收益权交易：Master 出售文章未来收益权
    "bounty_split",     // 悬赏分成：平台/Master/发布者三方分成
  ]).notNull(),
  articleId: int("articleId"),           // 关联文章（可选）
  masterId: int("masterId").notNull(),   // 关联 Master
  userId: int("userId"),                 // 关联用户（购买方）
  // 早期发现者参数
  earlyBirdSlots: int("earlyBirdSlots").default(10),    // 早期发现者名额
  earlyBirdFilled: int("earlyBirdFilled").default(0),   // 已填充名额
  earlyBirdSharePct: int("earlyBirdSharePct").default(5), // 每个早期发现者分成比例 (%)
  // 收益权参数
  revenueSharePct: int("revenueSharePct").default(0),   // 出售的收益权比例 (%)
  salePrice: int("salePrice").default(0),               // 出售价格（分）
  // 状态
  status: mysqlEnum("status", ["active", "fulfilled", "expired", "cancelled"]).default("active").notNull(),
  // 分成记录
  totalPaidOut: int("totalPaidOut").default(0),         // 累计已支付（分）
  // 合约条款（JSON）
  terms: text("terms"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SmartContract = typeof smartContracts.$inferSelect;
export type InsertSmartContract = typeof smartContracts.$inferInsert;

// ─── Content Moderation Log (内容审核日志) ────────────────────────────────────
export const contentModerationLogs = mysqlTable("content_moderation_logs", {
  id: int("id").autoincrement().primaryKey(),
  articleId: int("articleId"),
  bountyId: int("bountyId"),
  contentType: mysqlEnum("contentType", ["article", "bounty", "comment"]).notNull(),
  // 审核结果
  complianceScore: int("complianceScore").default(0),   // 0-100
  passed: boolean("passed").default(false).notNull(),
  // 脱敏结果
  sensitiveWordsFound: json("sensitiveWordsFound").$type<string[]>().default([]),
  redactedContent: text("redactedContent"),             // 脱敏后的内容
  // LLM 审核详情
  issues: json("issues").$type<string[]>().default([]),
  suggestion: text("suggestion"),
  // 审核来源
  triggeredBy: mysqlEnum("triggeredBy", ["auto", "manual", "appeal"]).default("auto").notNull(),
  reviewedBy: int("reviewedBy"),                        // 管理员 ID（人工审核时）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContentModerationLog = typeof contentModerationLogs.$inferSelect;

// ─── AI Master Config (AI Master 多模型配置) ──────────────────────────────────
export const aiMasterConfigs = mysqlTable("ai_master_configs", {
  id: int("id").autoincrement().primaryKey(),
  masterId: int("masterId").notNull().unique(),
  // 模型配置
  modelProvider: mysqlEnum("modelProvider", [
    "builtin",    // Manus 内置 LLM
    "qwen",       // 阿里通义千问
    "glm",        // 智谱 GLM
    "minimax",    // MiniMax
    "openai",     // OpenAI
    "anthropic",  // Anthropic Claude
    "custom",     // 自定义 API
  ]).default("builtin").notNull(),
  apiKey: text("apiKey"),               // 加密存储的 API Key
  apiEndpoint: text("apiEndpoint"),     // 自定义 API 端点
  modelName: text("modelName"),         // 具体模型名称（如 qwen-max）
  // 个性化提示词
  systemPrompt: text("systemPrompt"),   // 系统提示词（定义 AI Master 的人格/专长）
  researchPrompt: text("researchPrompt"), // 研究收集提示词
  writingPrompt: text("writingPrompt"),   // 文章撰写提示词
  // 研究配置
  researchTopics: json("researchTopics").$type<string[]>().default([]),
  targetLanguages: json("targetLanguages").$type<string[]>().default(["zh", "en", "ja"]),
  autoPublish: boolean("autoPublish").default(false).notNull(),
  publishSchedule: varchar("publishSchedule", { length: 50 }),  // cron 表达式
  // 统计
  totalArticlesGenerated: int("totalArticlesGenerated").default(0),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AiMasterConfig = typeof aiMasterConfigs.$inferSelect;
export type InsertAiMasterConfig = typeof aiMasterConfigs.$inferInsert;

// ─── Agent Forum Tables ────────────────────────────────────────────────────────

/** Agent 角色（由管理员创建，每个角色是一个 AI 人格） */
export const agentRoles = mysqlTable("agent_roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),          // 角色名称（如"半导体老兵"）
  alias: varchar("alias", { length: 50 }).notNull().unique(), // URL 别名（如 chip-veteran）
  avatarEmoji: varchar("avatarEmoji", { length: 10 }).default("🤖"), // 头像 emoji（备用）
  avatarColor: varchar("avatarColor", { length: 20 }).default("#4a9d8f"), // 头像背景色（备用）
  avatarUrl: text("avatarUrl"),                                            // JOJO 风格 AI 生成头像 URL
  // 归属配置
  ownerType: mysqlEnum("ownerType", ["platform", "master"]).default("platform").notNull(), // 平台替身 or Master 替身
  ownerId: int("ownerId"),                                                  // Master 替身时指向 masters.id
  // 活动范围配置
  scope: json("scope").$type<string[]>().default(["stand"]),               // 活动板块: stand/master-sub/all
  bio: text("bio"),                                           // 角色简介
  personality: text("personality"),                           // 人格描述（提示词）
  expertise: json("expertise").$type<string[]>().default([]), // 专长领域
  // 模型配置
  modelProvider: mysqlEnum("modelProvider_role", [
    "builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom",
  ]).default("builtin").notNull(),
  apiKey: text("apiKey"),
  apiEndpoint: text("apiEndpoint"),
  modelName: text("modelName"),
  // 发帖配置
  systemPrompt: text("systemPrompt"),  // 个性化提示词
  postTypes: json("postTypes").$type<string[]>().default(["news", "report", "comment"]),
  postFrequency: varchar("postFrequency", { length: 50 }).default("0 9 * * *"), // cron
  // 拟人化标签系统
  personalityTags: json("personalityTags").$type<string[]>().default([]),  // 性格标签（如：犊利、悲观主义、技术乐观派）
  interestTags: json("interestTags").$type<string[]>().default([]),       // 关注点标签（如：台积电、EDA工具、出口管制）
  replyProbability: int("replyProbability").default(70),                   // 对相关话题的回复概率(0-100)
  // Master 替身：情报官配置
  intelligenceSources: json("intelligenceSources").$type<string[]>(), // 自定义情报源 URL 列表
  outputFormats: json("outputFormats").$type<string[]>(),   // 支持输出格式: article/ppt/pdf/chart
  triggerMode: mysqlEnum("triggerMode", ["manual", "scheduled", "keyword"]).default("manual"), // 触发模式
  triggerKeywords: json("triggerKeywords").$type<string[]>(),  // 关键词触发列表
  specialty: text("specialty"),                                             // 专业领域描述（Master 注册时填写）
  // 具象化人格字段
  speakingStyle: text("speakingStyle"),                // 说话风格描述（如：喜欢用数据、爱反问、常引用历史）
  catchphrase: varchar("catchphrase", { length: 200 }), // 口头禅/标志性用语
  backgroundStory: text("backgroundStory"),            // 背景故事（从哪里来、经历了什么）
  workFocus: text("workFocus"),                         // 当前工作重心/关注方向
  viewpoints: json('viewpoints').$type<string[]>().default([]),
  adCopy: text('adCopy'),                                   // 广告文案（≤140字）
  // 广告触发配置
  adTriggerCron: varchar("adTriggerCron", { length: 100 }),  // 定时触发 cron 表达式
  adTriggerKeywords: json("adTriggerKeywords").$type<string[]>().default([]), // 话题关键词触发
  adDailyLimit: int("adDailyLimit").default(0),              // 每日广告上限（0=跟随等级默认值）
  adTodayCount: int("adTodayCount").default(0),              // 今日已发广告数
  adLastResetDate: varchar("adLastResetDate", { length: 10 }), // 最后重置日期 YYYY-MM-DD
  isActive: boolean("isActive").default(true).notNull(),
  // 封禁状态
  isBanned: boolean("isBanned").default(false).notNull(),
  bannedReason: text("bannedReason"),                         // 封禁原因
  bannedAt: timestamp("bannedAt"),                            // 封禁时间
  // 创建者类型（决定替身权限和来源）
  creatorType: mysqlEnum("creatorType", ["admin", "master", "user"]).default("admin").notNull(),
  ownerUserId: int("ownerUserId"),                            // 普通用户创建时指向 users.id
  // 每日发帖上限
  dailyPostLimit: int("dailyPostLimit").default(10),          // 每天最多发帖数（0=不限）
  // 统计
  totalPosts: int("totalPosts").default(0),
  lastPostedAt: timestamp("lastPostedAt"),
  createdBy: int("createdBy").notNull(),                      // 创建者 userId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentRole = typeof agentRoles.$inferSelect;
export type InsertAgentRole = typeof agentRoles.$inferInsert;

/** 替身情报订阅（用户订阅某个替身的定期情报推送） */
export const standSubscriptions = mysqlTable("stand_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  agentRoleId: int("agentRoleId").notNull(),          // 订阅的替身 ID
  email: varchar("email", { length: 255 }).notNull(), // 接收推送的邮筱
  keywords: json("keywords").$type<string[]>(),       // 用户关注的关键词（空则全推）
  frequency: mysqlEnum("frequency", ["daily", "weekly", "realtime"]).default("daily").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastSentAt: timestamp("lastSentAt"),                // 最后发送时间
  userId: int("userId"),                              // 登录用户的 userId（可为空，支持匹名订阅）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StandSubscription = typeof standSubscriptions.$inferSelect;
export type InsertStandSubscription = typeof standSubscriptions.$inferInsert;

/** Agent 帖子（论坛帖子，类似推特/论坛混合） */
export const agentPosts = mysqlTable("agent_posts", {
  id: int("id").autoincrement().primaryKey(),
  agentRoleId: int("agentRoleId").notNull(),                  // 发帖 Agent
  postType: mysqlEnum("postType", [
    "news",       // 新闻速递
    "report",     // 深度报告
    "flash",      // 短消息（推特风格）
    "discussion", // 讨论/观点
    "analysis",   // 数据分析
  ]).default("flash").notNull(),
  title: varchar("title", { length: 300 }),                   // 标题（可选，flash 类型无标题）
  content: text("content").notNull(),                         // 正文（Markdown）
  contentEn: text("contentEn"),                               // 英文版本
  contentJa: text("contentJa"),                               // 日文版本
  summary: varchar("summary", { length: 500 }),               // 摘要
  tags: json("tags").$type<string[]>().default([]),           // 标签
  sourceUrl: varchar("sourceUrl", { length: 500 }),           // 来源 URL
  imageUrls: json("imageUrls").$type<string[]>().default([]),   // 图片 URL 列表（S3）
  // 互动统计
  likeCount: int("likeCount").default(0),
  commentCount: int("commentCount").default(0),
  repostCount: int("repostCount").default(0),
  // 状态
  status: mysqlEnum("postStatus", ["published", "draft", "hidden"]).default("published").notNull(),
  isPinned: boolean("isPinned").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentPost = typeof agentPosts.$inferSelect;
export type InsertAgentPost = typeof agentPosts.$inferInsert;

/** Agent 评论（Agent 之间互相评论，也支持用户评论） */
export const agentComments = mysqlTable("agent_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),                            // 所属帖子
  parentId: int("parentId"),                                  // 父评论 id（回复）
  // 评论者（Agent 或真实用户，二选一）
  agentRoleId: int("agentRoleId"),                            // Agent 评论者
  userId: int("userId"),                                      // 真实用户评论者
  content: text("content").notNull(),
  likeCount: int("likeCount").default(0),
  status: mysqlEnum("commentStatus", ["visible", "hidden"]).default("visible").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AgentComment = typeof agentComments.$inferSelect;
export type InsertAgentComment = typeof agentComments.$inferInsert;

/** Agent 任务日志 */
export const agentTaskLogs = mysqlTable("agent_task_logs", {
  id: int("id").autoincrement().primaryKey(),
  agentRoleId: int("agentRoleId").notNull(),
  taskType: mysqlEnum("taskType_log", ["post", "comment", "reply"]).default("post").notNull(),
  status: mysqlEnum("taskStatus_log", ["pending", "running", "success", "failed"]).default("pending").notNull(),
  prompt: text("prompt"),
  result: text("result"),
  errorMsg: text("errorMsg"),
  triggeredBy: mysqlEnum("triggeredBy", ["manual", "schedule"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type AgentTaskLog = typeof agentTaskLogs.$inferSelect;

// ─── 账户余额系统 ──────────────────────────────────────────────────────────────

/** 用户钱包（每个用户一个，Master 和普通会员都有） */
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),                   // 关联用户
  balance: int("balance").default(0).notNull(),               // 余额（单位：分，避免浮点误差）
  frozenBalance: int("frozenBalance").default(0).notNull(),   // 冻结余额（待处理交易）
  totalCharged: int("totalCharged").default(0).notNull(),     // 累计充值
  totalSpent: int("totalSpent").default(0).notNull(),         // 累计消费
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Wallet = typeof wallets.$inferSelect;

/** 钱包交易记录 */
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("txType", [
    "recharge",     // 充值
    "spend",        // 消费（订阅/悬赏/文章购买）
    "refund",       // 退款
    "coupon",       // 优惠券抵扣
    "admin_grant",  // 管理员赠送
    "admin_deduct", // 管理员扣款
  ]).notNull(),
  amount: int("amount").notNull(),                            // 金额（分），正数=入账，负数=出账
  balanceBefore: int("balanceBefore").notNull(),              // 交易前余额
  balanceAfter: int("balanceAfter").notNull(),                // 交易后余额
  description: varchar("description", { length: 200 }),      // 交易说明
  relatedId: varchar("relatedId", { length: 100 }),          // 关联业务 ID（订单号等）
  couponId: int("couponId"),                                  // 使用的优惠券 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WalletTransaction = typeof walletTransactions.$inferSelect;

/** 优惠券 */
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),   // 优惠券码
  type: mysqlEnum("couponType", [
    "fixed",      // 固定金额（单位：分）
    "percent",    // 百分比折扣
  ]).notNull(),
  value: int("value").notNull(),                              // 面值（分）或折扣百分比（0-100）
  minSpend: int("minSpend").default(0).notNull(),             // 最低消费门槛（分）
  maxDiscount: int("maxDiscount"),                            // 最大折扣金额（分，percent 类型限制）
  totalCount: int("totalCount"),                              // 总发行量（null=无限）
  usedCount: int("usedCount").default(0).notNull(),           // 已使用数量
  perUserLimit: int("perUserLimit").default(1).notNull(),     // 每人限用次数
  targetUserId: int("targetUserId"),                          // 指定用户（null=通用）
  description: varchar("description", { length: 200 }),      // 优惠券说明
  expiresAt: timestamp("expiresAt"),                          // 过期时间（null=永不过期）
  isActive: boolean("isActive").default(true).notNull(),      // 是否启用
  createdBy: int("createdBy").notNull(),                      // 创建者（管理员 userId）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Coupon = typeof coupons.$inferSelect;

/** 平台替身文档（PDF/Excel 上传，用于生成推广帖） */
export const standDocuments = mysqlTable("stand_documents", {
  id: int("id").autoincrement().primaryKey(),
  agentRoleId: int("agentRoleId").notNull(),          // 关联的替身 ID
  fileName: varchar("fileName", { length: 255 }).notNull(), // 原始文件名
  fileKey: varchar("fileKey", { length: 500 }).notNull(),   // S3 存储 key
  fileUrl: text("fileUrl").notNull(),                       // S3 访问 URL
  fileType: mysqlEnum("fileType", ["pdf", "excel", "csv"]).notNull(),
  fileSize: int("fileSize").default(0),                     // 文件大小（字节）
  // 解析结果
  extractedText: text("extractedText"),                     // 提取的文本内容
  partNumbers: json("partNumbers").$type<string[]>().default([]), // 提取的料号列表
  keyInfo: text("keyInfo"),                                 // LLM 提取的关键信息摘要
  // 发帖配置
  autoPost: boolean("autoPost").default(true).notNull(),    // 是否自动生成推广帖
  postCount: int("postCount").default(0).notNull(),         // 已生成的推广帖数量
  lastPostedAt: timestamp("lastPostedAt"),                  // 最后发帖时间
  // 状态
  status: mysqlEnum("docStatus", ["pending", "processing", "ready", "failed"]).default("pending").notNull(),
  errorMsg: text("errorMsg"),
  uploadedBy: int("uploadedBy").notNull(),                  // 上传者 userId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StandDocument = typeof standDocuments.$inferSelect;
export type InsertStandDocument = typeof standDocuments.$inferInsert;

/** 优惠券使用记录 */
export const couponUsages = mysqlTable("coupon_usages", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(),
  userId: int("userId").notNull(),
  transactionId: int("transactionId"),                        // 关联的交易记录
  discountAmount: int("discountAmount").notNull(),            // 实际折扣金额（分）
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});
export type CouponUsage = typeof couponUsages.$inferSelect;
