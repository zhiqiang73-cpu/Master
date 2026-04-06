import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Users, Star, TrendingUp, Lock, ArrowRight, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

export default function MasterSub() {
  const { lang } = useI18n();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");

  const { data: mastersData, isLoading } = trpc.masters.list.useQuery({ limit: 50 });
  const { data: articlesData } = trpc.articles.list.useQuery({ limit: 6 });

  const masters = (mastersData ?? []).filter((m: any) => !m.isAiAgent);
  const articles = articlesData?.articles ?? [];

  const filteredMasters = masters.filter((m: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.displayName ?? "").toLowerCase().includes(q) ||
      (m.bio ?? "").toLowerCase().includes(q) ||
      (m.expertise ?? []).some((e: string) => e.toLowerCase().includes(q))
    );
  });

  const handleSubscribe = (masterId: number) => {
    if (!isAuthenticated) {
      toast.info(lang === "en" ? "Please login first" : lang === "ja" ? "ログインしてください" : "请先登录");
      return;
    }
    toast.info(lang === "en" ? "Stripe payment coming soon" : lang === "ja" ? "Stripe決済は近日公開" : "Stripe 支付即将上线");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container py-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-foreground" />
              <h1 className="font-display text-2xl font-bold">
                {lang === "en" ? "Master Subscription" : lang === "ja" ? "Master購読" : "Master 订阅"}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {lang === "en"
                ? "Subscribe to invited semiconductor industry experts for deep analysis, technical insights, and forward-looking perspectives."
                : lang === "ja"
                ? "招待された半導体業界の専門家を購読して、深い分析、技術的洞察、将来展望を入手しましょう。"
                : "订阅受邀的半导体行业专家，获取深度分析、技术洞察和前瞻性观点。"}
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Value props */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: <BookOpen className="w-4 h-4" />,
              title: lang === "en" ? "Deep Analysis" : lang === "ja" ? "深い分析" : "深度分析",
              desc: lang === "en" ? "Long-form articles from frontline experts" : lang === "ja" ? "最前線の専門家による長文記事" : "来自一线专家的长文章",
            },
            {
              icon: <TrendingUp className="w-4 h-4" />,
              title: lang === "en" ? "Revenue Sharing" : lang === "ja" ? "収益分配" : "收益分成",
              desc: lang === "en" ? "Masters earn 70–85% of subscription revenue" : lang === "ja" ? "マスターは購読収益の70〜85%を獲得" : "Master 获得 70-85% 订阅收益",
            },
            {
              icon: <Users className="w-4 h-4" />,
              title: lang === "en" ? "Invite Only" : lang === "ja" ? "招待制" : "邀请制",
              desc: lang === "en" ? "Verified industry practitioners only" : lang === "ja" ? "認証済み業界実務者のみ" : "仅限经过验证的行业从业者",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={lang === "en" ? "Search masters..." : lang === "ja" ? "マスターを検索..." : "搜索 Master..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Masters Grid */}
        <h2 className="font-display text-xl font-bold mb-4">
          {lang === "en" ? "Featured Masters" : lang === "ja" ? "注目のマスター" : "精选 Master"}
        </h2>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filteredMasters.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{lang === "en" ? "No masters found" : lang === "ja" ? "マスターが見つかりません" : "暂无 Master"}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMasters.map((master: any, i: number) => (
              <motion.div
                key={master.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="group hover:border-foreground/30 transition-colors h-full">
                  <CardContent className="p-5">
                    {/* Master header */}
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        {master.avatarUrl && <AvatarImage src={master.avatarUrl} alt={master.displayName} />}
                        <AvatarFallback className="bg-muted text-foreground font-semibold">
                          {master.displayName?.charAt(0) ?? "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <Link href={`/master/${master.alias}`}>
                          <h3 className="font-semibold group-hover:text-[var(--patina)] transition-colors cursor-pointer truncate">
                            {master.displayName}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-muted-foreground">
                            {lang === "en" ? `Level ${master.level}` : lang === "ja" ? `レベル ${master.level}` : `等级 ${master.level}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {lang === "en" ? master.bioEn ?? master.bio : lang === "ja" ? master.bioJa ?? master.bio : master.bio ?? ""}
                    </p>

                    {/* Expertise tags */}
                    {master.expertise && master.expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {master.expertise.slice(0, 3).map((e: string) => (
                          <Badge key={e} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {master.articleCount ?? 0} {lang === "en" ? "articles" : lang === "ja" ? "記事" : "篇"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {master.subscriberCount ?? 0} {lang === "en" ? "subscribers" : lang === "ja" ? "購読者" : "订阅者"}
                      </span>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <span className="font-bold text-sm">
                          {master.levelInfo?.monthlyPrice ?? "¥29"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {lang === "en" ? "/mo" : lang === "ja" ? "/月" : "/月"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          <Link href={`/master/${master.alias}`}>
                            {lang === "en" ? "Profile" : lang === "ja" ? "詳細" : "主页"}
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-foreground text-background hover:bg-foreground/80 gap-1"
                          onClick={() => handleSubscribe(master.id)}
                        >
                          <Lock className="w-3 h-3" />
                          {lang === "en" ? "Subscribe" : lang === "ja" ? "購読" : "订阅"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Recent Articles Preview */}
        {articles.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">
                {lang === "en" ? "Latest Articles" : lang === "ja" ? "最新記事" : "最新文章"}
              </h2>
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/articles">
                  {lang === "en" ? "View All" : lang === "ja" ? "全て見る" : "查看全部"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article: any, i: number) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/article/${article.code}`}>
                    <div className="group p-4 rounded-xl border border-border hover:border-foreground/30 bg-card transition-colors cursor-pointer">
                      {article.isPaid && (
                        <Badge variant="outline" className="text-[10px] mb-2 border-amber-300 text-amber-600">
                          <Lock className="w-2.5 h-2.5 mr-1" />
                          {lang === "en" ? "Premium" : lang === "ja" ? "プレミアム" : "付费"}
                        </Badge>
                      )}
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-[var(--patina)] transition-colors mb-2">
                        {lang === "en" ? article.titleEn ?? article.titleZh : lang === "ja" ? article.titleJa ?? article.titleZh : article.titleZh}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {lang === "en" ? article.summaryEn ?? article.summaryZh : lang === "ja" ? article.summaryJa ?? article.summaryZh : article.summaryZh}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <span>{article.masterName ?? "Master"}</span>
                        <span>·</span>
                        <span>{article.readTimeMinutes ?? 5} min</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Become a Master CTA */}
        <div className="mt-12 p-8 rounded-2xl border border-[var(--patina)]/20 bg-[var(--patina)]/5 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">
            {lang === "en" ? "Are you an industry expert?" : lang === "ja" ? "業界の専門家ですか？" : "您是行业专家吗？"}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            {lang === "en"
              ? "Join as a Master and share your semiconductor expertise. Create your own Stand, publish deep analysis, and earn from subscriptions."
              : lang === "ja"
              ? "マスターとして参加し、半導体の専門知識を共有しましょう。自分の替身を作成し、深い分析を発表し、購読から収益を得ましょう。"
              : "作为 Master 加入，分享您的半导体专业知识。创建您自己的替身，发布深度分析，通过订阅获得收益。"}
          </p>
          <Button asChild size="lg" className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2">
            <Link href="/contributor">
              {lang === "en" ? "Apply to Become a Master" : lang === "ja" ? "マスターに申請" : "申请成为 Master"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
