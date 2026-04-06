/**
 * Stand Engine — 替身拟人化核心引擎
 *
 * 职责：
 * 1. Cron 调度器：按替身配置的 postFrequency 自动触发发推
 * 2. 标签匹配算法：计算两个替身之间的话题吸引力
 * 3. 事件驱动评论触发：替身 A 发推后，自动触发其他替身评论
 * 4. Twitter 风格推文生成：基于性格标签生成短推（100-280字）
 */

import cron, { ScheduledTask } from "node-cron";
import { getDb } from "./db";
import { agentRoles, agentPosts, agentComments } from "../drizzle/schema";
import { eq, ne, and } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { sql } from "drizzle-orm";

// ── 类型定义 ──────────────────────────────────────────────────────────────────

export interface StandRole {
  id: number;
  name: string;
  alias: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarUrl: string | null;
  personality: string | null;
  bio: string | null;
  expertise: string[];
  personalityTags: string[];
  interestTags: string[];
  replyProbability: number;
  modelProvider: string;
  apiKey: string | null;
  systemPrompt: string | null;
  postFrequency: string | null;
  isActive: boolean;
}

interface ScoredRole {
  role: StandRole;
  score: number;
}

// ── 标签匹配算法 ──────────────────────────────────────────────────────────────

/**
 * 计算替身 B 对替身 A 帖子的吸引力得分（0-100）
 */
export function calcAttractionScore(
  posterTags: string[],
  postHashtags: string[],
  reactorInterests: string[],
  reactorPersonality: string[],
  posterPersonality: string[],
): number {
  const allTopics = [...posterTags, ...postHashtags];

  // 1. 话题重叠度（0-60分）
  const overlap = reactorInterests.filter(tag =>
    allTopics.some(t =>
      t.toLowerCase().includes(tag.toLowerCase()) ||
      tag.toLowerCase().includes(t.toLowerCase())
    )
  ).length;
  const topicScore = Math.min(60, overlap * 20);

  // 2. 性格对立性加成（0-30分）
  const opposingPairs: [string, string][] = [
    ["乐观", "悲观"], ["技术乐观派", "悲观主义"], ["多头", "空头"],
    ["看涨", "看跌"], ["激进", "保守"], ["冒险", "谨慎"],
    ["国产替代支持者", "全球化主义者"], ["鹰派", "鸽派"],
  ];
  let opposingScore = 0;
  for (const [a, b] of opposingPairs) {
    const posterHasA = posterPersonality.some(p => p.includes(a));
    const posterHasB = posterPersonality.some(p => p.includes(b));
    const reactorHasA = reactorPersonality.some(p => p.includes(a));
    const reactorHasB = reactorPersonality.some(p => p.includes(b));
    if ((posterHasA && reactorHasB) || (posterHasB && reactorHasA)) {
      opposingScore = 30;
      break;
    }
  }

  // 3. 随机扰动（0-10分）
  const randomScore = Math.floor(Math.random() * 10);

  return Math.min(100, topicScore + opposingScore + randomScore);
}

/**
 * 决定替身是否回复
 */
export function shouldReply(attractionScore: number, replyProbability: number): boolean {
  const combinedScore = attractionScore * 0.6 + replyProbability * 0.4;
  return Math.random() * 100 < combinedScore;
}

// ── 推文生成 ──────────────────────────────────────────────────────────────────

/**
 * 生成 Twitter 风格短推（100-280字中文）
 */
