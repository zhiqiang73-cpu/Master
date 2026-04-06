import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  User, Search, Star, BookOpen, Users, ChevronRight,
  Award, TrendingUp, CheckCircle, Sparkles
} from "lucide-react";

const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  2: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  3: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  4: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  5: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
  6: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
  7: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  8: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  9: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  10: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300" },
};

function MasterCardSkeleton() {
  return (
    <div className="border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}

export default function Subscribe() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");

  const { data: masters, isLoading } = trpc.masters.list.useQuery({ limit: 50 });

  const subscribeMutation = trpc.payments.subscribeMaster.useMutation({
    onSuccess: () => toast.success("订阅成功！"),
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const filtered = (masters ?? []).filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.displayName?.toLowerCase().includes(q) ||
      m.bio?.toLowerCase().includes(q) ||
      (m.expertise as string[])?.some(e => e.toLowerCase().includes(q))
    );
  });

  // Separate human masters from AI agents
  const humanMasters = filtered.filter(m => !m.isAiAgent);
  const agentMasters = filtered.filter(m => m.isAiAgent);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="blueprint-grid absolute inset-0 opacity-30" />
        <div className="container relative py-12">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--patina)]/10 border border-[var(--patina)]/30 flex items-center justify-center flex-shrink-0 mt-1">
              <Users className="w-5 h-5 text-[var(--patina)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-[var(--patina)] uppercase tracking-widest">Human Masters</span>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  专家认证
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">订阅行业专家</h1>
              <p className="text-muted-foreground max-w-xl">
                订阅来自半导体行业一线的人工 Master，获取他们的深度洞察、独家判断与行业预测。
                每位 Master 均经过平台严格审核，确保内容质量。
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索专家姓名、专业领域..."
              className="pl-9 h-9 bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <main className="container flex-1 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <MasterCardSkeleton key={i} />)}
          </div>
        ) : humanMasters.length === 0 ? (
          <div className="text-center py-20">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg font-medium">暂无人工 Master</p>
            <p className="text-sm text-muted-foreground/60 mt-2 mb-6">
              我们正在邀请半导体行业专家入驻，敬请期待
            </p>
            <Button asChild variant="outline">
              <Link href="/contributor">申请成为 Master</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Human Masters Grid */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                <Award className="w-4 h-4 text-[var(--patina)]" />
                <h2 className="text-base font-semibold text-foreground">人工专家 Master</h2>
                <span className="font-numeric text-sm font-bold text-muted-foreground">({humanMasters.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {humanMasters.map((master, i) => {
                  const levelColor = LEVEL_COLORS[master.level ?? 1] ?? LEVEL_COLORS[1];
                  const expertise = (master.expertise as string[]) ?? [];

                  return (
                    <motion.div
                      key={master.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.06 }}
                    >
                      <div className="group border border-border rounded-xl p-6 bg-card hover:border-[var(--patina)]/40 hover:shadow-md transition-all h-full flex flex-col">
                        {/* Avatar & Name */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--patina)]/20 to-[var(--patina)]/5 border-2 border-[var(--patina)]/20 flex items-center justify-center text-xl font-bold text-[var(--patina)]">
                              {master.displayName?.charAt(0) ?? "M"}
                            </div>
                            {/* Level badge */}
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${levelColor.bg} ${levelColor.text} border ${levelColor.border} flex items-center justify-center`}>
                              <span className="font-numeric text-xs font-black">{master.level}</span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h3 className="font-bold text-foreground truncate">{master.displayName}</h3>
                              <CheckCircle className="w-3.5 h-3.5 text-[var(--patina)] flex-shrink-0" />
                            </div>
                            {master.levelInfo && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${levelColor.bg} ${levelColor.text} border ${levelColor.border}`}>
                                {master.levelInfo.title}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bio */}
                        {master.bio && (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3 flex-1">
                            {master.bio}
                          </p>
                        )}

                        {/* Expertise Tags */}
                        {expertise.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {expertise.slice(0, 4).map(tag => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-[var(--patina)]/8 text-[var(--patina)] border border-[var(--patina)]/20"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="font-numeric font-bold">{master.articleCount ?? 0}</span> 篇文章
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span className="font-numeric font-bold">{master.subscriberCount ?? 0}</span> 订阅者
                          </span>
                          {master.levelInfo?.revenueShare && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              {master.levelInfo.revenueShare}% 分成
                            </span>
                          )}
                        </div>

                        {/* Pricing */}
                        <div className="border-t border-border pt-4 flex items-center justify-between gap-3">
                          <div className="text-sm">
                            {master.levelInfo?.monthlyPrice && Number(master.levelInfo.monthlyPrice) > 0 ? (
                              <div>
                                <span className="font-numeric text-lg font-black text-foreground">¥{master.levelInfo.monthlyPrice}</span>
                                <span className="text-xs text-muted-foreground">/月</span>
                                {master.levelInfo.yearlyPrice && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ¥{master.levelInfo.yearlyPrice}/年
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-emerald-600 font-medium">免费关注</span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                              <Link href={`/master/${master.alias}`}>
                                主页
                              </Link>
                            </Button>
                            {isAuthenticated ? (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
                                onClick={() => subscribeMutation.mutate({
                                  masterId: master.id,
                                  plan: "monthly",
                                })}
                                disabled={subscribeMutation.isPending}
                              >
                                订阅
                              </Button>
                            ) : (
                              <Button size="sm" className="h-8 text-xs bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white" asChild>
                                <Link href="/login">订阅</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* AI Agent Masters section */}
            {agentMasters.length > 0 && (
              <div className="mt-10 pt-8 border-t border-border">
                <div className="flex items-center gap-2 mb-5">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-muted-foreground">AI 虚拟 Master（洞察频道）</h2>
                  <span className="font-numeric text-sm font-bold text-muted-foreground">({agentMasters.length})</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  AI 虚拟 Master 的内容请前往
                  <Link href="/insights" className="text-[var(--patina)] hover:underline mx-1">洞察频道</Link>
                  查看。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agentMasters.map(master => (
                    <div key={master.id} className="border border-dashed border-border rounded-xl p-5 bg-muted/30 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Star className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{master.displayName}</p>
                        <p className="text-xs text-muted-foreground">AI 虚拟 Master · 自动更新</p>
                      </div>
                      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" asChild>
                        <Link href="/insights">查看洞察 <ChevronRight className="w-3 h-3 ml-1" /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA for becoming a Master */}
        <div className="mt-16 border border-[var(--patina)]/20 rounded-xl p-8 bg-[var(--patina)]/5 text-center">
          <Award className="w-8 h-8 text-[var(--patina)] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">您是半导体行业专家？</h3>
          <p className="text-muted-foreground text-sm mb-5 max-w-md mx-auto">
            加入 Master.AI，分享您的行业洞察，获得 70-85% 的内容收益分成。
          </p>
          <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
            <Link href="/contributor">申请成为 Master →</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
