import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addEmailSubscriber,
  banUser,
  createAgentTask,
  createArticle,
  createArticlePurchase,
  createBounty,
  createEmailUser,
  createInviteCode,
  createRevenueSplit,
  createSubscription,
  cancelSubscription,
  generateArticleCode,
  getAdminStats,
  getAgentTask,
  getArticleByCode,
  getArticleById,
  getBountyById,
  getInviteCode,
  getMasterByAlias,
  getMasterById,
  getMasterByUserId,
  getMasterLevel,
  getMasterRevenue,
  getRevenueByMonth,
  getUserByEmail,
  getUserById,
  getUserPurchases,
  getUserSubscriptions,
  hasActiveSubscription,
  hasUserPurchasedArticle,
  listAgentTasks,
  listArticles,
  listBounties,
  listInviteCodes,
  listMasterLevels,
  listMasters,
  listUsers,
  updateAgentTask,
  updateArticle,
  updateBounty,
  updateMaster,
  updateUserRole,
  useInviteCode,
  getDb,
} from "./db";
import { z } from "zod";
import { nanoid } from "nanoid";
import { masters, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Admin Guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "管理员权限不足" });
  return next({ ctx });
});

// ─── Master Guard ─────────────────────────────────────────────────────────────
const masterProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "master" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要 Master 权限" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(2).max(50),
        inviteCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "该邮箱已注册" });

        // Validate invite code if provided
        if (input.inviteCode) {
          const code = await getInviteCode(input.inviteCode);
          if (!code || !code.isActive || code.useCount >= code.maxUses) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "邀请码无效或已使用" });
          }
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await createEmailUser({
          email: input.email,
          passwordHash,
          name: input.name,
          inviteCodeUsed: input.inviteCode,
        });

        if (input.inviteCode && user) {
          await useInviteCode(input.inviteCode, user.id);
        }

        return { success: true };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });
        }
        if (user.isBanned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "账号已被封禁" });
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "邮箱或密码错误" });

        // Create JWT session
        const { SignJWT } = await import("jose");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const token = await new SignJWT({
          sub: user.openId,
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(secret);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    validateInviteCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const code = await getInviteCode(input.code);
        if (!code || !code.isActive || code.useCount >= code.maxUses) {
          return { valid: false };
        }
        return { valid: true };
      }),
  }),

  // ─── Masters ──────────────────────────────────────────────────────────────
  masters: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const masterList = await listMasters({ limit: input?.limit, onlyActive: true });
        const levels = await listMasterLevels();
        return masterList.map(m => ({
          ...m,
          levelInfo: levels.find(l => l.level === m.level),
        }));
      }),

    byAlias: publicProcedure
      .input(z.object({ alias: z.string() }))
      .query(async ({ input }) => {
        const master = await getMasterByAlias(input.alias);
        if (!master) throw new TRPCError({ code: "NOT_FOUND" });
        const levelInfo = await getMasterLevel(master.level);
        const { articles: masterArticles } = await listArticles({
          masterId: master.id,
          status: "published",
          limit: 10,
        });
        return { ...master, levelInfo, articles: masterArticles };
      }),

    levels: publicProcedure.query(() => listMasterLevels()),

    myProfile: masterProcedure.query(async ({ ctx }) => {
      const master = await getMasterByUserId(ctx.user.id);
      if (!master) throw new TRPCError({ code: "NOT_FOUND", message: "Master 档案不存在" });
      const levelInfo = await getMasterLevel(master.level);
      const revenue = await getMasterRevenue(master.id);
      return { ...master, levelInfo, revenue };
    }),

    updateProfile: masterProcedure
      .input(z.object({
        displayName: z.string().optional(),
        bio: z.string().optional(),
        bioEn: z.string().optional(),
        bioJa: z.string().optional(),
        expertise: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "NOT_FOUND" });
        await updateMaster(master.id, input);
        return { success: true };
      }),
  }),

  // ─── Articles ─────────────────────────────────────────────────────────────
  articles: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        masterId: z.number().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const result = await listArticles({
          ...input,
          status: "published",
        });
        // Strip content for list view
        return {
          ...result,
          articles: result.articles.map(a => ({ ...a, contentZh: undefined, contentEn: undefined, contentJa: undefined })),
        };
      }),

    byCode: publicProcedure
      .input(z.object({ code: z.string(), lang: z.enum(["zh", "en", "ja"]).default("zh") }))
      .query(async ({ input, ctx }) => {
        const article = await getArticleByCode(input.code);
        if (!article || article.status !== "published") throw new TRPCError({ code: "NOT_FOUND" });

        // Increment read count
        await import("./db").then(db => db.incrementReadCount(article.id));

        // Check access
        let hasAccess = article.isFree;
        if (!hasAccess && ctx.user) {
          const [purchased, subscribed] = await Promise.all([
            hasUserPurchasedArticle(ctx.user.id, article.id),
            hasActiveSubscription(ctx.user.id, article.masterId),
          ]);
          hasAccess = purchased || subscribed;
        }

        if (!hasAccess) {
          // Return preview only (first ~200 chars of content)
          const preview = article.contentZh?.slice(0, 500) ?? "";
          return { ...article, contentZh: preview, contentEn: null, contentJa: null, hasAccess: false };
        }

        return { ...article, hasAccess: true };
      }),

    // Master: create draft
    create: masterProcedure
      .input(z.object({
        category: z.enum(["industry", "technical", "market", "policy", "other"]),
        titleZh: z.string().min(5),
        summaryZh: z.string().optional(),
        contentZh: z.string().optional(),
        price: z.number().min(0).default(0),
        isFree: z.boolean().default(false),
        tags: z.array(z.string()).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "NOT_FOUND", message: "Master 档案不存在" });

        const code = await generateArticleCode(input.category);
        const article = await createArticle({
          ...input,
          code,
          masterId: master.id,
          price: String(input.price),
          status: "draft",
        });
        return article;
      }),

    // Master: update draft
    update: masterProcedure
      .input(z.object({
        id: z.number(),
        titleZh: z.string().optional(),
        summaryZh: z.string().optional(),
        contentZh: z.string().optional(),
        titleEn: z.string().optional(),
        contentEn: z.string().optional(),
        titleJa: z.string().optional(),
        contentJa: z.string().optional(),
        price: z.number().optional(),
        isFree: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master || article.masterId !== master.id) throw new TRPCError({ code: "FORBIDDEN" });

        const { id, price, ...rest } = input;
        await updateArticle(id, {
          ...rest,
          ...(price !== undefined ? { price: String(price) } : {}),
        });
        return { success: true };
      }),

    // Master: submit for review
    submitForReview: masterProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.id);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master || article.masterId !== master.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (article.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "只有草稿可以提交审核" });

        await updateArticle(input.id, { status: "pending" });
        return { success: true };
      }),

    // Master: check compliance
    checkCompliance: masterProcedure
      .input(z.object({ content: z.string() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是一个半导体行业内容合规检测专家。请检查以下文章内容是否符合平台规范：
1. 不包含公司内部未公开信息、NDA保护内容、客户/订单数据
2. 不包含虚假信息或无根据的市场预测
3. 基于公开信息的分析，个人行业判断，技术科普，方法论分享
请以JSON格式返回：{ "score": 0-100, "passed": true/false, "issues": ["issue1", "issue2"], "suggestion": "改进建议" }`,
            },
            { role: "user", content: input.content },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "compliance_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  score: { type: "number" },
                  passed: { type: "boolean" },
                  issues: { type: "array", items: { type: "string" } },
                  suggestion: { type: "string" },
                },
                required: ["score", "passed", "issues", "suggestion"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content as string | null;
        return JSON.parse(content ?? "{}");
      }),

    // Master: list my articles
    myArticles: masterProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
      .query(async ({ ctx, input }) => {
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) return { articles: [], total: 0 };
        return listArticles({ masterId: master.id, page: input?.page, limit: input?.limit });
      }),
  }),

  // ─── Bounties ─────────────────────────────────────────────────────────────
  bounties: router({
    list: publicProcedure
      .input(z.object({
        status: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }).optional())
      .query(async ({ input }) => {
        return listBounties(input);
      }),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const bounty = await getBountyById(input.id);
        if (!bounty) throw new TRPCError({ code: "NOT_FOUND" });
        return bounty;
      }),

    create: protectedProcedure
      .input(z.object({
        titleZh: z.string().min(10),
        descriptionZh: z.string().optional(),
        amount: z.number().min(10),
        deadline: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createBounty({
          ...input,
          userId: ctx.user.id,
          amount: String(input.amount),
          status: "open",
        });
        return { success: true };
      }),

    // Master: accept bounty
    accept: masterProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const bounty = await getBountyById(input.id);
        if (!bounty) throw new TRPCError({ code: "NOT_FOUND" });
        if (bounty.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "该悬赏已被接单" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "NOT_FOUND" });
        await updateBounty(input.id, { masterId: master.id, status: "accepted", acceptedAt: new Date() });
        return { success: true };
      }),

    // Master: submit answer
    submit: masterProcedure
      .input(z.object({ id: z.number(), articleId: z.number() }))
      .mutation(async ({ input }) => {
        const bounty = await getBountyById(input.id);
        if (!bounty || bounty.status !== "accepted") throw new TRPCError({ code: "BAD_REQUEST" });
        await updateBounty(input.id, { articleId: input.articleId, status: "submitted", submittedAt: new Date() });
        return { success: true };
      }),

    // Member: complete bounty
    complete: protectedProcedure
      .input(z.object({ id: z.number(), rating: z.number().min(1).max(5), feedback: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const bounty = await getBountyById(input.id);
        if (!bounty) throw new TRPCError({ code: "NOT_FOUND" });
        if (bounty.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (bounty.status !== "submitted") throw new TRPCError({ code: "BAD_REQUEST" });
        await updateBounty(input.id, {
          status: "completed",
          completedAt: new Date(),
          memberRating: input.rating,
          memberFeedback: input.feedback,
        });
        return { success: true };
      }),

    // Member: dispute
    dispute: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const bounty = await getBountyById(input.id);
        if (!bounty || bounty.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (bounty.status !== "submitted") throw new TRPCError({ code: "BAD_REQUEST" });
        await updateBounty(input.id, { status: "disputed", adminNote: input.reason });
        return { success: true };
      }),
  }),

  // ─── Subscriptions & Purchases ────────────────────────────────────────────
  payments: router({
    mySubscriptions: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubscriptions(ctx.user.id);
    }),

    myPurchases: protectedProcedure.query(async ({ ctx }) => {
      return getUserPurchases(ctx.user.id);
    }),

    // Simulate purchase (Stripe integration placeholder)
    purchaseArticle: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND" });
        if (article.isFree) throw new TRPCError({ code: "BAD_REQUEST", message: "免费文章无需购买" });

        const alreadyPurchased = await hasUserPurchasedArticle(ctx.user.id, input.articleId);
        if (alreadyPurchased) throw new TRPCError({ code: "CONFLICT", message: "已购买该文章" });

        await createArticlePurchase({
          userId: ctx.user.id,
          articleId: input.articleId,
          amount: article.price,
          status: "completed",
        });

        // Revenue split
        const master = await getMasterById(article.masterId);
        if (master) {
          const levelInfo = await getMasterLevel(master.level);
          const shareRate = Number(levelInfo?.revenueShare ?? 70) / 100;
          const gross = Number(article.price);
          await createRevenueSplit({
            masterId: master.id,
            sourceType: "article_purchase",
            sourceId: input.articleId,
            grossAmount: String(gross),
            masterShare: String(shareRate * 100),
            masterAmount: String((gross * shareRate).toFixed(2)),
            platformAmount: String((gross * (1 - shareRate)).toFixed(2)),
          });
        }

        return { success: true };
      }),

    subscribeMaster: protectedProcedure
      .input(z.object({ masterId: z.number(), plan: z.enum(["monthly", "yearly"]) }))
      .mutation(async ({ ctx, input }) => {
        const already = await hasActiveSubscription(ctx.user.id, input.masterId);
        if (already) throw new TRPCError({ code: "CONFLICT", message: "已订阅该 Master" });

        const master = await getMasterById(input.masterId);
        if (!master) throw new TRPCError({ code: "NOT_FOUND" });
        const levelInfo = await getMasterLevel(master.level);

        const amount = input.plan === "monthly"
          ? Number(levelInfo?.monthlyPrice ?? 9.9)
          : Number(levelInfo?.yearlyPrice ?? 99);

        const now = new Date();
        const periodEnd = new Date(now);
        if (input.plan === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
        else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

        await createSubscription({
          userId: ctx.user.id,
          masterId: input.masterId,
          plan: input.plan,
          amount: String(amount),
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          status: "active",
        });

        return { success: true };
      }),

    cancelSubscription: protectedProcedure
      .input(z.object({ subscriptionId: z.number() }))
      .mutation(async ({ input }) => {
        await cancelSubscription(input.subscriptionId);
        return { success: true };
      }),
  }),

  // ─── Email Subscribers ────────────────────────────────────────────────────
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email(), masterId: z.number().optional() }))
      .mutation(async ({ input }) => {
        await addEmailSubscriber(input.email, input.masterId);
        return { success: true };
      }),
  }),

  // ─── Admin ────────────────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(() => getAdminStats()),

    revenueChart: adminProcedure.query(() => getRevenueByMonth()),

    // Users
    listUsers: adminProcedure
      .input(z.object({ search: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }).optional())
      .query(async ({ input }) => listUsers(input ?? {})),

    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "master"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        // If promoting to master, create master record
        if (input.role === "master") {
          const db = await getDb();
          if (db) {
            const user = await getUserById(input.userId);
            if (user) {
              const existing = await getMasterByUserId(input.userId);
              if (!existing) {
                const alias = `master_${nanoid(8)}`;
                await db.insert(masters).values({
                  userId: input.userId,
                  alias,
                  displayName: user.name ?? alias,
                  level: 1,
                });
              }
            }
          }
        }
        return { success: true };
      }),

    banUser: adminProcedure
      .input(z.object({ userId: z.number(), isBanned: z.boolean() }))
      .mutation(async ({ input }) => {
        await banUser(input.userId, input.isBanned);
        return { success: true };
      }),

    // Articles
    listPendingArticles: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
      .query(async ({ input }) => listArticles({ status: "pending", page: input?.page, limit: input?.limit })),

    listAllArticles: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20), status: z.string().optional() }).optional())
      .query(async ({ input }) => listArticles({ page: input?.page, limit: input?.limit, status: input?.status })),

    approveArticle: adminProcedure
      .input(z.object({ id: z.number(), note: z.string().optional() }))
      .mutation(async ({ input }) => {
        await updateArticle(input.id, {
          status: "published",
          publishedAt: new Date(),
          adminNote: input.note,
        });
        // Update master article count
        const article = await getArticleById(input.id);
        if (article) {
          await updateMaster(article.masterId, {
            articleCount: (await getMasterById(article.masterId))?.articleCount ?? 0 + 1,
          });
        }
        return { success: true };
      }),

    rejectArticle: adminProcedure
      .input(z.object({ id: z.number(), note: z.string() }))
      .mutation(async ({ input }) => {
        await updateArticle(input.id, { status: "rejected", adminNote: input.note });
        return { success: true };
      }),

    // Bounties
    listAllBounties: adminProcedure
      .input(z.object({ status: z.string().optional(), page: z.number().default(1) }).optional())
      .query(async ({ input }) => listBounties(input)),

    resolveBountyDispute: adminProcedure
      .input(z.object({ id: z.number(), resolution: z.enum(["complete", "cancel"]), note: z.string() }))
      .mutation(async ({ input }) => {
        const status = input.resolution === "complete" ? "completed" : "cancelled";
        await updateBounty(input.id, {
          status,
          adminNote: input.note,
          ...(input.resolution === "complete" ? { completedAt: new Date() } : {}),
        });
        return { success: true };
      }),

    // Invite codes
    listInviteCodes: adminProcedure.query(() => listInviteCodes()),

    createInviteCode: adminProcedure
      .input(z.object({ count: z.number().min(1).max(50).default(1), maxUses: z.number().default(1), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const codes: string[] = [];
        for (let i = 0; i < input.count; i++) {
          const code = `MASTER-${nanoid(8).toUpperCase()}`;
          await createInviteCode({ code, createdBy: ctx.user.id, maxUses: input.maxUses, note: input.note });
          codes.push(code);
        }
        return { codes };
      }),

    // Masters management
    listMasters: adminProcedure.query(() => listMasters()),

    verifyMaster: adminProcedure
      .input(z.object({ masterId: z.number(), isVerified: z.boolean() }))
      .mutation(async ({ input }) => {
        await updateMaster(input.masterId, { isVerified: input.isVerified });
        return { success: true };
      }),

    createAiMaster: adminProcedure
      .input(z.object({
        alias: z.string(),
        displayName: z.string(),
        bio: z.string().optional(),
        expertise: z.array(z.string()).default([]),
        searchTopics: z.array(z.string()).default([]),
        autoPublish: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Create a system user for the AI agent
        const openId = `ai_agent_${nanoid(12)}`;
        await db.insert(users).values({
          openId,
          name: input.displayName,
          loginMethod: "system",
          role: "master",
        });
        const agentUser = await import("./db").then(m => m.getUserByEmail("")).then(() =>
          db.select().from(users).where(eq(users.openId, openId)).limit(1).then(r => r[0])
        );
        if (!agentUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.insert(masters).values({
          userId: agentUser.id,
          alias: input.alias,
          displayName: input.displayName,
          bio: input.bio,
          expertise: input.expertise,
          isAiAgent: true,
          isVerified: true,
          agentConfig: {
            searchTopics: input.searchTopics,
            autoPublish: input.autoPublish,
            targetLang: ["zh", "en", "ja"],
          },
        });

        return { success: true, alias: input.alias };
      }),
  }),

  // ─── AI Agent ─────────────────────────────────────────────────────────────
  agent: router({
    listTasks: adminProcedure
      .input(z.object({ masterId: z.number().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => listAgentTasks(input)),

    createTask: adminProcedure
      .input(z.object({
        masterId: z.number(),
        taskType: z.enum(["research", "write", "translate", "compliance"]),
        instruction: z.string().min(10),
        searchTopics: z.array(z.string()).default([]),
        targetLangs: z.array(z.string()).default(["zh", "en", "ja"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const task = await createAgentTask({
          ...input,
          createdBy: ctx.user.id,
          status: "pending",
        });
        return task;
      }),

    runTask: adminProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input }) => {
        const task = await getAgentTask(input.taskId);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        if (task.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "任务已在执行中" });

        // Mark as running
        await updateAgentTask(input.taskId, { status: "running", startedAt: new Date() });

        // Run async (fire and forget)
        runAgentTaskAsync(input.taskId, task).catch(console.error);

        return { success: true, message: "Agent 任务已启动，请稍后查看结果" };
      }),

    getTask: adminProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        const task = await getAgentTask(input.taskId);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        return task;
      }),
  }),

  // ─── Member Dashboard ─────────────────────────────────────────────────────
  member: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const [subscriptions, purchases] = await Promise.all([
        getUserSubscriptions(ctx.user.id),
        getUserPurchases(ctx.user.id),
      ]);
      const { bounties: myBounties } = await listBounties();
      const userBounties = myBounties.filter(b => b.userId === ctx.user.id);
      return {
        user: ctx.user,
        subscriptions,
        purchases,
        bounties: userBounties,
      };
    }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(50).optional(),
        bio: z.string().optional(),
        preferredLang: z.enum(["zh", "en", "ja"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set(input).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
  }),
});

// ─── AI Agent Task Runner ─────────────────────────────────────────────────────
async function runAgentTaskAsync(taskId: number, task: Awaited<ReturnType<typeof getAgentTask>>) {
  if (!task) return;

  const log = (message: string) => {
    const entry = { time: new Date().toISOString(), message };
    updateAgentTask(taskId, {
      progressLog: [...(task.progressLog ?? []), entry],
    });
  };

  try {
    log("🔍 开始收集资料...");

    // Step 1: Research
    const topics = (task.searchTopics as string[]) ?? [];
    const researchPrompt = `你是一个半导体行业专家研究员。请针对以下主题进行深度研究分析：
${topics.join("\n")}

用户指令：${task.instruction}

请提供：
1. 主题背景和当前行业状态
2. 关键技术细节和数据
3. 行业趋势和影响因素
4. 专家观点和市场预期
5. 参考信息来源（公开信息）

请用中文撰写，内容专业、深度、有价值。`;

    const researchResponse = await invokeLLM({
      messages: [
        { role: "system", content: "你是半导体行业顶级分析师，擅长深度研究和洞察分析。" },
        { role: "user", content: researchPrompt },
      ],
    });

    const rawResearch = (researchResponse.choices[0]?.message?.content as string | null) ?? "";
    await updateAgentTask(taskId, { rawResearch });
    log("✅ 资料收集完成，开始撰写文章...");

    if (task.taskType === "research") {
      await updateAgentTask(taskId, { status: "completed", completedAt: new Date() });
      return;
    }

    // Step 2: Write article
    const writeResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一位半导体行业资深专家（Master），正在为知识付费平台撰写深度分析文章。
文章要求：
- 标题：吸引人，专业，10-30字
- 摘要：100-200字，概括核心观点
- 正文：1500-3000字，Markdown格式，包含标题、段落、列表等
- 风格：专业、深度、有独到见解，避免泛泛而谈
- 内容：基于公开信息，不涉及内部机密`,
        },
        {
          role: "user",
          content: `基于以下研究资料，撰写一篇深度分析文章：\n\n${rawResearch}\n\n用户指令：${task.instruction}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "article",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              content: { type: "string" },
            },
            required: ["title", "summary", "content"],
            additionalProperties: false,
          },
        },
      },
    });

    const articleData = JSON.parse((writeResponse.choices[0]?.message?.content as string | null) ?? "{}");
    log("✅ 中文文章撰写完成，开始翻译...");

    // Step 3: Translate
    let titleEn = "", summaryEn = "", contentEn = "";
    let titleJa = "", summaryJa = "", contentJa = "";

    const targetLangs = (task.targetLangs as string[]) ?? ["zh", "en", "ja"];

    if (targetLangs.includes("en")) {
      const enResponse = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional semiconductor industry translator. Translate the following Chinese article to English, maintaining technical accuracy and professional tone." },
          { role: "user", content: `Title: ${articleData.title}\nSummary: ${articleData.summary}\nContent: ${articleData.content}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "translation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                content: { type: "string" },
              },
              required: ["title", "summary", "content"],
              additionalProperties: false,
            },
          },
        },
      });
      const enData = JSON.parse((enResponse.choices[0]?.message?.content as string | null) ?? "{}");
      titleEn = enData.title;
      summaryEn = enData.summary;
      contentEn = enData.content;
      log("✅ 英文翻译完成");
    }

    if (targetLangs.includes("ja")) {
      const jaResponse = await invokeLLM({
        messages: [
          { role: "system", content: "あなたは半導体業界の専門翻訳者です。以下の中国語記事を日本語に翻訳してください。技術的な正確さとプロフェッショナルなトーンを維持してください。" },
          { role: "user", content: `タイトル: ${articleData.title}\n要約: ${articleData.summary}\n本文: ${articleData.content}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "translation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                content: { type: "string" },
              },
              required: ["title", "summary", "content"],
              additionalProperties: false,
            },
          },
        },
      });
      const jaData = JSON.parse((jaResponse.choices[0]?.message?.content as string | null) ?? "{}");
      titleJa = jaData.title;
      summaryJa = jaData.summary;
      contentJa = jaData.content;
      log("✅ 日文翻译完成");
    }

    // Step 4: Save article
    const master = await getMasterById(task.masterId);
    if (!master) throw new Error("Master not found");

    const code = await generateArticleCode("industry");
    const article = await createArticle({
      code,
      masterId: task.masterId,
      category: "industry",
      status: "pending",
      titleZh: articleData.title,
      summaryZh: articleData.summary,
      contentZh: articleData.content,
      titleEn,
      summaryEn,
      contentEn,
      titleJa,
      summaryJa,
      contentJa,
      price: "10",
      isFree: false,
      tags: topics,
    });

    await updateAgentTask(taskId, {
      status: "completed",
      completedAt: new Date(),
      resultArticleId: article?.id,
    });

    log(`🎉 任务完成！文章已创建：${code}，等待管理员审核`);
  } catch (error: any) {
    await updateAgentTask(taskId, {
      status: "failed",
      errorMessage: error.message,
    });
    log(`❌ 任务失败：${error.message}`);
  }
}

export type AppRouter = typeof appRouter;
