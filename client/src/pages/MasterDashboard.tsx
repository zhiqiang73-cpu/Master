import { useState } from "react";
import { trpc } from "@/lib/trpc";
import MasterIntelligencePanel from "@/components/MasterIntelligencePanel";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2, Plus, BookOpen, DollarSign, Users, Send,
  Eye, CheckCircle, Clock, Award,
  TrendingUp, FileText, Zap, ChevronRight, Star,
  AlertCircle, RefreshCw, Edit3, Bot
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "bg-gray-100 text-gray-600" },
  pending: { label: "审核中", cls: "bg-yellow-100 text-yellow-700" },
  published: { label: "已发布", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已拒绝", cls: "bg-red-100 text-red-700" },
};

const BOUNTY_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open: { label: "待接单", cls: "bg-blue-100 text-blue-700" },
  accepted: { label: "进行中", cls: "bg-amber-100 text-amber-700" },
  submitted: { label: "已提交", cls: "bg-violet-100 text-violet-700" },
  completed: { label: "已完成", cls: "bg-emerald-100 text-emerald-700" },
  disputed: { label: "争议中", cls: "bg-red-100 text-red-700" },
};

type Category = "industry" | "technical" | "market" | "policy" | "other";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "industry", label: "行业动态" },
  { value: "technical", label: "技术前沿" },
  { value: "policy", label: "政策法规" },
  { value: "market", label: "市场分析" },
  { value: "other", label: "其他" },
];

