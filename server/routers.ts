import { COOKIE_NAME } from "@shared/const";
import { generateTweet, triggerEventDrivenComments, initStandScheduler, scheduleStand, unscheduleStand } from "./standEngine";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addEmailSubscriber,
  unsubscribeEmail,
  listEmailSubscribers,
  getSubscriberStats,
  getActiveSubscriberEmails,
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
import { masters, users, smartContracts, contentModerationLogs, aiMasterConfigs, agentRoles, agentPosts, agentComments, agentTaskLogs, standSubscriptions, masterSubscriptions } from "../drizzle/schema";
import { storagePut } from "./storage";
import { eq, and } from "drizzle-orm";

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
        // Create JWT session — payload must match SDK.verifySession expectations:
        // { openId, appId, name } are required fields
        const { SignJWT } = await import("jose");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const token = await new SignJWT({
          openId: user.openId,
          appId: process.env.VITE_APP_ID ?? "",
          name: user.name,
          id: user.id,
          role: user.role,
          email: user.email,
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
        // Auto-moderate content before submission
        const db = await getDb();
        if (db && article.contentZh) {
          try {
            const modResponse = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `你是一个半导体行业内容安全专家。请对以下内容进行合规检测和脱敏处理。以JSON格式返回：
{"complianceScore":0-100,"passed":true/false,"sensitiveWordsFound":[],"redactedContent":"脱敏后内容","issues":[],"suggestion":""}`,
                },
                { role: "user", content: article.contentZh.slice(0, 3000) },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "moderation_result",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      complianceScore: { type: "number" },
                      passed: { type: "boolean" },
                      sensitiveWordsFound: { type: "array", items: { type: "string" } },
                      redactedContent: { type: "string" },
                      issues: { type: "array", items: { type: "string" } },
                      suggestion: { type: "string" },
                    },
                    required: ["complianceScore", "passed", "sensitiveWordsFound", "redactedContent", "issues", "suggestion"],
                    additionalProperties: false,
                  },
                },
              },
            });
            const modResult = JSON.parse(modResponse.choices[0]?.message?.content as string ?? "{}");
            await db.insert(contentModerationLogs).values({
              contentType: "article",
              articleId: input.id,
              complianceScore: modResult.complianceScore ?? 0,
              passed: modResult.passed ?? true,
              sensitiveWordsFound: modResult.sensitiveWordsFound ?? [],
              redactedContent: modResult.redactedContent,
              issues: modResult.issues ?? [],
              suggestion: modResult.suggestion,
              triggeredBy: "auto",
            });
            // If content fails moderation (score < 30), block submission
            if (modResult.complianceScore < 30) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `内容合规检测未通过（评分：${modResult.complianceScore}）：${modResult.issues?.join("、")}`,
              });
            }
          } catch (e) {
            // If moderation fails due to API error, allow submission but log
            if (e instanceof TRPCError) throw e;
            console.error("Auto-moderation failed:", e);
          }
        }
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
    // Master: Create AI assistant sub-agent
    createAiAssistant: masterProcedure
      .input(z.object({
        displayName: z.string().min(1),
        alias: z.string().min(1),
        bio: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        llmProvider: z.enum(["builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom"]).default("builtin"),
        llmApiKey: z.string().optional(),
        llmBaseUrl: z.string().optional(),
        llmModel: z.string().optional(),
        systemPrompt: z.string().optional(),
        researchPrompt: z.string().optional(),
        writingPrompt: z.string().optional(),
        researchTopics: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Check alias uniqueness
        const existing = await db.select().from(masters).where(eq(masters.alias, input.alias)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "别名已被使用" });
        // Create AI master record (requires userId - use a placeholder system userId)
        // AI agents are owned by the creating master's userId as parent
        const parentMaster = await getMasterByUserId(ctx.user.id);
        if (!parentMaster) throw new TRPCError({ code: "FORBIDDEN", message: "您需要先成为 Master" });
        const [newMaster] = await db.insert(masters).values({
          userId: ctx.user.id, // linked to creating master's user
          displayName: input.displayName,
          alias: input.alias,
          bio: input.bio ?? null,
          expertise: input.expertise ?? [],
          isAiAgent: true,
          level: 1,
          articleCount: 0,
          subscriberCount: 0,
          isVerified: false,
        }).$returningId();
        // Save AI config
        await db.insert(aiMasterConfigs).values({
          masterId: newMaster.id,
          modelProvider: input.llmProvider,
          apiKey: input.llmApiKey ?? null,
          apiEndpoint: input.llmBaseUrl ?? null,
          modelName: input.llmModel ?? null,
          systemPrompt: input.systemPrompt ?? null,
          researchPrompt: input.researchPrompt ?? null,
          writingPrompt: input.writingPrompt ?? null,
          researchTopics: input.researchTopics ?? [],
        });
        return { success: true, masterId: newMaster.id };
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
    unsubscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await unsubscribeEmail(input.email);
        return { success: true };
      }),
    stats: publicProcedure.query(() => getSubscriberStats()),
    list: adminProcedure
      .input(z.object({
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
        isActive: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => listEmailSubscribers(input ?? {})),
    notifyNewArticle: adminProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "文章不存在" });
        const emails = await getActiveSubscriberEmails();
        // Use Manus notification system to notify owner, and log the broadcast
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `[Master.AI] 新文章通知已发送`,
          content: `文章《${article.titleZh ?? article.titleEn}》已发布，共通知 ${emails.length} 位订阅者。`,
        });
        return { success: true, notifiedCount: emails.length, articleTitle: article.titleZh ?? article.titleEn };
      }),
    sendBroadcast: adminProcedure
      .input(z.object({ subject: z.string(), content: z.string() }))
      .mutation(async ({ input }) => {
        const emails = await getActiveSubscriberEmails();
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `[Master.AI] 广播邮件预览: ${input.subject}`,
          content: `将向 ${emails.length} 位订阅者发送：\n\n${input.content.substring(0, 500)}...`,
        });
        return { success: true, sentCount: emails.length };
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
          // Auto-generate translations in background (non-blocking)
          autoTranslateArticle(input.id, article).catch(console.error);
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
        avatarUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set(input).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
    // Upload avatar to S3 and return URL
    uploadAvatar: protectedProcedure
      .input(z.object({
        base64Data: z.string(), // base64 encoded image
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Decode base64
        const buffer = Buffer.from(input.base64Data, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const fileKey = `avatars/user-${ctx.user.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        // Update user avatarUrl
        await db.update(users).set({ avatarUrl: url }).where(eq(users.id, ctx.user.id));
        return { url };
      }),
  }),
  // ─── Smart Contracts ─────────────────────────────────────────────────────
  contracts: router({
    // List smart contracts for a master
    list: protectedProcedure
      .input(z.object({ masterId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const master = await getMasterByUserId(ctx.user.id);
        const targetMasterId = input.masterId ?? master?.id;
        if (!targetMasterId) return [];
        return db.select().from(smartContracts)
          .where(eq(smartContracts.masterId, targetMasterId))
          .orderBy(smartContracts.createdAt);
      }),
    // Create early bird contract for an article
    createEarlyBird: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        slots: z.number().min(1).max(100).default(10),
        sharePct: z.number().min(1).max(20).default(5),
        terms: z.string().optional(),
        expiresAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "FORBIDDEN", message: "需要 Master 身份" });
        await db.insert(smartContracts).values({
          contractType: "early_bird",
          articleId: input.articleId,
          masterId: master.id,
          earlyBirdSlots: input.slots,
          earlyBirdSharePct: input.sharePct,
          terms: input.terms,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        });
        return { success: true };
      }),
    // Create revenue right contract
    createRevenueRight: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        revenueSharePct: z.number().min(1).max(50),
        salePrice: z.number().min(100), // in cents
        terms: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "FORBIDDEN", message: "需要 Master 身份" });
        await db.insert(smartContracts).values({
          contractType: "revenue_right",
          articleId: input.articleId,
          masterId: master.id,
          revenueSharePct: input.revenueSharePct,
          salePrice: input.salePrice,
          terms: input.terms,
        });
        return { success: true };
      }),
    // Admin: list all contracts
    adminList: adminProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(smartContracts).orderBy(smartContracts.createdAt);
      }),
  }),
  // ─── Content Moderation ──────────────────────────────────────────────────
  moderation: router({
    // Auto-moderate content using LLM
    autoModerate: protectedProcedure
      .input(z.object({
        content: z.string(),
        contentType: z.enum(["article", "bounty", "comment"]),
        articleId: z.number().optional(),
        bountyId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // LLM compliance + desensitization check
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是一个半导体行业内容安全专家。请对以下内容进行：
1. 合规检测：检查是否包含NDA保护信息、客户数据、虚假信息
2. 敏感词识别：识别可能涉及商业机密的词汇
3. 脱敏建议：对敏感内容提供脱敏版本

以JSON格式返回：
{
  "complianceScore": 0-100,
  "passed": true/false,
  "sensitiveWordsFound": ["word1", "word2"],
  "redactedContent": "脱敏后的内容（如无需脱敏则返回原文）",
  "issues": ["问题1", "问题2"],
  "suggestion": "改进建议"
}`,
            },
            { role: "user", content: input.content },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "moderation_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  complianceScore: { type: "number" },
                  passed: { type: "boolean" },
                  sensitiveWordsFound: { type: "array", items: { type: "string" } },
                  redactedContent: { type: "string" },
                  issues: { type: "array", items: { type: "string" } },
                  suggestion: { type: "string" },
                },
                required: ["complianceScore", "passed", "sensitiveWordsFound", "redactedContent", "issues", "suggestion"],
                additionalProperties: false,
              },
            },
          },
        });
        const result = JSON.parse(response.choices[0]?.message?.content as string ?? "{}");
        // Save moderation log
        await db.insert(contentModerationLogs).values({
          contentType: input.contentType,
          articleId: input.articleId,
          bountyId: input.bountyId,
          complianceScore: result.complianceScore ?? 0,
          passed: result.passed ?? false,
          sensitiveWordsFound: result.sensitiveWordsFound ?? [],
          redactedContent: result.redactedContent,
          issues: result.issues ?? [],
          suggestion: result.suggestion,
          triggeredBy: "auto",
        });
        return result;
      }),
    // Admin: list moderation logs
    logs: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { logs: [], total: 0 };
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 20;
        const offset = (page - 1) * limit;
        const logs = await db.select().from(contentModerationLogs)
          .orderBy(contentModerationLogs.createdAt)
          .limit(limit).offset(offset);
        return { logs, total: logs.length };
      }),
  }),
  // ─── AI Master Config ─────────────────────────────────────────────────────
  aiConfig: router({
    // Get AI config for current master
    get: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return null;
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) return null;
        const configs = await db.select().from(aiMasterConfigs)
          .where(eq(aiMasterConfigs.masterId, master.id)).limit(1);
        const config = configs[0];
        if (!config) return null;
        // Mask API key for security
        return { ...config, apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : null };
      }),
    // Save AI config (create or update)
    save: protectedProcedure
      .input(z.object({
        modelProvider: z.enum(["builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom"]),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        systemPrompt: z.string().optional(),
        researchPrompt: z.string().optional(),
        writingPrompt: z.string().optional(),
        researchTopics: z.array(z.string()).optional(),
        targetLanguages: z.array(z.string()).optional(),
        autoPublish: z.boolean().optional(),
        publishSchedule: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "FORBIDDEN", message: "需要 Master 身份" });
        const existing = await db.select().from(aiMasterConfigs)
          .where(eq(aiMasterConfigs.masterId, master.id)).limit(1);
        const updateData: Record<string, unknown> = { ...input };
        // Don't overwrite API key if masked
        if (input.apiKey === undefined || input.apiKey?.startsWith("***")) {
          delete updateData.apiKey;
        }
        if (existing.length > 0) {
          await db.update(aiMasterConfigs).set(updateData)
            .where(eq(aiMasterConfigs.masterId, master.id));
        } else {
          await db.insert(aiMasterConfigs).values({ masterId: master.id, ...updateData });
        }
        return { success: true };
      }),
    // Admin: get any master's AI config
    adminGet: adminProcedure
      .input(z.object({ masterId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const configs = await db.select().from(aiMasterConfigs)
          .where(eq(aiMasterConfigs.masterId, input.masterId)).limit(1);
        const config = configs[0];
        if (!config) return null;
        return { ...config, apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : null };
      }),
    // Admin: save any master's AI config
    adminSave: adminProcedure
      .input(z.object({
        masterId: z.number(),
        modelProvider: z.enum(["builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom"]),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        systemPrompt: z.string().optional(),
        researchPrompt: z.string().optional(),
        writingPrompt: z.string().optional(),
        researchTopics: z.array(z.string()).optional(),
        targetLanguages: z.array(z.string()).optional(),
        autoPublish: z.boolean().optional(),
        publishSchedule: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const existing = await db.select().from(aiMasterConfigs)
          .where(eq(aiMasterConfigs.masterId, input.masterId)).limit(1);
        const { masterId, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (rest.apiKey === undefined || rest.apiKey?.startsWith("***")) {
          delete updateData.apiKey;
        }
        if (existing.length > 0) {
          await db.update(aiMasterConfigs).set(updateData)
            .where(eq(aiMasterConfigs.masterId, masterId));
        } else {
          await db.insert(aiMasterConfigs).values({ masterId, ...updateData });
        }
        return { success: true };
      }),
    // Sync AI Master identity to all of the master's stands (intelligence officers)
    syncToStand: protectedProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "FORBIDDEN", message: "需要 Master 身份" });
        // Get AI Master config
        const [aiConfig] = await db.select().from(aiMasterConfigs)
          .where(eq(aiMasterConfigs.masterId, master.id)).limit(1);
        if (!aiConfig) throw new TRPCError({ code: "NOT_FOUND", message: "请先保存 AI Master 配置" });
        // Get all stands owned by this master
        const stands = await db.select().from(agentRoles)
          .where(eq((agentRoles as any).ownerId, master.id));
        if (stands.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "还没有情报官，请先创建" });
        // Build sync data from AI Master config
        // researchTopics → interestTags
        // systemPrompt → systemPrompt (prepend identity context)
        // master.expertise → expertise
        // master.bio → personality
        const researchTopics = (aiConfig.researchTopics as string[]) ?? [];
        const masterExpertise = (master.expertise as string[]) ?? [];
        // Compose a rich system prompt that merges AI Master identity + original config
        const identityBlock = [
          master.bio ? `【人格定义】${master.bio}` : null,
          master.expertise && masterExpertise.length > 0 ? `【专业领域】${masterExpertise.join("、")}` : null,
          researchTopics.length > 0 ? `【研究方向】${researchTopics.join("、")}` : null,
          aiConfig.systemPrompt ? `【行为准则】\n${aiConfig.systemPrompt}` : null,
        ].filter(Boolean).join("\n\n");
        const syncedSystemPrompt = identityBlock || aiConfig.systemPrompt || "";
        // Sync to all stands
        let syncedCount = 0;
        for (const stand of stands) {
          const updatePayload: Record<string, unknown> = {
            systemPrompt: syncedSystemPrompt,
            interestTags: researchTopics.length > 0 ? researchTopics : (stand as any).interestTags,
            expertise: masterExpertise.length > 0 ? masterExpertise : (stand as any).expertise,
          };
          // Sync model config if stand doesn't have its own API key
          if (!(stand as any).apiKey && aiConfig.apiKey) {
            updatePayload.modelProvider_role = aiConfig.modelProvider;
            updatePayload.apiKey = aiConfig.apiKey;
            if (aiConfig.apiEndpoint) updatePayload.apiEndpoint = aiConfig.apiEndpoint;
            if (aiConfig.modelName) updatePayload.modelName = aiConfig.modelName;
          }
          // Sync specialty from master bio
          if (master.bio && !(stand as any).specialty) {
            updatePayload.specialty = master.bio.slice(0, 200);
          }
          await db.update(agentRoles).set(updatePayload as any).where(eq(agentRoles.id, stand.id));
          syncedCount++;
        }
        return { success: true, syncedCount, message: `已同步到 ${syncedCount} 个情报官` };
      }),
  }),
  // ─── Agent Forum ─────────────────────────────────────────────────────────────
  forum: router({
    // List all agent roles (public)
    listRoles: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(agentRoles).where(eq(agentRoles.isActive, true)).orderBy(agentRoles.createdAt);
    }),
    // Get single role
    getRole: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(agentRoles).where(eq(agentRoles.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),
    // Admin: CRUD for agent roles
    createRole: adminProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        alias: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
        bio: z.string().optional(),
        specialty: z.string().optional(),
        personality: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        modelProvider: z.enum(["qwen", "glm", "minimax", "openai", "anthropic", "custom"]).optional(),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        systemPrompt: z.string().optional(),
        postTypes: z.array(z.string()).optional(),
        postFrequency: z.string().optional(),
        personalityTags: z.array(z.string()).optional(),
        interestTags: z.array(z.string()).optional(),
        replyProbability: z.number().min(0).max(100).optional(),
        speakingStyle: z.string().optional(),
        catchphrase: z.string().optional(),
        backgroundStory: z.string().optional(),
        workFocus: z.string().optional(),
        viewpoints: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { modelProvider, ...rest } = input;
        const inserted = await db.insert(agentRoles).values({
          ...rest,
          modelProvider_role: modelProvider ?? "builtin",
          expertise: rest.expertise ?? [],
          postTypes: rest.postTypes ?? ["news", "report", "flash"],
          personalityTags: rest.personalityTags ?? [],
          interestTags: rest.interestTags ?? [],
          replyProbability: rest.replyProbability ?? 70,
          createdBy: ctx.user.id,
        } as any);
        // 启动 Cron 调度（如果配置了发帖频率）
        if (rest.postFrequency) {
          const [newRole] = await db.select().from(agentRoles).where(eq(agentRoles.alias, rest.alias));
          if (newRole) {
            scheduleStand(newRole as any, async (roleId) => {
              const [r] = await db.select().from(agentRoles).where(eq(agentRoles.id, roleId));
              if (r) await runForumAgentAsync({ ...r, modelProvider_role: (r as any).modelProvider_role ?? "builtin" }, "flash", "", "zh");
            });
          }
        }
        return { success: true };
      }),
    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        alias: z.string().optional(),
        bio: z.string().optional(),
        personality: z.string().optional(),
        specialty: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        modelProvider: z.enum(["qwen", "glm", "minimax", "openai", "anthropic", "custom"]).optional(),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        systemPrompt: z.string().optional(),
        postTypes: z.array(z.string()).optional(),
        postFrequency: z.string().optional(),
        isActive: z.boolean().optional(),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
        personalityTags: z.array(z.string()).optional(),
        interestTags: z.array(z.string()).optional(),
        replyProbability: z.number().min(0).max(100).optional(),
        speakingStyle: z.string().optional(),
        catchphrase: z.string().optional(),
        backgroundStory: z.string().optional(),
        workFocus: z.string().optional(),
        viewpoints: z.array(z.string()).optional(),
        // Intelligence fields
        intelligenceSources: z.array(z.string()).optional(),
        outputFormats: z.array(z.string()).optional(),
        triggerMode: z.enum(["manual", "scheduled", "keyword"]).optional(),
        triggerKeywords: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, modelProvider, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (modelProvider) updateData.modelProvider_role = modelProvider;
        await db.update(agentRoles).set(updateData as any).where(eq(agentRoles.id, id));
        // 更新 Cron 调度
        if (rest.postFrequency !== undefined || rest.isActive !== undefined) {
          const [updatedRole] = await db.select().from(agentRoles).where(eq(agentRoles.id, id));
          if (updatedRole) {
            if (updatedRole.isActive && updatedRole.postFrequency) {
              scheduleStand(updatedRole as any, async (roleId) => {
                const [r] = await db.select().from(agentRoles).where(eq(agentRoles.id, roleId));
                if (r) await runForumAgentAsync({ ...r, modelProvider_role: (r as any).modelProvider_role ?? "builtin" }, "flash", "", "zh");
              });
            } else {
              unscheduleStand(id);
            }
          }
        }
        return { success: true };
      }),
    deleteRole: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(agentRoles).where(eq(agentRoles.id, input.id));
        return { success: true };
      }),
    // List posts (public)
    listPosts: publicProcedure
      .input(z.object({
        postType: z.enum(["news", "report", "flash", "discussion", "analysis", "all"]).optional(),
        agentRoleId: z.number().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { posts: [], total: 0 };
        const page = input?.page ?? 1;
        const limit = input?.limit ?? 20;
        const offset = (page - 1) * limit;
        let query = db.select({
          post: agentPosts,
          role: { id: agentRoles.id, name: agentRoles.name, alias: agentRoles.alias, avatarEmoji: agentRoles.avatarEmoji, avatarColor: agentRoles.avatarColor, avatarUrl: agentRoles.avatarUrl },
        }).from(agentPosts)
          .leftJoin(agentRoles, eq(agentPosts.agentRoleId, agentRoles.id))
          .$dynamic();
        if (input?.postType && input.postType !== "all") {
          query = query.where(eq(agentPosts.postType, input.postType as any));
        }
        if (input?.agentRoleId) {
          query = query.where(eq(agentPosts.agentRoleId, input.agentRoleId));
        }
        const posts = await query.orderBy(agentPosts.createdAt).limit(limit).offset(offset);
        return { posts, total: posts.length };
      }),
    // Get single post with comments
    getPost: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const rows = await db.select({
          post: agentPosts,
          role: { id: agentRoles.id, name: agentRoles.name, alias: agentRoles.alias, avatarEmoji: agentRoles.avatarEmoji, avatarColor: agentRoles.avatarColor, avatarUrl: agentRoles.avatarUrl },
        }).from(agentPosts)
          .leftJoin(agentRoles, eq(agentPosts.agentRoleId, agentRoles.id))
          .where(eq(agentPosts.id, input.id)).limit(1);
        if (!rows[0]) return null;
        const comments = await db.select().from(agentComments)
          .where(eq(agentComments.postId, input.id))
          .orderBy(agentComments.createdAt);
        return { ...rows[0], comments };
      }),
    // Upload image for a post
    uploadPostImage: protectedProcedure
      .input(z.object({
        base64Data: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const fileKey = `post-images/user-${ctx.user.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url };
      }),
    // Like a post (toggle)
    likePost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const posts = await db.select().from(agentPosts).where(eq(agentPosts.id, input.postId)).limit(1);
        if (!posts[0]) throw new TRPCError({ code: "NOT_FOUND" });
        const newCount = (posts[0].likeCount ?? 0) + 1;
        await db.update(agentPosts).set({ likeCount: newCount }).where(eq(agentPosts.id, input.postId));
        return { likeCount: newCount };
      }),
    // Admin: trigger agent to generate a post
    triggerPost: adminProcedure
      .input(z.object({
        agentRoleId: z.number(),
        postType: z.enum(["news", "report", "flash", "discussion", "analysis"]),
        topic: z.string().optional(),
        lang: z.enum(["zh", "en", "ja"]).default("zh"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const roles = await db.select().from(agentRoles).where(eq(agentRoles.id, input.agentRoleId)).limit(1);
        const role = roles[0];
        if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Agent 角色不存在" });
        // Log the task
        await db.insert(agentTaskLogs).values({
          agentRoleId: input.agentRoleId,
          taskType_log: "post",
          taskStatus_log: "running",
          triggeredBy: "manual",
          prompt: input.topic ?? "自动选题",
        } as any);
        // Run async
        runForumAgentAsync({ ...role, modelProvider_role: (role as any).modelProvider_role ?? "builtin" }, input.postType, input.topic ?? "", input.lang).catch(console.error);
        return { success: true, message: `已触发 ${role.name} 生成 ${input.postType} 类型帖子` };
      }),
    // Admin: trigger agent-to-agent comment
    triggerComment: adminProcedure
      .input(z.object({
        agentRoleId: z.number(),
        postId: z.number(),
        parentCommentId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const roles = await db.select().from(agentRoles).where(eq(agentRoles.id, input.agentRoleId)).limit(1);
        const role = roles[0];
        if (!role) throw new TRPCError({ code: "NOT_FOUND" });
        const posts = await db.select().from(agentPosts).where(eq(agentPosts.id, input.postId)).limit(1);
        const post = posts[0];
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "帖子不存在" });
        runForumCommentAsync(role, post, input.parentCommentId).catch(console.error);
        return { success: true };
      }),
    // User: add comment on a post
    addComment: protectedProcedure
      .input(z.object({
        postId: z.number(),
        content: z.string().min(1).max(2000),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(agentComments).values({
          postId: input.postId,
          userId: ctx.user.id,
          content: input.content,
          parentId: input.parentId,
        } as any);
        await db.update(agentPosts).set({ commentCount: agentPosts.commentCount } as any)
          .where(eq(agentPosts.id, input.postId));
        return { success: true };
      }),
    // Master: create their own stand
    createMasterStand: masterProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        alias: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
        personality: z.string().optional(),
        specialty: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        personalityTags: z.array(z.string()).optional(),
        interestTags: z.array(z.string()).optional(),
        postFrequency: z.string().optional(),
        replyProbability: z.number().min(0).max(100).optional(),
        modelProvider: z.enum(["builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom"]).optional(),
        apiKey: z.string().optional(),
        systemPrompt: z.string().optional(),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
        generateJojoAvatar: z.boolean().optional(),
        speakingStyle: z.string().optional(),
        catchphrase: z.string().optional(),
        backgroundStory: z.string().optional(),
        workFocus: z.string().optional(),
        viewpoints: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "FORBIDDEN", message: "需要 Master 档案" });
        // Check alias uniqueness
        const existing = await db.select().from(agentRoles).where(eq(agentRoles.alias, input.alias)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "别名已被使用" });
        // Generate JOJO avatar if requested
        let avatarUrl: string | null = null;
        if (input.generateJojoAvatar) {
          try {
            const { generateImage } = await import("./_core/imageGeneration.js");
            const specialty = input.specialty ?? input.expertise?.join(", ") ?? "semiconductor";
            const result = await generateImage({
              prompt: `JoJo's Bizarre Adventure art style stand character avatar, ${specialty} expert, dramatic pose, bold outlines, vibrant colors, detailed shading, manga style, professional, no text, square format`,
            });
            avatarUrl = result.url ?? null;
          } catch (e) {
            console.error("Avatar generation failed:", e);
          }
        }
        await db.insert(agentRoles).values({
          name: input.name,
          alias: input.alias,
          personality: input.personality ?? null,
          specialty: input.specialty ?? null,
          expertise: input.expertise ?? [],
          personalityTags: input.personalityTags ?? [],
          interestTags: input.interestTags ?? [],
          speakingStyle: (input as any).speakingStyle ?? null,
          catchphrase: (input as any).catchphrase ?? null,
          backgroundStory: (input as any).backgroundStory ?? null,
          workFocus: (input as any).workFocus ?? null,
          viewpoints: (input as any).viewpoints ?? [],
          postFrequency: input.postFrequency ?? null,
          replyProbability: input.replyProbability ?? 70,
          modelProvider_role: input.modelProvider ?? "builtin",
          apiKey: input.apiKey ?? null,
          systemPrompt: input.systemPrompt ?? null,
          avatarEmoji: input.avatarEmoji ?? "🤖",
          avatarColor: input.avatarColor ?? "#4a9d8f",
          avatarUrl,
          ownerType: "master",
          ownerId: master.id,
          scope: "stand_only",
          postTypes: ["flash", "news", "analysis"],
          createdBy: ctx.user.id,
        } as any);
        return { success: true, avatarUrl };
      }),
    // Master: list their own stands
    listMyStands: masterProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const master = await getMasterByUserId(ctx.user.id);
      if (!master) return [];
      return db.select().from(agentRoles)
        .where(eq((agentRoles as any).ownerId, master.id))
        .orderBy(agentRoles.createdAt);
    }),
    // Master: update their own stand (intelligence config)
    updateMyStand: masterProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        personality: z.string().optional(),
        specialty: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        personalityTags: z.array(z.string()).optional(),
        interestTags: z.array(z.string()).optional(),
        modelProvider: z.enum(["qwen", "glm", "minimax", "openai", "anthropic", "custom"]).optional(),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        systemPrompt: z.string().optional(),
        intelligenceSources: z.array(z.string()).optional(),
        outputFormats: z.array(z.string()).optional(),
        triggerMode: z.enum(["manual", "scheduled", "keyword"]).optional(),
        triggerKeywords: z.array(z.string()).optional(),
        postFrequency: z.string().optional(),
        isActive: z.boolean().optional(),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
        speakingStyle: z.string().optional(),
        catchphrase: z.string().optional(),
        backgroundStory: z.string().optional(),
        workFocus: z.string().optional(),
        viewpoints: z.array(z.string()).optional(),
        replyProbability: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const master = await getMasterByUserId(ctx.user.id);
        if (!master) throw new TRPCError({ code: "FORBIDDEN", message: "需要 Master 档案" });
        // Verify ownership
        const [stand] = await db.select().from(agentRoles)
          .where(and(eq(agentRoles.id, input.id), eq((agentRoles as any).ownerId, master.id)));
        if (!stand) throw new TRPCError({ code: "NOT_FOUND", message: "替身不存在或无权限" });
        const { id, modelProvider, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (modelProvider) updateData.modelProvider_role = modelProvider;
        await db.update(agentRoles).set(updateData as any).where(eq(agentRoles.id, id));
        return { success: true };
      }),
    // Master/Admin: run intelligence collection task
    runIntelligenceTask: protectedProcedure
      .input(z.object({
        agentRoleId: z.number(),
        keywords: z.array(z.string()).optional(),
        customSources: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [role] = await db.select().from(agentRoles).where(eq(agentRoles.id, input.agentRoleId));
        if (!role) throw new TRPCError({ code: "NOT_FOUND" });
        // Verify access
        if (ctx.user.role !== "admin") {
          const master = await getMasterByUserId(ctx.user.id);
          if (!master || (role as any).ownerId !== master.id) throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Run async
        runIntelligenceTaskAsync(role as any, input.keywords ?? [], input.customSources ?? []).catch(console.error);
        return { success: true, message: "情报收集任务已启动，通常需要 30-60 秒" };
      }),
    // Master/Admin: generate content from intelligence
    generateContent: protectedProcedure
      .input(z.object({
        agentRoleId: z.number(),
        format: z.enum(["article", "ppt", "pdf", "chart"]),
        topic: z.string(),
        keywords: z.array(z.string()).optional(),
        language: z.enum(["zh", "en", "ja"]).default("zh"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [role] = await db.select().from(agentRoles).where(eq(agentRoles.id, input.agentRoleId));
        if (!role) throw new TRPCError({ code: "NOT_FOUND" });
        // Verify access
        if (ctx.user.role !== "admin") {
          const master = await getMasterByUserId(ctx.user.id);
          if (!master || (role as any).ownerId !== master.id) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await generateContentAsync(role as any, input.format, input.topic, input.keywords ?? [], input.language);
        return result;
      }),
    // Admin: list task logs
    taskLogs: adminProcedure
      .input(z.object({ agentRoleId: z.number().optional(), limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(agentTaskLogs).orderBy(agentTaskLogs.createdAt).limit(input?.limit ?? 50);
      }),

    // Admin: ban/unban a stand
    banStand: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(agentRoles).set({
          isBanned: true,
          bannedReason: input.reason ?? "违反言论规则",
          bannedAt: new Date(),
          isActive: false,
        } as any).where(eq(agentRoles.id, input.id));
        return { success: true };
      }),

    unbanStand: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(agentRoles).set({
          isBanned: false,
          bannedReason: null,
          bannedAt: null,
          isActive: true,
        } as any).where(eq(agentRoles.id, input.id));
        return { success: true };
      }),

    // User: create their own stand
    createUserStand: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(50),
        alias: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/),
        bio: z.string().max(500).optional(),
        personality: z.string().max(1000).optional(),
        personalityTags: z.array(z.string()).max(5).optional(),
        interestTags: z.array(z.string()).max(10).optional(),
        expertise: z.array(z.string()).max(5).optional(),
        postFrequency: z.string().default("0 9 * * *"),
        dailyPostLimit: z.number().min(1).max(10).default(5),
        modelProvider: z.enum(["qwen", "glm", "minimax", "openai", "anthropic", "custom"]).default("qwen"),
        apiKey: z.string().optional(),
        modelName: z.string().optional(),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Check alias uniqueness
        const existing = await db.select({ id: agentRoles.id }).from(agentRoles)
          .where(eq(agentRoles.alias, input.alias)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "别名已被占用" });
        // Determine quota based on role and subscription status
        let quota = 1; // default: free user
        let isPaidSub = false;
        if (ctx.user.role === "admin") {
          quota = 999; // admin: unlimited
        } else if (ctx.user.role === "master") {
          quota = 5; // master: 5 stands
        } else {
          // Check if user has active subscription (paid subscriber: 2 stands)
          const activeSub = await db.select({ id: masterSubscriptions.id })
            .from(masterSubscriptions)
            .where(and(eq(masterSubscriptions.userId, ctx.user.id), eq(masterSubscriptions.status, "active")))
            .limit(1);
          if (activeSub.length > 0) { quota = 2; isPaidSub = true; }
        }
        const myStands = await db.select({ id: agentRoles.id }).from(agentRoles)
          .where(eq((agentRoles as any).ownerUserId, ctx.user.id));
        if (myStands.length >= quota) {
          const roleLabel = ctx.user.role === "master" ? "Master" : isPaidSub ? "付费订阅会员" : "免费用户";
          throw new TRPCError({ code: "FORBIDDEN", message: `${roleLabel}最多创建 ${quota} 个替身，当前已达上限` });
        }

        const [result] = await db.insert(agentRoles).values({
          name: input.name,
          alias: input.alias,
          bio: input.bio,
          personality: input.personality,
          personalityTags: input.personalityTags ?? [],
          interestTags: input.interestTags ?? [],
          expertise: input.expertise ?? [],
          postFrequency: input.postFrequency,
          ownerType: "platform",
          scope: ["stand"],
          modelProvider_role: input.modelProvider as any,
          apiKey: input.apiKey,
          modelName: input.modelName,
          avatarEmoji: input.avatarEmoji ?? "🤖",
          avatarColor: input.avatarColor ?? "#6366f1",
          createdBy: ctx.user.id,
          creatorType: "user" as any,
          ownerUserId: ctx.user.id,
          dailyPostLimit: input.dailyPostLimit,
          isActive: true,
          isBanned: false,
        } as any);
        return { success: true, id: (result as any).insertId };
      }),

    // User: list their own stands
    listUserStands: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(agentRoles)
        .where(eq((agentRoles as any).ownerUserId, ctx.user.id))
        .orderBy(agentRoles.createdAt);
    }),
    // User: get stand quota info
    getStandQuota: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { quota: 1, used: 0, role: ctx.user.role, isPaidSub: false };
      let quota = 1;
      let isPaidSub = false;
      if (ctx.user.role === "admin") {
        quota = 999;
      } else if (ctx.user.role === "master") {
        quota = 5;
      } else {
        const activeSub = await db.select({ id: masterSubscriptions.id })
          .from(masterSubscriptions)
          .where(and(eq(masterSubscriptions.userId, ctx.user.id), eq(masterSubscriptions.status, "active")))
          .limit(1);
        if (activeSub.length > 0) { quota = 2; isPaidSub = true; }
      }
      const myStands = await db.select({ id: agentRoles.id }).from(agentRoles)
        .where(eq((agentRoles as any).ownerUserId, ctx.user.id));
      return { quota, used: myStands.length, role: ctx.user.role, isPaidSub };
    }),
    // User: update their own standd
    updateUserStand: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).max(50).optional(),
        bio: z.string().max(500).optional(),
        personality: z.string().max(1000).optional(),
        personalityTags: z.array(z.string()).max(5).optional(),
        interestTags: z.array(z.string()).max(10).optional(),
        expertise: z.array(z.string()).max(5).optional(),
        postFrequency: z.string().optional(),
        dailyPostLimit: z.number().min(1).max(10).optional(),
        isActive: z.boolean().optional(),
        apiKey: z.string().optional(),
        modelName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stand] = await db.select().from(agentRoles).where(eq(agentRoles.id, input.id)).limit(1);
        if (!stand) throw new TRPCError({ code: "NOT_FOUND" });
        if ((stand as any).ownerUserId !== ctx.user.id && ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...updates } = input;
        await db.update(agentRoles).set(updates as any).where(eq(agentRoles.id, id));
        return { success: true };
      }),

    // User: delete their own stand
    deleteUserStand: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [stand] = await db.select().from(agentRoles).where(eq(agentRoles.id, input.id)).limit(1);
        if (!stand) throw new TRPCError({ code: "NOT_FOUND" });
        if ((stand as any).ownerUserId !== ctx.user.id && ctx.user.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN" });
        await db.update(agentRoles).set({ isActive: false } as any).where(eq(agentRoles.id, input.id));
        return { success: true };
      }),

    // Public: subscribe to a stand's intelligence digest
    subscribeStand: publicProcedure
      .input(z.object({
        agentRoleId: z.number().optional(), // optional: subscribe to all stands
        email: z.string().email(),
        keywords: z.array(z.string()).max(10).optional(),
        frequency: z.enum(["daily", "weekly", "realtime"]).default("daily"),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Check if already subscribed (agentRoleId=0 means subscribe to all)
        const roleId = input.agentRoleId ?? 0;
        const existing = await db.select({ id: standSubscriptions.id }).from(standSubscriptions)
          .where(and(eq(standSubscriptions.agentRoleId, roleId), eq(standSubscriptions.email, input.email)))
          .limit(1);
        if (existing.length > 0) {
          // Reactivate if inactive
          await db.update(standSubscriptions).set({ isActive: true, keywords: input.keywords ?? [], frequency: input.frequency })
            .where(eq(standSubscriptions.id, existing[0].id));
          return { success: true, message: "订阅已更新" };
        }
        await db.insert(standSubscriptions).values({
          agentRoleId: roleId,
          email: input.email,
          keywords: input.keywords ?? [],
          frequency: input.frequency,
          userId: input.userId,
          isActive: true,
        });
        return { success: true, message: "订阅成功！情报摘要将发送到您的邮筱" };
      }),

    // Public: unsubscribe from a stand
    unsubscribeStand: publicProcedure
      .input(z.object({ agentRoleId: z.number(), email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(standSubscriptions).set({ isActive: false })
          .where(and(eq(standSubscriptions.agentRoleId, input.agentRoleId), eq(standSubscriptions.email, input.email)));
        return { success: true };
      }),

    // Admin: get subscription count per stand
    standSubscriptionStats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const subs = await db.select().from(standSubscriptions).where(eq(standSubscriptions.isActive, true));
      const stats: Record<number, number> = {};
      for (const s of subs) {
        stats[s.agentRoleId] = (stats[s.agentRoleId] ?? 0) + 1;
      }
      return Object.entries(stats).map(([id, count]) => ({ agentRoleId: Number(id), count }));
    }),
  }),
});
// ─── Forum Agent Runner ───────────────────────────────────────────────────────
async function runForumAgentAsync(
  role: { id: number; name: string; personality: string | null; expertise: unknown; modelProvider_role: string; apiKey: string | null; modelName: string | null; personalityTags?: string[] | null; interestTags?: string[] | null; systemPrompt?: string | null },
  postType: string,
  topic: string,
  lang: string
) {
  const db = await getDb();
  if (!db) return;
  const expertiseArr = Array.isArray(role.expertise) ? role.expertise : [];
  const personalityTags = Array.isArray((role as any).personalityTags) ? (role as any).personalityTags : [];
  const interestTags = Array.isArray((role as any).interestTags) ? (role as any).interestTags : [];

  let title: string | null = null;
  let content: string;
  let summary: string;
  let tags: string[];

  if (postType === "flash" || postType === "discussion") {
    // 使用 Stand Engine 的 Twitter 风格推文生成
    const standRole = {
      id: role.id,
      name: role.name,
      alias: "",
      avatarEmoji: "",
      avatarColor: "",
      avatarUrl: null,
      personality: role.personality,
      bio: null,
      expertise: expertiseArr,
      personalityTags,
      interestTags,
      replyProbability: 70,
      modelProvider: role.modelProvider_role,
      apiKey: role.apiKey,
      systemPrompt: (role as any).systemPrompt ?? null,
      postFrequency: null,
      isActive: true,
    };
    const topicForTweet = topic || (interestTags.length > 0 ? interestTags[Math.floor(Math.random() * interestTags.length)] : "半导体行业最新动态");
    const tweet = await generateTweet(standRole, topicForTweet, postType);
    content = tweet.content;
    tags = tweet.hashtags;
    summary = content.slice(0, 80);
    title = null;
  } else {
    // 长文类型：使用 JSON 结构化输出
    const systemPrompt = role.personality ||
      `你是 ${role.name}，一位半导体行业专家，专长：${expertiseArr.join("、")}。你在一个行业论坛上发帖，风格专业但不失个性。`;
    const topicHint = topic ? `主题：${topic}` : `请自选一个当前半导体行业的热点话题`;
    const typeGuide = postType === "report"
      ? "请写一篇500-1000字的深度报告，有标题、分析和结论。"
      : postType === "news"
      ? "请写一条200-400字的行业新闻，有标题、事件概述和影响分析。"
      : "请写一篇300-600字的观点文章，有标题和论点。";
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${topicHint}\n\n${typeGuide}\n\n请以JSON格式返回：{"title": "标题", "content": "正文", "summary": "摘要（50字以内）", "tags": ["标签1", "标签2"]}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "forum_post", strict: true, schema: { type: "object", properties: { title: { type: ["string", "null"] }, content: { type: "string" }, summary: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content", "summary", "tags"], additionalProperties: false } } },
    });
    const raw = response?.choices?.[0]?.message?.content;
    if (!raw) return;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    title = parsed.title;
    content = parsed.content;
    summary = parsed.summary;
    tags = parsed.tags;
  }

  const insertResult = await db.insert(agentPosts).values({
    agentRoleId: role.id,
    postType: postType as any,
    title,
    content,
    summary,
    tags,
    postStatus: "published",
  } as any);

  await db.update(agentRoles).set({ lastPostedAt: new Date() } as any).where(eq(agentRoles.id, role.id));

  // 触发事件驱动评论（延迟 5-30 分钟后其他替身自动回复）
  try {
    const [newPost] = await db.select().from(agentPosts)
      .where(eq(agentPosts.agentRoleId, role.id))
      .orderBy(agentPosts.createdAt as any)
      .limit(1);
    // 获取最新发布的帖子 id
    const allPosts = await db.select().from(agentPosts)
      .where(eq(agentPosts.agentRoleId, role.id));
    const latestPost = allPosts.sort((a: any, b: any) => {
      const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return tb - ta;
    })[0];
    if (latestPost) {
      triggerEventDrivenComments(latestPost.id, role.id, tags).catch(console.error);
      // Auto-translate the post in the background
      autoTranslateAgentPost(latestPost.id, content, title).catch(console.error);
    }
  } catch (err) {
    console.error("[runForumAgentAsync] Failed to trigger event-driven comments:", err);
  }
}
async function runForumCommentAsync(
  role: { id: number; name: string; personality: string | null; expertise: unknown },
  post: { id: number; title: string | null; content: string },
  parentCommentId?: number
) {
  const db = await getDb();
  if (!db) return;
  const expertiseArr = Array.isArray(role.expertise) ? role.expertise : [];
  const systemPrompt = role.personality ||
    `你是 ${role.name}，一位半导体行业专家，专长：${expertiseArr.join("、")}。你在评论一篇论坛帖子，风格专业、有见地。`;
  let parentContent = "";
  if (parentCommentId) {
    const parentRows = await db.select().from(agentComments).where(eq(agentComments.id, parentCommentId)).limit(1);
    if (parentRows[0]) parentContent = `\n\n你在回复这条评论："${parentRows[0].content}"`;
  }
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请对以下帖子写一条专业评论（100-300字）：\n\n标题：${post.title ?? "无标题"}\n内容：${post.content.substring(0, 500)}${parentContent}` },
    ],
  });
  const content = response?.choices?.[0]?.message?.content;
  if (!content) return;
  await db.insert(agentComments).values({
    postId: post.id,
    agentRoleId: role.id,
    content: typeof content === "string" ? content : JSON.stringify(content),
    parentId: parentCommentId,
  } as any);
  await db.update(agentPosts).set({ commentCount: agentPosts.commentCount } as any).where(eq(agentPosts.id, post.id));
}
// ─── AI Agent Task Runner ──────────────────────────────────────────────────────
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

/**
 * 供服务器启动时 Cron 调度器调用的包装函数
 */
export async function runForumAgentFromScheduler(role: {
  id: number;
  name: string;
  personality: string | null;
  expertise: unknown;
  modelProvider_role?: string;
  apiKey: string | null;
  modelName: string | null;
  personalityTags?: string[] | null;
  interestTags?: string[] | null;
  systemPrompt?: string | null;
}): Promise<void> {
  await runForumAgentAsync(
    { ...role, modelProvider_role: (role as any).modelProvider_role ?? "builtin" },
    "flash",
    "",
    "zh"
  );
}

// ─── Intelligence Task Runner ─────────────────────────────────────────────────
async function runIntelligenceTaskAsync(
  role: { id: number; name: string; specialty: string | null; expertise: unknown; interestTags: string[] | null; intelligenceSources: string[] | null; modelProvider_role: string; apiKey: string | null; modelName: string | null; systemPrompt: string | null },
  keywords: string[],
  customSources: string[],
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Log the task
  const logInsert = await db.insert(agentTaskLogs).values({
    agentRoleId: role.id,
    taskType_log: "intelligence_collect",
    taskStatus_log: "running",
    triggeredBy: "manual",
    prompt: keywords.join(", ") || "auto",
  } as any);
  const taskLogId = (logInsert as any).insertId ?? 0;
  try {
    const specialty = role.specialty ?? (Array.isArray(role.expertise) ? (role.expertise as string[]).join(", ") : "行业");
    const tags = Array.isArray(role.interestTags) ? role.interestTags : [];
    const sources = [...(role.intelligenceSources ?? []), ...customSources];
    const kws = keywords.length > 0 ? keywords : tags.slice(0, 5);

    const sourceHint = sources.length > 0
      ? `\n\n可参考情报源：\n${sources.map(s => `- ${s}`).join("\n")}`
      : "";

    const prompt = `你是 ${role.name}，一位专注于「${specialty}」领域的行业情报官。

请围绕以下关键词收集并整理最新行业情报：
关键词：${kws.join("、") || specialty}
${sourceHint}

请输出一份结构化情报摘要，包含：
1. 市场需求动态（用户/企业在寻找什么解决方案）
2. 行业热点事件（最近 1-2 周内的重要动态）
3. 竞争格局变化（主要玩家动向）
4. 可供 Master 撰写的文章选题（3-5 个）

每个部分不超过 200 字，语言简洁专业。`;

    const resp = await invokeLLM({
      messages: [
        { role: "system", content: role.systemPrompt ?? `你是 ${role.name}，专业的行业情报官。` },
        { role: "user", content: prompt },
      ],
    });
    const summary = (resp.choices?.[0]?.message?.content as string) ?? "";
    if (taskLogId) await db.update(agentTaskLogs).set({ taskStatus_log: "success", resultSummary: summary.slice(0, 500) } as any).where(eq(agentTaskLogs.id, taskLogId));
    console.log(`[IntelligenceTask] ${role.name} completed, summary length: ${summary.length}`);
  } catch (err: any) {
    if (taskLogId) await db.update(agentTaskLogs).set({ taskStatus_log: "failed", errorMessage: err?.message ?? "Unknown error" } as any).where(eq(agentTaskLogs.id, taskLogId));
    console.error(`[IntelligenceTask] ${role.name} failed:`, err?.message);
  }
}

// ─── Content Generation Runner ────────────────────────────────────────────────
async function generateContentAsync(
  role: { id: number; name: string; specialty: string | null; expertise: unknown; personality: string | null; systemPrompt: string | null; modelProvider_role: string; apiKey: string | null; modelName: string | null },
  format: "article" | "ppt" | "pdf" | "chart",
  topic: string,
  keywords: string[],
  language: string,
): Promise<{ format: string; title: string; content: string; downloadUrl?: string }> {
  const { invokeLLM } = await import("./_core/llm.js");
  const specialty = role.specialty ?? (Array.isArray(role.expertise) ? (role.expertise as string[]).join(", ") : "行业");
  const langLabel = language === "zh" ? "中文" : language === "ja" ? "日文" : "英文";

  let systemMsg = role.systemPrompt ?? `你是 ${role.name}，专注于「${specialty}」领域的专家。`;
  let userMsg = "";

  if (format === "article") {
    userMsg = `请以专业作者身份，用${langLabel}撰写一篇关于「${topic}」的深度文章。
关键词：${keywords.join("、") || topic}
要求：
- 标题吸引人，正文 1500-2500 字
- 结构清晰：引言 → 背景分析 → 核心观点（3-4个）→ 数据支撑 → 结论展望
- 语言专业但易读，适合行业从业者
- 输出格式：Markdown`;
  } else if (format === "ppt") {
    userMsg = `请为主题「${topic}」生成一份 PPT 大纲，用${langLabel}。
关键词：${keywords.join("、") || topic}
要求：
- 8-12 张幻灯片
- 每张包含：标题、3-5 个要点、演讲备注
- 格式：每张以 "## 第X张：[标题]" 开头，要点用 "- " 列出，备注用 "> " 标注
- 适合 15-20 分钟演讲`;
  } else if (format === "pdf") {
    userMsg = `请生成一份关于「${topic}」的专业研究报告，用${langLabel}。
关键词：${keywords.join("、") || topic}
要求：
- 执行摘要（200字）
- 市场规模与增长趋势
- 主要参与者分析
- 技术/产品趋势
- 风险与机遇
- 结论与建议
- 总计 2000-3000 字，Markdown 格式`;
  } else if (format === "chart") {
    userMsg = `请为「${topic}」生成数据分析报告，用${langLabel}。
关键词：${keywords.join("、") || topic}
要求：
- 输出 JSON 格式，包含以下字段：
  - title: 报告标题
  - summary: 200字摘要
  - charts: 数组，每个图表包含 { type: "bar"|"line"|"pie", title, data: [{label, value}] }（3-4个图表）
  - insights: 3-5条关键洞察
- 数据可以是合理估算，需注明数据来源说明`;
  }

  const resp = await invokeLLM({
    messages: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
  });
  const content = (resp.choices?.[0]?.message?.content as string) ?? "";
  const title = `${role.name} · ${topic} · ${format.toUpperCase()}`;
  return { format, title, content };
}

// ─── RSS Digest Sender ───────────────────────────────────────────────────────
/**
 * 替身 RSS 情报推送：
 * 1. 读取替身最近 48 小时的广场帖子（含评论）
 * 2. 结合订阅者的关注关键词
 * 3. 用 LLM 生成个性化情报摘要文档
 * 4. 通过 notifyOwner 发送给订阅者（当前用平台通知，后续可接邮件 API）
 */
export async function sendRssDigestForStand(agentRoleId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get the stand info
  const [role] = await db.select().from(agentRoles).where(eq(agentRoles.id, agentRoleId)).limit(1);
  if (!role) return;

  // Get active subscriptions for this stand
  const subs = await db.select().from(standSubscriptions)
    .where(and(eq(standSubscriptions.agentRoleId, agentRoleId), eq(standSubscriptions.isActive, true)));
  if (subs.length === 0) return;

  // Get recent posts from the stand (last 48 hours)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentPosts = await db.select({
    id: agentPosts.id,
    title: agentPosts.title,
    content: agentPosts.content,
    postType: agentPosts.postType,
    tags: agentPosts.tags,
    createdAt: agentPosts.createdAt,
  }).from(agentPosts)
    .where(eq(agentPosts.agentRoleId, agentRoleId))
    .orderBy(agentPosts.createdAt)
    .limit(20);

  if (recentPosts.length === 0) return;

  const { invokeLLM } = await import("./_core/llm.js");
  const { notifyOwner } = await import("./_core/notification.js");

  // Generate digest for each subscriber based on their keywords
  for (const sub of subs) {
    const keywords = Array.isArray(sub.keywords) ? sub.keywords as string[] : [];
    const specialty = Array.isArray(role.expertise) ? (role.expertise as string[]).join("、") : "行业";

    // Filter posts relevant to subscriber keywords
    const relevantPosts = keywords.length > 0
      ? recentPosts.filter(p => {
          const text = `${p.title ?? ""} ${p.content} ${JSON.stringify(p.tags ?? [])}`.toLowerCase();
          return keywords.some(k => text.includes(k.toLowerCase()));
        })
      : recentPosts;

    const postsToSummarize = relevantPosts.length > 0 ? relevantPosts : recentPosts.slice(0, 5);

    const postsText = postsToSummarize.map(p =>
      `【${p.postType}】${p.title ? p.title + "\n" : ""}${p.content}\n标签: ${JSON.stringify(p.tags ?? [])}`
    ).join("\n\n---\n\n");

    const systemMsg = `你是 ${role.name}，${specialty} 领域的专家替身。你需要为订阅者生成个性化情报摘要。`;
    const userMsg = `以下是我最近 48 小时在替身广场发布的内容：

${postsText}

订阅者关注的关键词：${keywords.length > 0 ? keywords.join("、") : "全部内容"}

请生成一份简洁的情报摘要，格式如下：
1. 【核心要点】3-5 条最重要的信息（每条 1-2 句）
2. 【深度分析】针对订阅者关注方向的 200-300 字分析
3. 【行动建议】2-3 条具体可操作的建议

语言：中文，专业但易读。`;

    try {
      const resp = await invokeLLM({
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg },
        ],
      });
      const digestContent = (resp.choices?.[0]?.message?.content as string) ?? "";
      const title = `${role.name} · 情报摘要 · ${new Date().toLocaleDateString("zh-CN")}`;

      // Send notification (platform notification for now, email API can be added later)
      await notifyOwner({
        title: `📡 ${title}`,
        content: `**订阅者邮箱**: ${sub.email}\n**关注关键词**: ${keywords.join("、") || "全部"}\n\n${digestContent}`,
      });

      // Update lastSentAt
      await db.update(standSubscriptions)
        .set({ lastSentAt: new Date() } as any)
        .where(eq(standSubscriptions.id, sub.id));

    } catch (err) {
      console.error(`[RSS] Failed to send digest to ${sub.email}:`, err);
    }
  }
}

/**
 * Run RSS digests for all stands with active subscriptions
 * Called by the scheduler daily
 */
export async function runAllRssDigests(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const activeSubs = await db.select({ agentRoleId: standSubscriptions.agentRoleId })
    .from(standSubscriptions)
    .where(eq(standSubscriptions.isActive, true));
  const seen = new Set<number>();
  const uniqueRoleIds: number[] = [];
  for (const s of activeSubs) {
    if (!seen.has(s.agentRoleId)) { seen.add(s.agentRoleId); uniqueRoleIds.push(s.agentRoleId); }
  }
  console.log(`[RSS] Running digests for ${uniqueRoleIds.length} stands...`);
  for (const roleId of uniqueRoleIds) {
    await sendRssDigestForStand(roleId);
  }
  console.log(`[RSS] All digests sent.`);
}


// ─── Auto-Translation Helpers ─────────────────────────────────────────────────

/**
 * Auto-translate an article to English and Japanese after approval.
 * Runs in the background (non-blocking).
 */
async function autoTranslateArticle(articleId: number, article: { titleZh?: string | null; summaryZh?: string | null; contentZh?: string | null; titleEn?: string | null; contentEn?: string | null; titleJa?: string | null; contentJa?: string | null }): Promise<void> {
  const needsEn = !article.titleEn || !article.contentEn;
  const needsJa = !article.titleJa || !article.contentJa;
  if (!needsEn && !needsJa) return; // Already translated

  const sourceTitle = article.titleZh ?? "";
  const sourceSummary = article.summaryZh ?? "";
  const sourceContent = (article.contentZh ?? "").slice(0, 6000); // Limit to avoid token overflow

  try {
    if (needsEn) {
      const enResp = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a professional semiconductor industry translator. Translate the following Chinese article into natural, professional English. Return JSON with keys: title, summary, content.`,
          },
          {
            role: "user",
            content: `Title: ${sourceTitle}\nSummary: ${sourceSummary}\nContent:\n${sourceContent}`,
          },
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
      const enResult = JSON.parse(enResp.choices[0]?.message?.content as string ?? "{}");
      await updateArticle(articleId, {
        titleEn: enResult.title ?? undefined,
        summaryEn: enResult.summary ?? undefined,
        contentEn: enResult.content ?? undefined,
      });
      console.log(`[Translation] Article ${articleId} English translation done.`);
    }

    if (needsJa) {
      const jaResp = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `あなたは半導体業界の専門翻訳者です。以下の中国語記事を自然で専門的な日本語に翻訳してください。JSONで返してください。キー: title, summary, content。`,
          },
          {
            role: "user",
            content: `Title: ${sourceTitle}\nSummary: ${sourceSummary}\nContent:\n${sourceContent}`,
          },
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
      const jaResult = JSON.parse(jaResp.choices[0]?.message?.content as string ?? "{}");
      await updateArticle(articleId, {
        titleJa: jaResult.title ?? undefined,
        summaryJa: jaResult.summary ?? undefined,
        contentJa: jaResult.content ?? undefined,
      });
      console.log(`[Translation] Article ${articleId} Japanese translation done.`);
    }
  } catch (err) {
    console.error(`[Translation] Failed to translate article ${articleId}:`, err);
  }
}

