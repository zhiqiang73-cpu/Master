import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, BookOpen, DollarSign, Users, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "bg-gray-100 text-gray-600" },
  pending: { label: "审核中", cls: "bg-yellow-100 text-yellow-700" },
  published: { label: "已发布", cls: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", cls: "bg-red-100 text-red-700" },
};

export default function MasterDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ titleZh: "", summaryZh: "", contentZh: "", category: "industry" as const, price: "10", isFree: false });
  const utils = trpc.useUtils();

  const { data: profile, isLoading: profileLoading } = trpc.masters.myProfile.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "master" || user?.role === "admin"),
  });
  const { data: articlesData, isLoading: articlesLoading } = trpc.articles.myArticles.useQuery(undefined, {
    enabled: isAuthenticated && (user?.role === "master" || user?.role === "admin"),
  });

  const createMutation = trpc.articles.create.useMutation({
    onSuccess: () => { toast.success("草稿已保存！"); setShowCreate(false); utils.articles.myArticles.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const submitMutation = trpc.articles.submitForReview.useMutation({
    onSuccess: () => { toast.success("已提交审核！"); utils.articles.myArticles.invalidate(); },
    onError: e => toast.error(e.message),
  });

  if (!isAuthenticated || (user?.role !== "master" && user?.role !== "admin")) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">需要 Master 权限</p>
        <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
          <Link href="/login">登录</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">Master 面板</span>
            <h1 className="font-display text-2xl font-bold mt-1">{profile?.displayName ?? "Master Dashboard"}</h1>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2">
            <Plus className="w-4 h-4" /> 写文章
          </Button>
        </div>

        {!profileLoading && profile && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-5 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-[var(--patina)]" /><span className="text-sm font-medium">文章数</span></div>
              <div className="text-2xl font-bold text-[var(--patina)]">{profile.articleCount}</div>
            </div>
            <div className="p-5 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-[var(--patina)]" /><span className="text-sm font-medium">订阅者</span></div>
              <div className="text-2xl font-bold text-[var(--patina)]">{profile.subscriberCount}</div>
            </div>
            <div className="p-5 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4 text-[var(--patina)]" /><span className="text-sm font-medium">总收入</span></div>
              <div className="text-2xl font-bold text-[var(--patina)]">${profile.revenue.total.toFixed(2)}</div>
            </div>
          </div>
        )}

        <h2 className="font-semibold text-sm mb-4">我的文章</h2>
        {articlesLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[var(--patina)]" /></div>
        ) : (
          <div className="space-y-3">
            {(articlesData?.articles ?? []).map(a => {
              const s = STATUS_MAP[a.status] ?? STATUS_MAP.draft;
              return (
                <div key={a.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="article-code">{a.code}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{a.titleZh}</p>
                  </div>
                  {a.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => submitMutation.mutate({ id: a.id })} disabled={submitMutation.isPending} className="ml-3 gap-1 text-xs">
                      <Send className="w-3 h-3" /> 提交审核
                    </Button>
                  )}
                </div>
              );
            })}
            {(articlesData?.articles ?? []).length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">暂无文章，点击「写文章」开始创作</div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>新建文章草稿</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">分类 *</Label>
                <Select value={form.category} onValueChange={(v: any) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industry">行业洞察</SelectItem>
                    <SelectItem value="technical">技术深度</SelectItem>
                    <SelectItem value="market">市场分析</SelectItem>
                    <SelectItem value="policy">政策解读</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">价格 (USD)</Label>
                <Input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div><Label className="text-xs">标题 *</Label><Input placeholder="文章标题" value={form.titleZh} onChange={e => setForm(f => ({ ...f, titleZh: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-xs">摘要</Label><Textarea placeholder="简短描述文章核心内容" value={form.summaryZh} onChange={e => setForm(f => ({ ...f, summaryZh: e.target.value }))} className="mt-1" rows={2} /></div>
            <div><Label className="text-xs">正文 (Markdown)</Label><Textarea placeholder="在此输入文章正文，支持 Markdown 格式..." value={form.contentZh} onChange={e => setForm(f => ({ ...f, contentZh: e.target.value }))} className="mt-1 font-mono text-xs" rows={10} /></div>
          </div>
          <Button className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
            disabled={createMutation.isPending || !form.titleZh}
            onClick={() => createMutation.mutate({ ...form, price: Number(form.price) })}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存草稿"}
          </Button>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