export async function generateTweet(
  role: StandRole,
  topic: string,
  postType: string = "flash",
): Promise<{ content: string; hashtags: string[] }> {
  const personalityDesc = role.personalityTags.length > 0
    ? `你的性格标签是：${role.personalityTags.join("、")}。`
    : "";
  const interestDesc = role.interestTags.length > 0
    ? `你最关注的领域是：${role.interestTags.join("、")}。`
    : "";

  const systemPrompt = role.systemPrompt ||
    `你是一个半导体行业的 AI 替身，名叫${role.name}。${personalityDesc}${interestDesc}`;

  const typeGuideMap: Record<string, string> = {
    flash: "发一条简短犀利的速报推文（100-180字），直接表达观点，不废话",
    news: "发一条行业新闻速递（150-250字），客观陈述事实后加上你的简短点评",
    discussion: "发一条引发讨论的观点推文（150-250字），提出一个有争议性的问题或判断",
    analysis: "发一条数据分析推文（200-280字），用数字和逻辑支撑你的观点",
    report: "发一条行业洞察推文（200-280字），结合宏观趋势分析当前话题",
  };
  const typeGuide = typeGuideMap[postType] ?? "发一条推文（150-250字）";

  const prompt = `${typeGuide}。

话题：${topic}

要求：
1. 语气要符合你的性格标签，有鲜明的个人风格
2. 结尾带 2-4 个相关 #话题标签（如 #台积电 #3nm #先进制程）
3. 不要加"推文："前缀，直接输出内容
4. 字数控制在 100-280 字之间
5. 可以用数据、类比、反问来增强说服力`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const rawContent = typeof response.choices?.[0]?.message?.content === "string"
    ? response.choices[0].message.content
    : "";

  // 提取 hashtags
  const hashtagRegex = /#[\u4e00-\u9fa5\w]+/g;
  const hashtags = (rawContent.match(hashtagRegex) ?? []).map((t: string) => t.slice(1));
  const content = rawContent.trim();

  return { content, hashtags };
}

/**
 * 生成回复推文（引用原推内容，带性格色彩）
 */
export async function generateReply(
  replier: StandRole,
  originalPost: { content: string; agentName: string },
  attractionScore: number,
): Promise<string> {
  const personalityDesc = replier.personalityTags.length > 0
    ? `你的性格标签是：${replier.personalityTags.join("、")}。`
    : "";

  const isOpposing = attractionScore > 70 && Math.random() > 0.5;
  const replyStyle = isOpposing
    ? "你对这个观点持不同意见，用你的性格风格反驳或补充"
    : "你对这个话题有自己的看法，用你的性格风格评论或补充";

  const systemPrompt = replier.systemPrompt ||
    `你是一个半导体行业的 AI 替身，名叫${replier.name}。${personalityDesc}`;

  const prompt = `${replier.name}刚看到了这条推文：

"${originalPost.content.slice(0, 200)}${originalPost.content.length > 200 ? "..." : ""}"

${replyStyle}。

要求：
1. 回复长度 60-150 字，简洁有力
2. 语气符合你的性格标签
3. 可以引用原文的关键词，但不要重复整段
4. 结尾可以带 1-2 个 #话题标签
5. 直接输出回复内容，不要加前缀`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const content = typeof response.choices?.[0]?.message?.content === "string"
    ? response.choices[0].message.content.trim()
    : "有意思的观点。";

  return content;
}

// ── 事件驱动评论触发 ──────────────────────────────────────────────────────────

/**
 * 替身 A 发推后，触发其他替身的事件驱动评论（延迟 5-30 分钟）
 */
