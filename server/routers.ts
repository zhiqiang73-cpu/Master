import { COOKIE_NAME } from "@shared/const";
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
import { masters, users, smartContracts, contentModerationLogs, aiMasterConfigs, agentRoles, agentPosts, agentComments, agentTaskLogs } from "../drizzle/schema";
import { storagePut } from "./storage";
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
        personality: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        modelProvider: z.enum(["builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom"]).optional(),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        postTypes: z.array(z.string()).optional(),
        postFrequency: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { modelProvider, ...rest } = input;
        await db.insert(agentRoles).values({
          ...rest,
          modelProvider_role: modelProvider ?? "builtin",
          expertise: rest.expertise ?? [],
          postTypes: rest.postTypes ?? ["news", "report", "flash"],
          createdBy: ctx.user.id,
        } as any);
        return { success: true };
      }),
    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        bio: z.string().optional(),
        personality: z.string().optional(),
        expertise: z.array(z.string()).optional(),
        modelProvider: z.enum(["builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom"]).optional(),
        apiKey: z.string().optional(),
        apiEndpoint: z.string().optional(),
        modelName: z.string().optional(),
        postTypes: z.array(z.string()).optional(),
        postFrequency: z.string().optional(),
        isActive: z.boolean().optional(),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, modelProvider, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (modelProvider) updateData.modelProvider_role = modelProvider;
        await db.update(agentRoles).set(updateData as any).where(eq(agentRoles.id, id));
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
          role: { id: agentRoles.id, name: agentRoles.name, alias: agentRoles.alias, avatarEmoji: agentRoles.avatarEmoji, avatarColor: agentRoles.avatarColor },
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
          role: { id: agentRoles.id, name: agentRoles.name, alias: agentRoles.alias, avatarEmoji: agentRoles.avatarEmoji, avatarColor: agentRoles.avatarColor },
        }).from(agentPosts)
          .leftJoin(agentRoles, eq(agentPosts.agentRoleId, agentRoles.id))
          .where(eq(agentPosts.id, input.id)).limit(1);
        if (!rows[0]) return null;
        const comments = await db.select().from(agentComments)
          .where(eq(agentComments.postId, input.id))
          .orderBy(agentComments.createdAt);
        return { ...rows[0], comments };
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
        modelProvider: z.enum(["builtin", "qwen", "glm", "minimax", "openai", "anthropic", "custom"]).optional(),
        apiKey: z.string().optional(),
        systemPrompt: z.string().optional(),
        avatarEmoji: z.string().optional(),
        avatarColor: z.string().optional(),
        generateJojoAvatar: z.boolean().optional(),
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
    // Admin: list task logs
    taskLogs: adminProcedure
      .input(z.object({ agentRoleId: z.number().optional(), limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(agentTaskLogs).orderBy(agentTaskLogs.createdAt).limit(input?.limit ?? 50);
      }),
  }),
});
// ─── Forum Agent Runner ───────────────────────────────────────────────────────
async function runForumAgentAsync(
  role: { id: number; name: string; personality: string | null; expertise: unknown; modelProvider_role: string; apiKey: string | null; modelName: string | null },
  postType: string,
  topic: string,
  lang: string
) {
  const db = await getDb();
  if (!db) return;
  const expertiseArr = Array.isArray(role.expertise) ? role.expertise : [];
  const typeLabels: Record<string, string> = { news: "新闻速递", report: "深度报告", flash: "短消息", discussion: "观点讨论", analysis: "数据分析" };
  const systemPrompt = role.personality ||
    `你是 ${role.name}，一位半导体行业专家，专长：${expertiseArr.join("、")}。你在一个行业论坛上发帖，风格专业但不失个性。`;
  const topicHint = topic ? `主题：${topic}` : `请自选一个当前半导体行业的热点话题`;
  const typeGuide = postType === "flash"
    ? "请写一条100-200字的短消息，类似推特，直接表达观点，可以带话题标签。"
    : postType === "report"
    ? "请写一篇500-1000字的深度报告，有标题、分析和结论。"
    : postType === "news"
    ? "请写一条200-400字的行业新闻，有标题、事件概述和影响分析。"
    : "请写一篇300-600字的观点文章，有标题和论点。";
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${topicHint}\n\n${typeGuide}\n\n请以JSON格式返回：{"title": "标题（flash类型可为null）", "content": "正文", "summary": "摘要（50字以内）", "tags": ["标签1", "标签2"]}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "forum_post", strict: true, schema: { type: "object", properties: { title: { type: ["string", "null"] }, content: { type: "string" }, summary: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, required: ["title", "content", "summary", "tags"], additionalProperties: false } } },
  });
  const raw = response?.choices?.[0]?.message?.content;
  if (!raw) return;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  await db.insert(agentPosts).values({
    agentRoleId: role.id,
    postType: postType as any,
    title: parsed.title,
    content: parsed.content,
    summary: parsed.summary,
    tags: parsed.tags,
    postStatus: "published",
  } as any);
  await db.update(agentRoles).set({ totalPosts: agentRoles.totalPosts, lastPostedAt: new Date() } as any).where(eq(agentRoles.id, role.id));
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
