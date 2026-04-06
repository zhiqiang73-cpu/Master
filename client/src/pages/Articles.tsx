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

const CATEGORIES = [
  { value: "", label: "全部" },
  { value: "industry", label: "行业洞察" },
  { value: "technical", label: "技术深度" },
  { value: "market", label: "市场分析" },
  { value: "policy", label: "政策解读" },
  { value: "other", label: "其他" },
];

export default function Articles() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.articles.list.useQuery({
    category: category || undefined,
    search: search || undefined,
    page,
    limit: 12,
  });

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10">
        <div className="mb-8">
          <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">文章洞察</span>
          <h1 className="font-display text-2xl font-bold mt-1">Articles & Insights</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索文章..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(cat => (
              <Button key={cat.value} variant={category === cat.value ? "default" : "outline"} size="sm"
                onClick={() => { setCategory(cat.value); setPage(1); }}
                className={category === cat.value ? "bg-[var(--patina)] text-white hover:bg-[var(--patina-dark)]" : "text-xs"}>
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
              {articles.map((article, i) => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/article/${article.code}`}>
                    <div className="group p-5 bg-card border border-border rounded-lg hover:border-[var(--patina)]/50 hover:shadow-sm transition-all cursor-pointer h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="article-code">{article.code}</span>
                        {article.isFree && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">免费</Badge>}
                      </div>
                      <h3 className="font-semibold text-sm leading-snug mb-2 group-hover:text-[var(--patina)] transition-colors line-clamp-2 flex-1">{article.titleZh}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{article.summaryZh}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                        <div className="flex items-center gap-3"><span>{article.readCount} 阅读</span><span>{article.purchaseCount} 购买</span></div>
                        {!article.isFree && <span className="text-[var(--patina)] font-mono font-medium">${article.price}</span>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无文章</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
