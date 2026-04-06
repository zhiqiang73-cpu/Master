/**
 * searchEngine.ts — 替身互联网搜索能力
 *
 * 提供两种搜索方式：
 * 1. DuckDuckGo Instant Answer API（无需 API Key）
 * 2. 半导体行业 RSS 源聚合（EETimes, SemiAnalysis, AnandTech, IC Insights 等）
 */

import { invokeLLM } from "./_core/llm";

// ── 半导体行业 RSS 源 ──────────────────────────────────────────────────────────
const SEMI_RSS_FEEDS = [
  { name: "EETimes", url: "https://www.eetimes.com/feed/", lang: "en" },
  { name: "SemiEngineering", url: "https://semiengineering.com/feed/", lang: "en" },
  { name: "AnandTech", url: "https://www.anandtech.com/rss/news", lang: "en" },
  { name: "TechPowerUp", url: "https://www.techpowerup.com/rss/news.xml", lang: "en" },
  { name: "The Register Chips", url: "https://www.theregister.com/design/chips_hardware/headlines.atom", lang: "en" },
  { name: "Tom's Hardware", url: "https://www.tomshardware.com/feeds/all", lang: "en" },
  { name: "Ars Technica Hardware", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", lang: "en" },
];

// ── 话题搜索词库（按替身兴趣标签映射） ────────────────────────────────────────
const TOPIC_KEYWORDS: Record<string, string[]> = {
  "台积电": ["TSMC", "台积电", "N3", "N2", "CoWoS", "advanced packaging"],
  "英伟达": ["NVIDIA", "H100", "B200", "Blackwell", "GPU", "AI chip"],
  "英特尔": ["Intel", "Gaudi", "18A", "Intel Foundry", "Arrow Lake"],
  "AMD": ["AMD", "MI300", "RDNA", "Zen 5", "Ryzen"],
  "三星": ["Samsung", "HBM", "DRAM", "NAND", "3nm GAA"],
  "存储": ["HBM", "DRAM", "NAND", "memory", "SK Hynix", "Micron"],
  "先进制程": ["2nm", "3nm", "GAA", "FinFET", "EUV", "ASML"],
  "国产替代": ["中芯国际", "SMIC", "华为", "海思", "国产芯片", "自主可控"],
  "AI芯片": ["AI chip", "NPU", "TPU", "inference", "training chip", "LLM chip"],
  "汽车芯片": ["automotive chip", "ADAS", "自动驾驶", "车规级", "Mobileye"],
  "功率半导体": ["SiC", "GaN", "power semiconductor", "碳化硅", "氮化镓"],
  "封装": ["advanced packaging", "chiplet", "3D IC", "HBM", "CoWoS", "SoIC"],
  "设备": ["ASML", "Applied Materials", "Lam Research", "KLA", "光刻机"],
  "供应链": ["supply chain", "geopolitics", "export control", "chip war", "芯片战争"],
};

// ── RSS 解析（轻量，无需 npm 包） ─────────────────────────────────────────────
interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

async function fetchRSS(feedUrl: string, sourceName: string, timeoutMs = 5000): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MasterAI-Bot/1.0)" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();

    // Parse items from RSS/Atom
    const items: NewsItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const block = match[1] || match[2];
      const title = extractTag(block, "title");
      const link = extractTag(block, "link") || extractAttr(block, "link", "href");
      const desc = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content");
      const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated");
      if (title) {
        items.push({
          title: stripHtml(title).slice(0, 200),
          link: link?.trim() ?? "",
          description: stripHtml(desc ?? "").slice(0, 300),
          pubDate: pubDate?.trim() ?? "",
          source: sourceName,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? (m[1] || m[2] || "").trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, "i"));
  return m ? m[1] : "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

// ── DuckDuckGo 搜索 ───────────────────────────────────────────────────────────
async function duckduckgoSearch(query: string, timeoutMs = 5000): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return "";
    const data = await res.json() as any;
    const abstract = data.AbstractText || data.Answer || "";
    const relatedTopics = (data.RelatedTopics ?? [])
      .slice(0, 3)
      .map((t: any) => t.Text || "")
      .filter(Boolean)
      .join(" | ");
    return [abstract, relatedTopics].filter(Boolean).join("\n\n").slice(0, 500);
  } catch {
    return "";
  }
}

// ── 主搜索函数 ────────────────────────────────────────────────────────────────
export interface SearchResult {
  summary: string;
  newsItems: NewsItem[];
  query: string;
}

/**
 * 根据替身的兴趣标签搜索最新行业动态
 */
export async function searchForStand(
  interestTags: string[],
  maxItems = 6,
): Promise<SearchResult> {
  // 1. 确定搜索关键词
  const keywords: string[] = [];
  for (const tag of interestTags) {
    const mapped = TOPIC_KEYWORDS[tag];
    if (mapped) keywords.push(...mapped.slice(0, 2));
    else keywords.push(tag);
  }
  // 去重，取前 4 个
  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 4);
  const query = uniqueKeywords.join(" OR ");

  // 2. 并行抓取 RSS 和 DuckDuckGo
  const [rssResults, ddgSummary] = await Promise.all([
    fetchMultipleRSS(uniqueKeywords, maxItems),
    duckduckgoSearch(uniqueKeywords[0] ?? "semiconductor"),
  ]);

  return {
    summary: ddgSummary,
    newsItems: rssResults,
    query,
  };
}

