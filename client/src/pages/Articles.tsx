import { useState } from "react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

export default function Articles() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { lang, t } = useI18n();

  const CATEGORIES = [
    { value: "", label: lang === "en" ? "All" : lang === "ja" ? "すべて" : "全部" },
    { value: "industry", label: lang === "en" ? "Industry" : lang === "ja" ? "業界洞察" : "行业洞察" },
    { value: "technical", label: lang === "en" ? "Technical" : lang === "ja" ? "技術深度" : "技术深度" },
    { value: "market", label: lang === "en" ? "Market" : lang === "ja" ? "市場分析" : "市场分析" },
    { value: "policy", label: lang === "en" ? "Policy" : lang === "ja" ? "政策解説" : "政策解读" },
    { value: "other", label: lang === "en" ? "Other" : lang === "ja" ? "その他" : "其他" },
  ];

  const { data, isLoading } = trpc.articles.list.useQuery({
    category: category || undefined,
    search: search || undefined,
    page,
    limit: 12,
  });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  // Language-aware field helpers
  const getTitle = (article: any) => {
    if (lang === "en") return article.titleEn || article.titleZh;
    if (lang === "ja") return article.titleJa || article.titleZh;
    return article.titleZh;
  };

  const getSummary = (article: any) => {
    if (lang === "en") return article.summaryEn || article.summaryZh;
    if (lang === "ja") return article.summaryJa || article.summaryZh;
    return article.summaryZh;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10">
        <div className="mb-8">
          <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">
            {lang === "en" ? "Articles & Insights" : lang === "ja" ? "記事・インサイト" : "文章洞察"}
          </span>
          <h1 className="font-display text-2xl font-bold mt-1">
            {lang === "en" ? "Articles & Insights" : lang === "ja" ? "記事とインサイト" : "文章与洞察"}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={lang === "en" ? "Search articles..." : lang === "ja" ? "記事を検索..." : "搜索文章..."}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(cat => (
              <Button
                key={cat.value}
                variant={category === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => { setCategory(cat.value); setPage(1); }}
                className={category === cat.value ? "bg-[var(--patina)] text-white hover:bg-[var(--patina-dark)]" : "text-xs"}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-52 skeleton rounded-lg" />)}
          </div>
        ) : articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article: any, i: number) => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/article/${article.code}`}>
                    <div className="group p-5 bg-card border border-border rounded-lg hover:border-[var(--patina)]/50 hover:shadow-sm transition-all cursor-pointer h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="article-code">{article.code}</span>
                        {article.isFree && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">
                            {lang === "en" ? "Free" : lang === "ja" ? "無料" : "免费"}
                          </Badge>
                        )}
                        {/* Show language availability dots */}
                        <div className="flex gap-0.5 ml-auto">
                          {article.titleEn && <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" title="English available" />}
                          {article.titleJa && <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" title="日本語あり" />}
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm leading-snug mb-2 group-hover:text-[var(--patina)] transition-colors line-clamp-2 flex-1">
                        {getTitle(article)}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                        {getSummary(article)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                        <div className="flex items-center gap-3">
                          <span>{article.readCount} {lang === "en" ? "reads" : lang === "ja" ? "閲覧" : "阅读"}</span>
                          <span>{article.purchaseCount} {lang === "en" ? "purchases" : lang === "ja" ? "購入" : "购买"}</span>
                        </div>
                        {!article.isFree && <span className="text-[var(--patina)] font-mono font-medium">¥{article.price}</span>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  {lang === "en" ? "Previous" : lang === "ja" ? "前へ" : "上一页"}
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  {lang === "en" ? "Next" : lang === "ja" ? "次へ" : "下一页"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {lang === "en" ? "No articles yet" : lang === "ja" ? "記事がありません" : "暂无文章"}
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