/**
 * Auto-translate an agent post to English and Japanese after publishing.
 * Runs in the background (non-blocking).
 */
export async function autoTranslateAgentPost(postId: number, content: string, title?: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const enResp = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a semiconductor industry translator. Translate the following Chinese text to English. Return JSON with keys: title (if applicable), content.`,
        },
        {
          role: "user",
          content: `${title ? `Title: ${title}\n` : ""}Content: ${content.slice(0, 2000)}`,
        },
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
              content: { type: "string" },
            },
            required: ["title", "content"],
            additionalProperties: false,
          },
        },
      },
    });
    const enResult = JSON.parse(enResp.choices[0]?.message?.content as string ?? "{}");

    const jaResp = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは半導体業界の翻訳者です。以下の中国語テキストを日本語に翻訳してください。JSONで返してください。キー: title, content。`,
        },
        {
          role: "user",
          content: `${title ? `Title: ${title}\n` : ""}Content: ${content.slice(0, 2000)}`,
        },
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
              content: { type: "string" },
            },
            required: ["title", "content"],
            additionalProperties: false,
          },
        },
      },
    });
    const jaResult = JSON.parse(jaResp.choices[0]?.message?.content as string ?? "{}");

    await db.update(agentPosts)
      .set({
        contentEn: enResult.content ?? null,
        contentJa: jaResult.content ?? null,
      } as any)
      .where(eq(agentPosts.id, postId));

    console.log(`[Translation] AgentPost ${postId} translations done.`);
  } catch (err) {
    console.error(`[Translation] Failed to translate agentPost ${postId}:`, err);
  }
}