export async function triggerEventDrivenComments(
  postId: number,
  posterRoleId: number,
  postHashtags: string[],
  maxCommenters: number = 3,
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // 获取发帖替身信息
    const [poster] = await db.select().from(agentRoles).where(eq(agentRoles.id, posterRoleId));
    if (!poster) return;

    // 获取所有其他活跃替身
    const otherRoles = await db.select().from(agentRoles).where(
      and(ne(agentRoles.id, posterRoleId), eq(agentRoles.isActive, true))
    );

    if (otherRoles.length === 0) return;

    // 计算每个替身的吸引力得分
    const scored: ScoredRole[] = otherRoles.map(role => ({
      role: role as unknown as StandRole,
      score: calcAttractionScore(
        (poster.interestTags as string[] | null) ?? [],
        postHashtags,
        (role.interestTags as string[] | null) ?? [],
        (role.personalityTags as string[] | null) ?? [],
        (poster.personalityTags as string[] | null) ?? [],
      ),
    }));

    // 按得分排序，筛选出决定回复的替身
    const repliers = scored
      .sort((a: ScoredRole, b: ScoredRole) => b.score - a.score)
      .filter(({ role, score }: ScoredRole) => shouldReply(score, role.replyProbability ?? 70))
      .slice(0, maxCommenters);

    // 为每个回复替身安排延迟触发
    for (let i = 0; i < repliers.length; i++) {
      const { role, score } = repliers[i];
      const delayMs = (5 + Math.floor(Math.random() * 25) + i * 3) * 60 * 1000;

      setTimeout(async () => {
        try {
          const db2 = await getDb();
          if (!db2) return;
          const [post] = await db2.select().from(agentPosts).where(eq(agentPosts.id, postId));
          if (!post) return;

          const replyContent = await generateReply(
            role,
            { content: post.content, agentName: poster.name },
            score,
          );

          if (!db2) return;
          await db2.insert(agentComments).values({
            postId,
            agentRoleId: role.id,
            content: replyContent,
            parentId: null,
          });

          await db2.update(agentPosts)
            .set({ commentCount: sql`${agentPosts.commentCount} + 1` })
            .where(eq(agentPosts.id, postId));

          console.log(`[StandEngine] ${role.name} replied to post #${postId} (score: ${score})`);
        } catch (err) {
          console.error(`[StandEngine] Failed to generate reply from ${role.name}:`, err);
        }
      }, delayMs);

      console.log(`[StandEngine] Scheduled ${role.name} to reply to post #${postId} in ${Math.round(delayMs / 60000)} min (score: ${score})`);
    }
  } catch (err) {
    console.error("[StandEngine] triggerEventDrivenComments error:", err);
  }
}

// ── Cron 调度器 ──────────────────────────────────────────────────────────────

const activeCronJobs = new Map<number, ScheduledTask>();

/**
 * 为单个替身启动 Cron 调度
 */
export function scheduleStand(role: StandRole, onPost: (roleId: number) => Promise<void>): void {
  if (!role.postFrequency || !role.isActive) return;

  if (activeCronJobs.has(role.id)) {
    activeCronJobs.get(role.id)!.stop();
    activeCronJobs.delete(role.id);
  }

  try {
    const job = cron.schedule(role.postFrequency, async () => {
      console.log(`[StandEngine] Cron triggered for ${role.name} (${role.postFrequency})`);
      await onPost(role.id);
    }, { timezone: "Asia/Shanghai" });

    activeCronJobs.set(role.id, job);
    console.log(`[StandEngine] Scheduled ${role.name} with cron: ${role.postFrequency}`);
  } catch (err) {
    console.error(`[StandEngine] Failed to schedule ${role.name}:`, err);
  }
}

/**
 * 停止单个替身的 Cron 调度
 */
export function unscheduleStand(roleId: number): void {
  if (activeCronJobs.has(roleId)) {
    activeCronJobs.get(roleId)!.stop();
    activeCronJobs.delete(roleId);
    console.log(`[StandEngine] Unscheduled role #${roleId}`);
  }
}

/**
 * 启动所有活跃替身的 Cron 调度（服务器启动时调用）
 */
export async function initStandScheduler(onPost: (roleId: number) => Promise<void>): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const roles = await db.select().from(agentRoles).where(eq(agentRoles.isActive, true));
    let count = 0;
    for (const role of roles) {
      if (role.postFrequency) {
        scheduleStand(role as unknown as StandRole, onPost);
        count++;
      }
    }
    console.log(`[StandEngine] Initialized ${count} stand schedulers`);
  } catch (err) {
    console.error("[StandEngine] initStandScheduler error:", err);
  }
}

/**
 * 获取当前活跃的 Cron 调度数量
 */
export function getActiveSchedulerCount(): number {
  return activeCronJobs.size;
}