export default function MasterDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    titleZh: "", summaryZh: "", contentZh: "",
    category: "industry" as Category,
    price: 29.9, isFree: false,
    tags: "",
  });
  const utils = trpc.useUtils();

  const { data: profile, isLoading: profileLoading } = trpc.masters.myProfile.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "master" || user?.role === "admin"),
  });

  const { data: articlesData, isLoading: articlesLoading } = trpc.articles.myArticles.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "master" || user?.role === "admin"),
  });

  const { data: openBounties, isLoading: bountiesLoading } = trpc.bounties.list.useQuery(
    { status: "open", limit: 20 },
    { enabled: isAuthenticated && (user?.role === "master" || user?.role === "admin") }
  );

  const createMutation = trpc.articles.create.useMutation({
    onSuccess: () => {
      toast.success("草稿已保存！");
      setShowCreate(false);
      resetForm();
      utils.articles.myArticles.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const submitMutation = trpc.articles.submitForReview.useMutation({
    onSuccess: () => { toast.success("已提交审核！"); utils.articles.myArticles.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const checkComplianceMutation = trpc.articles.checkCompliance.useMutation({
    onSuccess: (data) => {
      if (data.passed) toast.success(`合规检测通过！评分：${data.score}`);
      else toast.error(`合规检测未通过：${data.issues?.join("、")}`);
    },
    onError: e => toast.error(e.message),
  });

  const acceptBountyMutation = trpc.bounties.accept.useMutation({
    onSuccess: () => { toast.success("已接单！请撰写对应文章后提交。"); utils.bounties.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  function resetForm() {
    setForm({ titleZh: "", summaryZh: "", contentZh: "", category: "industry", price: 29.9, isFree: false, tags: "" });
  }

  if (!isAuthenticated || (user?.role !== "master" && user?.role !== "admin")) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Award className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2 font-medium">需要 Master 权限</p>
          <p className="text-sm text-muted-foreground/60 mb-6">请先申请成为 Master 或联系管理员</p>
          <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
            <Link href="/contributor">申请成为 Master</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const articles = articlesData?.articles ?? [];
  const revenue = (profile as { revenue?: { totalRevenue?: string } } | undefined)?.revenue;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-card">
        <div className="container py-8">
          {profileLoading ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ) : profile ? (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--patina)]/20 to-[var(--patina)]/5 border-2 border-[var(--patina)]/30 flex items-center justify-center text-xl font-bold text-[var(--patina)]">
                  {profile.displayName?.charAt(0) ?? "M"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground">{profile.displayName}</h1>
                    {profile.isVerified && <CheckCircle className="w-4 h-4 text-[var(--patina)]" />}
                    {profile.levelInfo && (
                      <Badge variant="secondary" className="text-xs">{profile.levelInfo.title}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">@{profile.alias}</p>
                </div>
              </div>
              <Button
                className="gap-1.5 text-sm bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="w-4 h-4" />
                新建文章
              </Button>
            </div>
          ) : null}

          {/* Stats Row */}
          {profile && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {[
                { icon: <FileText className="w-4 h-4" />, label: "文章总数", value: profile.articleCount ?? 0 },
                { icon: <Users className="w-4 h-4" />, label: "订阅者", value: profile.subscriberCount ?? 0 },
                { icon: <DollarSign className="w-4 h-4" />, label: "累计收益", value: `¥${revenue?.totalRevenue ?? "0"}` },
                { icon: <TrendingUp className="w-4 h-4" />, label: "分成比例", value: `${profile.levelInfo?.revenueShare ?? 70}%` },
              ].map(stat => (
                <div key={stat.label} className="border border-border rounded-lg p-4 bg-background">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    {stat.icon}
                    <span className="text-xs">{stat.label}</span>
                  </div>
                  <div className="font-numeric text-2xl font-black text-foreground">{stat.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="container flex-1 py-8">
        <Tabs defaultValue="articles">
          <TabsList className="mb-6">
            <TabsTrigger value="articles" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              我的文章
              {articles.length > 0 && (
                <span className="font-numeric text-xs bg-[var(--patina)]/10 text-[var(--patina)] px-1.5 rounded-full">{articles.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="bounties" className="gap-1.5">
              <Star className="w-3.5 h-3.5" />
              悬赏接单
              {(openBounties?.bounties?.length ?? 0) > 0 && (
                <span className="font-numeric text-xs bg-blue-100 text-blue-700 px-1.5 rounded-full">{openBounties?.bounties?.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5">
              <Award className="w-3.5 h-3.5" />
              个人资料
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              专属情报官
            </TabsTrigger>
          </TabsList>

          {/* Quick links row */}
          <div className="flex flex-wrap gap-2 mb-5">
            <Link href="/master/ai-config">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200">
                🤖 AI Master 配置
              </span>
            </Link>
            <Link href="/master/revenue">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer border border-green-200">
                💰 收入一览
              </span>
            </Link>
            <Link href="/master/contracts">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer border border-amber-200">
                📜 智能合约
              </span>
            </Link>
          </div>

          {/* Articles Tab */}
          <TabsContent value="articles">
            {articlesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium mb-1">还没有文章</p>
                <p className="text-sm text-muted-foreground/60 mb-5">开始撰写您的第一篇行业洞察</p>
                <Button
                  onClick={() => setShowCreate(true)}
                  className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  新建文章
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((article, i) => {
                  const status = STATUS_MAP[article.status] ?? STATUS_MAP.draft;
                  return (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="border border-border rounded-lg p-5 bg-card hover:border-[var(--patina)]/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="article-code">{article.code}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${status.cls}`}>
                                {status.label}
                              </span>
                              {article.isFree ? (
                                <Badge variant="secondary" className="text-xs">免费</Badge>
                              ) : (
                                <span className="text-xs font-semibold text-[var(--patina)]">¥{article.price}</span>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground truncate">{article.titleZh}</h3>
                            {article.summaryZh && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{article.summaryZh}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span className="font-numeric">{article.readCount ?? 0}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                <span className="font-numeric">{article.purchaseCount ?? 0}</span> 次购买
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {article.status === "draft" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => checkComplianceMutation.mutate({ content: article.contentZh ?? article.titleZh ?? "" })}
                                  disabled={checkComplianceMutation.isPending}
                                >
                                  {checkComplianceMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3" />
                                  )}
                                  合规检测
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
                                  onClick={() => submitMutation.mutate({ id: article.id })}
                                  disabled={submitMutation.isPending}
                                >
                                  {submitMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  提交审核
                                </Button>
                              </>
                            )}
                            {article.status === "rejected" && article.adminNote && (
                              <div className="flex items-center gap-1 text-xs text-destructive">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {article.adminNote}
                              </div>
                            )}
                            {article.status === "published" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                <Link href={`/article/${article.code}`}>
                                  查看 <ChevronRight className="w-3 h-3 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Bounties Tab */}
          <TabsContent value="bounties">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">可接单的悬赏</h2>
                <p className="text-sm text-muted-foreground mt-0.5">接受悬赏后，撰写对应文章并提交即可获得悬赏金额</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => utils.bounties.list.invalidate()}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                刷新
              </Button>
            </div>

            {bountiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (openBounties?.bounties?.length ?? 0) === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">暂无待接单的悬赏</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openBounties?.bounties?.map((bounty, i) => (
                  <motion.div
                    key={bounty.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div className="border border-border rounded-lg p-5 bg-card hover:border-[var(--patina)]/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${BOUNTY_STATUS_MAP[bounty.status]?.cls ?? ""}`}>
                              {BOUNTY_STATUS_MAP[bounty.status]?.label ?? bounty.status}
                            </span>
                            <span className="font-numeric text-sm font-black text-[var(--patina)]">¥{bounty.amount}</span>
                          </div>
                          <h3 className="font-semibold text-foreground">{bounty.titleZh}</h3>
                          {bounty.descriptionZh && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{bounty.descriptionZh}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {bounty.deadline ? new Date(bounty.deadline).toLocaleDateString("zh-CN") : "无截止日期"}
                          </div>
                        </div>

                        {bounty.status === "open" && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1 flex-shrink-0"
                            onClick={() => acceptBountyMutation.mutate({ id: bounty.id })}
                            disabled={acceptBountyMutation.isPending}
                          >
                            {acceptBountyMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            接单
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {profile && (
              <div className="max-w-lg space-y-6">
                <div>
                  <h2 className="font-semibold text-foreground mb-4">Master 资料</h2>
                  <div className="space-y-4 border border-border rounded-lg p-5 bg-card">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">别名 (Alias)</p>
                        <p className="font-mono text-sm text-foreground">@{profile.alias}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">等级</p>
                        <p className="font-semibold text-sm text-foreground">
                          Lv.{profile.level} · {profile.levelInfo?.title}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">专业领域</p>
                      <div className="flex flex-wrap gap-1.5">
                        {((profile.expertise as string[]) ?? []).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[var(--patina)]/8 text-[var(--patina)] border border-[var(--patina)]/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">简介</p>
                      <p className="text-sm text-foreground">{profile.bio ?? "暂无简介"}</p>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        编辑资料
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Level Progress */}
                {profile.levelInfo && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">等级进度</h3>
                    <div className="border border-border rounded-lg p-5 bg-card space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">当前等级</span>
                        <span className="font-bold">Lv.{profile.level} {profile.levelInfo.title}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">文章数量</span>
                        <span className="font-numeric font-bold">{profile.articleCount} / {profile.levelInfo.minArticles} 篇</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">订阅者数量</span>
                        <span className="font-numeric font-bold">{profile.subscriberCount} / {profile.levelInfo.minSubscribers}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">收益分成</span>
                        <span className="font-numeric font-bold text-[var(--patina)]">{profile.levelInfo.revenueShare}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Intelligence Officer Tab */}
          <TabsContent value="intelligence">
            <MasterIntelligencePanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Article Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { setShowCreate(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--patina)]" />
              新建文章
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">文章标题（中文）*</Label>
              <Input
                placeholder="请输入文章标题..."
                value={form.titleZh}
                onChange={e => setForm(f => ({ ...f, titleZh: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">摘要（中文）</Label>
              <Textarea
                placeholder="简短描述文章核心内容..."
                rows={2}
                value={form.summaryZh}
                onChange={e => setForm(f => ({ ...f, summaryZh: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">正文（Markdown）*</Label>
              <Textarea
                placeholder="使用 Markdown 格式撰写文章内容..."
                rows={10}
                className="font-mono text-sm"
                value={form.contentZh}
                onChange={e => setForm(f => ({ ...f, contentZh: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">分类</Label>
                <Select
                  value={form.category}
                  onValueChange={v => setForm(f => ({ ...f, category: v as Category }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">定价（¥）</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="29.90"
                    value={form.isFree ? 0 : form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    disabled={form.isFree}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant={form.isFree ? "default" : "outline"}
                    size="sm"
                    className={`h-9 text-xs flex-shrink-0 ${form.isFree ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
                    onClick={() => setForm(f => ({ ...f, isFree: !f.isFree }))}
                  >
                    {form.isFree ? "免费" : "付费"}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">标签（逗号分隔）</Label>
              <Input
                placeholder="先进封装, CoWoS, HBM..."
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                取消
              </Button>
              <Button
                className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5"
                onClick={() => {
                  const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
                  createMutation.mutate({
                    titleZh: form.titleZh,
                    summaryZh: form.summaryZh || undefined,
                    contentZh: form.contentZh,
                    category: form.category,
                    price: form.isFree ? 0 : form.price,
                    isFree: form.isFree,
                    tags,
                  });
                }}
                disabled={createMutation.isPending || !form.titleZh || !form.contentZh}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                保存草稿
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
