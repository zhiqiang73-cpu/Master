import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, BookOpen, Target, Users, User,
  Star, Clock, CheckCircle, AlertCircle, Plus,
  DollarSign, ChevronRight, Lock, Unlock
} from "lucide-react";
import { getLoginUrl } from "@/const";
import AvatarUpload from "@/components/AvatarUpload";

const BOUNTY_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open: { label: "待接单", cls: "bg-blue-100 text-blue-700" },
  accepted: { label: "进行中", cls: "bg-amber-100 text-amber-700" },
  submitted: { label: "待确认", cls: "bg-violet-100 text-violet-700" },
  completed: { label: "已完成", cls: "bg-emerald-100 text-emerald-700" },
  disputed: { label: "争议中", cls: "bg-red-100 text-red-700" },
};

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [showCreateBounty, setShowCreateBounty] = useState(false);
  const [bountyForm, setBountyForm] = useState({ titleZh: "", descriptionZh: "", amount: 200 });
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.member.dashboard.useQuery(undefined, { enabled: isAuthenticated });

  const createBountyMutation = trpc.bounties.create.useMutation({
    onSuccess: () => {
      toast.success("悬赏发布成功！");
      setShowCreateBounty(false);
      setBountyForm({ titleZh: "", descriptionZh: "", amount: 200 });
      utils.member.dashboard.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const completeBountyMutation = trpc.bounties.complete.useMutation({
    onSuccess: () => { toast.success("已确认完成！"); utils.member.dashboard.invalidate(); },
    onError: e => toast.error(e.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2 font-medium">请先登录</p>
          <p className="text-sm text-muted-foreground/60 mb-6">登录后可查看订阅、已购文章和悬赏记录</p>
          <Button
            className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
            onClick={() => window.location.href = getLoginUrl()}
          >
            立即登录
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const subscriptions = data?.subscriptions ?? [];
  const purchases = data?.purchases ?? [];
  const bounties = data?.bounties ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--patina)]/20 to-[var(--patina)]/5 border-2 border-[var(--patina)]/20 flex items-center justify-center text-xl font-bold text-[var(--patina)]">
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{user?.name ?? "用户"}</h1>
                <Badge variant="secondary" className="text-xs capitalize">{user?.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email ?? ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: <Users className="w-4 h-4" />, label: "已订阅 Master", value: subscriptions.length },
              { icon: <BookOpen className="w-4 h-4" />, label: "已购文章", value: purchases.length },
              { icon: <Target className="w-4 h-4" />, label: "发起悬赏", value: bounties.length },
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
        </div>
      </section>

      <main className="container flex-1 py-8">
        <Tabs defaultValue="subscriptions">
          <TabsList className="mb-6">
            <TabsTrigger value="subscriptions" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              我的订阅
              {subscriptions.length > 0 && (
                <span className="font-numeric text-xs bg-[var(--patina)]/10 text-[var(--patina)] px-1.5 rounded-full">{subscriptions.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              已购文章
              {purchases.length > 0 && (
                <span className="font-numeric text-xs bg-[var(--patina)]/10 text-[var(--patina)] px-1.5 rounded-full">{purchases.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="bounties" className="gap-1.5">
              <Target className="w-3.5 h-3.5" />
              我的悬赏
              {bounties.length > 0 && (
                <span className="font-numeric text-xs bg-[var(--patina)]/10 text-[var(--patina)] px-1.5 rounded-full">{bounties.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="w-3.5 h-3.5" />
              个人资料
            </TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium mb-1">还没有订阅任何 Master</p>
                <p className="text-sm text-muted-foreground/60 mb-5">前往订阅页面，找到您感兴趣的行业专家</p>
                <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                  <Link href="/subscribe">浏览 Master</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub, i) => (
                  <motion.div key={sub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="border border-border rounded-lg p-5 bg-card hover:border-[var(--patina)]/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--patina)]/10 flex items-center justify-center text-sm font-bold text-[var(--patina)]">M</div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">Master #{sub.masterId}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground capitalize">{sub.plan} 订阅</span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">到期：{new Date(sub.currentPeriodEnd ?? sub.createdAt).toLocaleDateString("zh-CN")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {new Date(sub.currentPeriodEnd ?? 0) > new Date() ? (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                              <Unlock className="w-3 h-3 mr-1" />有效
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                              <Lock className="w-3 h-3 mr-1" />已过期
                            </Badge>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <Link href="/subscribe">查看 <ChevronRight className="w-3 h-3 ml-1" /></Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium mb-1">还没有购买任何文章</p>
                <p className="text-sm text-muted-foreground/60 mb-5">前往洞察或订阅页面，发现优质内容</p>
                <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                  <Link href="/insights">浏览文章</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {purchases.map((purchase, i) => (
                  <motion.div key={purchase.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="border border-border rounded-lg p-5 bg-card hover:border-[var(--patina)]/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">文章 #{purchase.articleId}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-numeric text-xs font-bold text-[var(--patina)]">¥{purchase.amount}</span>
                            <span className="text-xs text-muted-foreground">· {new Date(purchase.createdAt).toLocaleDateString("zh-CN")}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <Link href="/insights">阅读 <ChevronRight className="w-3 h-3 ml-1" /></Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bounties Tab */}
          <TabsContent value="bounties">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-foreground">我发起的悬赏</h2>
                <p className="text-sm text-muted-foreground mt-0.5">向行业专家提问，获得深度解答</p>
              </div>
              <Button size="sm" className="gap-1.5 text-xs bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white" onClick={() => setShowCreateBounty(true)}>
                <Plus className="w-3.5 h-3.5" />发起悬赏
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : bounties.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl">
                <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium mb-1">还没有发起过悬赏</p>
                <p className="text-sm text-muted-foreground/60 mb-5">有行业问题？发起悬赏，让专家为您解答</p>
                <Button className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5" onClick={() => setShowCreateBounty(true)}>
                  <Plus className="w-4 h-4" />发起悬赏
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bounties.map((bounty, i) => {
                  const statusInfo = BOUNTY_STATUS_MAP[bounty.status] ?? BOUNTY_STATUS_MAP.open;
                  return (
                    <motion.div key={bounty.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <div className="border border-border rounded-lg p-5 bg-card hover:border-[var(--patina)]/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.cls}`}>{statusInfo.label}</span>
                              <span className="font-numeric text-sm font-black text-[var(--patina)]">¥{bounty.amount}</span>
                            </div>
                            <h3 className="font-semibold text-foreground">{bounty.titleZh}</h3>
                            {bounty.descriptionZh && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{bounty.descriptionZh}</p>}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {bounty.deadline ? new Date(bounty.deadline).toLocaleDateString("zh-CN") : "无截止日期"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {bounty.status === "submitted" && (
                              <Button size="sm" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                                onClick={() => completeBountyMutation.mutate({ id: bounty.id, rating: 5 })}
                                disabled={completeBountyMutation.isPending}>
                                {completeBountyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                确认完成
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                              <Link href={`/bounty/${bounty.id}`}>详情 <ChevronRight className="w-3 h-3 ml-1" /></Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="max-w-md space-y-6">
              {/* Avatar Upload */}
              <div>
                <h2 className="font-semibold text-foreground mb-4">头像</h2>
                <AvatarUpload
                  currentUrl={(user as { avatarUrl?: string } | null)?.avatarUrl ?? undefined}
                  name={user?.name ?? undefined}
                  onSuccess={(_url: string) => {
                    toast.success("头像已更新！");
                    window.location.reload();
                  }}
                />
              </div>
              <div>
                <h2 className="font-semibold text-foreground mb-4">个人信息</h2>
                <div className="border border-border rounded-lg p-5 bg-card space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">用户名</p>
                    <p className="text-sm font-medium text-foreground">{user?.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">邮箱</p>
                    <p className="text-sm font-medium text-foreground">{user?.email ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">角色</p>
                    <Badge variant="secondary" className="text-xs capitalize">{user?.role}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">注册时间</p>
                    <p className="text-sm text-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN") : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {user?.role === "user" && (
                <div className="border border-[var(--patina)]/20 rounded-lg p-5 bg-[var(--patina)]/5">
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-[var(--patina)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-1">成为 Master</p>
                      <p className="text-xs text-muted-foreground mb-3">分享您的行业洞察，获得 70-85% 的内容收益分成</p>
                      <Button size="sm" className="h-7 text-xs bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white" asChild>
                        <Link href="/contributor">申请成为 Master →</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Bounty Dialog */}
      <Dialog open={showCreateBounty} onOpenChange={setShowCreateBounty}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--patina)]" />
              发起悬赏
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">问题标题 *</Label>
              <Input placeholder="您想了解什么行业问题？" value={bountyForm.titleZh} onChange={e => setBountyForm(f => ({ ...f, titleZh: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">详细描述</Label>
              <Textarea placeholder="详细描述您的问题背景、期望获得的信息..." rows={4} value={bountyForm.descriptionZh} onChange={e => setBountyForm(f => ({ ...f, descriptionZh: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">悬赏金额（¥）</Label>
              <div className="flex gap-2">
                <Input type="number" min="10" value={bountyForm.amount} onChange={e => setBountyForm(f => ({ ...f, amount: Number(e.target.value) }))} className="h-9" />
                <div className="flex gap-1">
                  {[100, 200, 500].map(amt => (
                    <Button key={amt} type="button" variant="outline" size="sm" className="h-9 text-xs px-2" onClick={() => setBountyForm(f => ({ ...f, amount: amt }))}>¥{amt}</Button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1"><DollarSign className="w-3 h-3 inline mr-0.5" />最低 ¥10，悬赏金额将在 Master 完成后支付</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateBounty(false)}>取消</Button>
              <Button
                className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5"
                onClick={() => createBountyMutation.mutate({ titleZh: bountyForm.titleZh, descriptionZh: bountyForm.descriptionZh || undefined, amount: bountyForm.amount })}
                disabled={createBountyMutation.isPending || !bountyForm.titleZh || bountyForm.amount < 10}
              >
                {createBountyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                发布悬赏
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
