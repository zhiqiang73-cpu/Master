import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmailSubscribeBox from "@/components/EmailSubscribeBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, Search, Clock, Eye, Zap, TrendingUp,
  ChevronRight, RefreshCw, Filter
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "全部", labelEn: "All" },
  { value: "industry", label: "行业动态", labelEn: "Industry" },
  { value: "technical", label: "技术前沿", labelEn: "Technical" },
  { value: "policy", label: "政策法规", labelEn: "Policy" },
  { value: "market", label: "市场分析", labelEn: "Market" },
];

const TAG_COLORS: Record<string, string> = {
  "先进封装": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "CoWoS": "bg-teal-50 text-teal-700 border-teal-200",
  "HBM": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "EUV": "bg-violet-50 text-violet-700 border-violet-200",
  "ASML": "bg-blue-50 text-blue-700 border-blue-200",
  "Chiplet": "bg-orange-50 text-orange-700 border-orange-200",
  "AI芯片": "bg-rose-50 text-rose-700 border-rose-200",
};

function ArticleCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function Insights() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, refetch, isFetching } = trpc.articles.list.useQuery(
    {
      category: category === "all" ? undefined : category,
      search: search || undefined,
      limit: 20,
    },
    { staleTime: 30_000 }
  );

  const articles = data?.articles ?? [];

  // Featured article (most read)
  const featured = useMemo(() => {
    if (!articles.length) return null;
    return [...articles].sort((a, b) => (b.readCount ?? 0) - (a.readCount ?? 0))[0];
  }, [articles]);

  const rest = articles.filter(a => a.id !== featured?.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="blueprint-grid absolute inset-0 opacity-40" />
        <div className="container relative py-12">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--patina)]/10 border border-[var(--patina)]/30 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-5 h-5 text-[var(--patina)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[var(--patina)] uppercase tracking-widest">AI Agent Powered</span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  实时更新
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">半导体行业洞察</h1>
              <p className="text-muted-foreground max-w-xl">
                由 AI Agent 虚拟 Master 全网收集整理，每日更新半导体行业最新动态、技术前沿与市场分析。
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索文章、关键词..."
                className="pl-9 h-9 bg-background"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setSearch(searchInput)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="mt-4 flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  category === cat.value
                    ? "bg-[var(--patina)] text-white border-[var(--patina)]"
                    : "bg-background text-muted-foreground border-border hover:border-[var(--patina)]/40 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="container flex-1 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ArticleCardSkeleton />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => <ArticleCardSkeleton key={i} />)}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无洞察文章</p>
            <p className="text-sm text-muted-foreground/60 mt-1">AI Agent 正在收集整理最新资料...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Featured Article */}
            <div className="lg:col-span-2">
              {featured && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Link href={`/article/${featured.code}`}>
                    <div className="group relative border border-border rounded-xl p-7 bg-card hover:border-[var(--patina)]/40 hover:shadow-md transition-all cursor-pointer overflow-hidden">
                      {/* Background decoration */}
                      <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
                        <svg viewBox="0 0 200 200" className="w-full h-full text-[var(--patina)]">
                          <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                          <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="1" />
                          <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="0.5" />
                        </svg>
                      </div>

                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="article-code">{featured.code}</span>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <TrendingUp className="w-3 h-3" />
                            热门
                          </Badge>
                          {featured.isFree && (
                            <Badge className="text-xs bg-emerald-500 text-white">免费</Badge>
                          )}
                        </div>

                        <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-[var(--patina)] transition-colors leading-snug">
                          {featured.titleZh}
                        </h2>

                        {featured.summaryZh && (
                          <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
                            {featured.summaryZh}
                          </p>
                        )}

                        {/* Tags */}
                        {featured.tags && featured.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {(featured.tags as string[]).slice(0, 4).map(tag => (
                              <span
                                key={tag}
                                className={`text-xs px-2 py-0.5 rounded border ${TAG_COLORS[tag] ?? "bg-muted text-muted-foreground border-border"}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="font-numeric">{(featured.readCount ?? 0).toLocaleString()}</span>
                            </span>
                            {!featured.isFree && (
                              <span className="flex items-center gap-1 text-[var(--patina)] font-semibold">
                                ¥{featured.price}
                              </span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-xs text-[var(--patina)] group-hover:gap-2 transition-all">
                            阅读全文 <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Stats Bar */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: "今日更新", value: articles.length, icon: <Zap className="w-4 h-4" /> },
                  { label: "总阅读量", value: articles.reduce((s, a) => s + (a.readCount ?? 0), 0), icon: <Eye className="w-4 h-4" /> },
                  { label: "覆盖标签", value: new Set(articles.flatMap(a => (a.tags as string[]) ?? [])).size, icon: <Filter className="w-4 h-4" /> },
                ].map(stat => (
                  <div key={stat.label} className="border border-border rounded-lg p-4 bg-card text-center">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                      {stat.icon}
                      <span className="text-xs">{stat.label}</span>
                    </div>
                    <div className="font-numeric text-2xl font-black text-foreground">
                      {stat.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Article List Sidebar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">最新洞察</span>
              </div>

              {rest.slice(0, 8).map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Link href={`/article/${article.code}`}>
                    <div className="group border border-border rounded-lg p-4 bg-card hover:border-[var(--patina)]/40 hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="article-code text-xs">{article.code}</span>
                        {article.isFree ? (
                          <Badge variant="secondary" className="text-xs shrink-0">免费</Badge>
                        ) : (
                          <span className="text-xs font-semibold text-[var(--patina)] shrink-0">¥{article.price}</span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-foreground group-hover:text-[var(--patina)] transition-colors line-clamp-2 leading-snug mb-2">
                        {article.titleZh}
                      </h3>

                      {article.tags && (article.tags as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(article.tags as string[]).slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span className="font-numeric">{(article.readCount ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {rest.length > 8 && (
                <Button variant="outline" className="w-full text-sm" asChild>
                  <Link href="/articles">查看全部洞察 →</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Newsletter strip */}
      <section className="py-12 bg-[var(--patina)]/5 border-t border-[var(--patina)]/10">
        <div className="container max-w-2xl">
          <EmailSubscribeBox
            variant="inline"
            title="订阅洞察周报"
            description="每周收到半导体行业最新动态和深度分析，免费发送至您的邮箱。前3个月全部内容免费开放。"
          />
        </div>
      </section>
      <Footer />
    </div>
  );
}
