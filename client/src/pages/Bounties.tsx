import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Target, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open: { label: "开放接单", cls: "bg-green-100 text-green-700" },
  accepted: { label: "已接单", cls: "bg-blue-100 text-blue-700" },
  submitted: { label: "已提交", cls: "bg-yellow-100 text-yellow-700" },
  completed: { label: "已完成", cls: "bg-gray-100 text-gray-600" },
  disputed: { label: "争议中", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "已取消", cls: "bg-gray-100 text-gray-400" },
};

export default function Bounties() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ titleZh: "", descriptionZh: "", amount: "" });
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.bounties.list.useQuery({ status: status || undefined, page, limit: 12 });
  const createMutation = trpc.bounties.create.useMutation({
    onSuccess: () => {
      toast.success("悬赏发布成功！");
      setShowCreate(false);
      setForm({ titleZh: "", descriptionZh: "", amount: "" });
      utils.bounties.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const bounties = data?.bounties ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 12);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">悬赏市场</span>
            <h1 className="font-display text-2xl font-bold mt-1">Bounty Market</h1>
          </div>
          {isAuthenticated && (
            <Button onClick={() => setShowCreate(true)} className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2">
              <Plus className="w-4 h-4" /> 发起悬赏
            </Button>
          )}
        </div>
        <div className="flex gap-1 mb-6 flex-wrap">
          {[{ value: "", label: "全部" }, ...Object.entries(STATUS_MAP).map(([v, s]) => ({ value: v, label: s.label }))].map(s => (
            <Button key={s.value} variant={status === s.value ? "default" : "outline"} size="sm"
              onClick={() => { setStatus(s.value); setPage(1); }}
              className={status === s.value ? "bg-[var(--patina)] text-white hover:bg-[var(--patina-dark)]" : "text-xs"}>
              {s.label}
            </Button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-36 skeleton rounded-lg" />)}
          </div>
        ) : bounties.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bounties.map((b, i) => {
                const s = STATUS_MAP[b.status] ?? STATUS_MAP.open;
                return (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={`/bounty/${b.id}`}>
                      <div className="group p-5 bg-card border border-border rounded-lg hover:border-[var(--patina)]/50 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-sm leading-snug group-hover:text-[var(--patina)] transition-colors line-clamp-2">{b.titleZh}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${s.cls}`}>{s.label}</span>
                        </div>
                        {b.descriptionZh && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{b.descriptionZh}</p>}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(b.createdAt).toLocaleDateString("zh-CN")}</span>
                          <span className="text-[var(--patina)] font-mono font-bold text-sm">${b.amount}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
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
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无悬赏</p>
          </div>
        )}
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>发起悬赏</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs">问题标题 *</Label><Input placeholder="请描述您的问题" value={form.titleZh} onChange={e => setForm(f => ({ ...f, titleZh: e.target.value }))} className="mt-1" /></div>
            <div><Label className="text-xs">详细描述</Label><Textarea placeholder="补充更多背景信息..." value={form.descriptionZh} onChange={e => setForm(f => ({ ...f, descriptionZh: e.target.value }))} className="mt-1" rows={3} /></div>
            <div><Label className="text-xs">悬赏金额 (USD) *</Label><Input type="number" min="10" placeholder="最低 $10" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" /></div>
            <Button className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
              disabled={createMutation.isPending || !form.titleZh || !form.amount}
              onClick={() => createMutation.mutate({ titleZh: form.titleZh, descriptionZh: form.descriptionZh || undefined, amount: Number(form.amount) })}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "发布悬赏"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