async function fetchMultipleRSS(keywords: string[], maxItems: number): Promise<NewsItem[]> {
  // 随机选 3 个 RSS 源并行抓取
  const shuffled = [...SEMI_RSS_FEEDS].sort(() => Math.random() - 0.5).slice(0, 3);
  const results = await Promise.all(shuffled.map(f => fetchRSS(f.url, f.name)));
  const allItems = results.flat();

  // 按关键词相关性过滤和排序
  const scored = allItems.map(item => {
    const text = (item.title + " " + item.description).toLowerCase();
    const score = keywords.reduce((acc, kw) => {
      const kwLower = kw.toLowerCase();
      return acc + (text.includes(kwLower) ? 2 : 0) + (item.title.toLowerCase().includes(kwLower) ? 3 : 0);
    }, 0);
    return { item, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map(s => s.item);
}

// ── 基于搜索结果生成帖子 ──────────────────────────────────────────────────────
export interface StandSearchPost {
  content: string;
  title?: string;
  hashtags: string[];
  postType: string;
  sourceUrls: string[];
}

/**
 * 替身搜索互联网后，生成有观点的帖子
 */
export async function generateSearchBasedPost(
  role: {
    name: string;
    personality: string | null;
    personalityTags: string[];
    interestTags: string[];
    systemPrompt: string | null;
    catchphrase?: string | null;
    backgroundStory?: string | null;
    viewpoints?: string[] | null;
  },
  postType: "news" | "flash" | "rant" | "scoop" | "analysis" | "discussion" = "news",
): Promise<StandSearchPost> {
  // 搜索最新动态
  const searchResult = await searchForStand(role.interestTags.length > 0 ? role.interestTags : ["AI芯片", "台积电"]);

  // 构建搜索上下文
  let newsContext = "";
  if (searchResult.newsItems.length > 0) {
    newsContext = "最新行业动态：\n" + searchResult.newsItems
      .slice(0, 4)
      .map((n, i) => `${i + 1}. [${n.source}] ${n.title}${n.description ? "\n   " + n.description.slice(0, 150) : ""}`)
      .join("\n\n");
  }
  if (searchResult.summary) {
    newsContext += "\n\n背景信息：" + searchResult.summary.slice(0, 300);
  }

  // 构建替身人格描述
  const personalityDesc = role.personalityTags.length > 0
    ? `你的性格标签：${role.personalityTags.join("、")}`
    : "";
  const viewpointsDesc = role.viewpoints && role.viewpoints.length > 0
    ? `你的核心观点：${role.viewpoints.slice(0, 3).join("；")}`
    : "";
  const catchphraseDesc = role.catchphrase ? `你的口头禅：${role.catchphrase}` : "";

  const systemPrompt = role.systemPrompt ||
    `你是半导体行业的 AI 替身，名叫${role.name}。${personalityDesc}。${viewpointsDesc}。${catchphraseDesc}`;

  const typeGuideMap: Record<string, string> = {
    news: "基于以下最新动态，写一条行业新闻速递（150-250字），客观陈述后加你的犀利点评",
    flash: "基于以下最新动态，写一条速报推文（80-150字），直接表达你的第一反应，简洁犀利",
    rant: "基于以下最新动态，写一条吐槽推文（100-200字），用你的性格风格表达对某个现象的不满或质疑，可以有点情绪",
    scoop: "基于以下最新动态，写一条独家爆料风格的推文（100-200字），用\"据可靠消息\"\"内部人士透露\"等措辞增加戏剧感",
    analysis: "基于以下最新动态，写一条数据分析推文（200-280字），用逻辑和数字支撑你的判断",
    discussion: "基于以下最新动态，写一条引发讨论的推文（150-250字），提出一个有争议性的问题让大家思考",
  };

  const prompt = `${typeGuideMap[postType] ?? typeGuideMap.news}

${newsContext || "话题：半导体行业最新动态"}

要求：
1. 语气符合你的性格标签，有鲜明个人风格
2. 结尾带 2-4 个 #话题标签（中英文均可）
3. 直接输出内容，不要加前缀
4. 内容要有信息量，不要空洞`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const rawContent = typeof response.choices?.[0]?.message?.content === "string"
    ? response.choices[0].message.content.trim()
    : "行业动态持续关注中。";

  const hashtagRegex = /#[\u4e00-\u9fa5\w]+/g;
  const hashtags = (rawContent.match(hashtagRegex) ?? []).map((t: string) => t.slice(1));

  // 为 news/analysis/report 类型生成标题
  let title: string | undefined;
  if (["news", "analysis", "report"].includes(postType) && searchResult.newsItems.length > 0) {
    title = searchResult.newsItems[0].title.slice(0, 80);
  }

  return {
    content: rawContent,
    title,
    hashtags,
    postType,
    sourceUrls: searchResult.newsItems.slice(0, 3).map(n => n.link).filter(Boolean),
  };
}

/**
 * 随机选择帖子类型（带权重，让广场更多样）
 */
export function randomPostType(): "news" | "flash" | "rant" | "scoop" | "analysis" | "discussion" {
  const types: Array<["news" | "flash" | "rant" | "scoop" | "analysis" | "discussion", number]> = [
    ["flash", 30],
    ["news", 25],
    ["rant", 15],
    ["discussion", 15],
    ["scoop", 10],
    ["analysis", 5],
  ];
  const total = types.reduce((a, [, w]) => a + w, 0);
  let rand = Math.random() * total;
  for (const [type, weight] of types) {
    rand -= weight;
    if (rand <= 0) return type;
  }
  return "flash";
}
