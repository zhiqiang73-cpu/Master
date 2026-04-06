import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Mail, Search, Users, TrendingUp, UserCheck, UserX,
  Send, RefreshCw, Download, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminSubscribers() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [notifyArticleId, setNotifyArticleId] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");

  const { data: stats } = trpc.newsletter.stats.useQuery();
  const { data, isLoading, refetch } = trpc.newsletter.list.useQuery({
    search: search || undefined,
    page,
    limit: 50,
    isActive: filterActive,
  });

  const notifyMutation = trpc.newsletter.notifyNewArticle.useMutation({
    onSuccess: (res) => {
      toast.success(`已通知 ${res.notifiedCount} 位订阅者：《${res.articleTitle}》`);
      setNotifyArticleId("");
    },
    onError: (err) => toast.error(err.message),
  });

  const broadcastMutation = trpc.newsletter.sendBroadcast.useMutation({
    onSuccess: (res) => {
      toast.success(`广播已发送至 ${res.sentCount} 位订阅者`);
      setBroadcastOpen(false);
      setBroadcastSubject("");
      setBroadcastContent("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const exportCSV = () => {
    if (!data?.subscribers) return;
    const rows = [
      ["邮箱", "状态", "订阅时间"],
      ...data.subscribers.map(s => [
        s.email,
        s.isActive ? "活跃" : "已退订",
        new Date(s.createdAt).toLocaleDateString("zh-CN"),
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">邮件订阅者管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理订阅者列表，发送文章通知和广播邮件</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" />
            导出 CSV
          </Button>
          <Button size="sm" onClick={() => setBroadcastOpen(true)} className="gap-1.5 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
            <Megaphone className="w-4 h-4" />
            发送广播
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "总订阅者", value: stats?.total ?? 0, icon: <Users className="w-5 h-5" />, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "活跃订阅者", value: stats?.active ?? 0, icon: <UserCheck className="w-5 h-5" />, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "本月新增", value: stats?.thisMonth ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: "text-[var(--patina)]", bg: "bg-[var(--patina)]/10" },
        ].map(stat => (
          <div key={stat.label} className="border border-border rounded-xl p-5 bg-card">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>
              {stat.icon}
            </div>
            <div className="font-numeric text-3xl font-black text-foreground">{stat.value.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Notify Article Section */}
      <div className="border border-[var(--patina)]/20 rounded-xl p-5 bg-[var(--patina)]/5">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-[var(--patina)]" />
          <h3 className="font-semibold text-foreground">文章发布通知</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          输入文章 ID，向所有活跃订阅者发送新文章通知。
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="文章 ID（数字）"
            value={notifyArticleId}
            onChange={e => setNotifyArticleId(e.target.value)}
            className="max-w-xs"
            type="number"
          />
          <Button
            onClick={() => notifyArticleId && notifyMutation.mutate({ articleId: parseInt(notifyArticleId) })}
            disabled={!notifyArticleId || notifyMutation.isPending}
            className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5"
          >
            {notifyMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            发送通知
          </Button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索邮箱..."
            className="pl-9"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>搜索</Button>
        <div className="flex gap-1.5 ml-2">
          {[
            { label: "全部", value: undefined },
            { label: "活跃", value: true },
            { label: "已退订", value: false },
          ].map(f => (
            <button
              key={String(f.value)}
              onClick={() => { setFilterActive(f.value); setPage(1); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filterActive === f.value
                  ? "bg-[var(--patina)] text-white border-[var(--patina)]"
                  : "bg-background text-muted-foreground border-border hover:border-[var(--patina)]/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">邮箱</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">状态</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">订阅时间</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-48" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-16" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse w-24" /></td>
                </tr>
              ))
            ) : data?.subscribers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  暂无订阅者
                </td>
              </tr>
            ) : (
              data?.subscribers.map(sub => (
                <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{sub.email}</td>
                  <td className="px-4 py-3">
                    {sub.isActive ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                        <UserCheck className="w-3 h-3" /> 活跃
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <UserX className="w-3 h-3" /> 已退订
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(sub.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">
              共 <span className="font-numeric font-bold">{data.total}</span> 位订阅者
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                上一页
              </Button>
              <span className="text-xs text-muted-foreground self-center">第 {page} 页</span>
              <Button variant="outline" size="sm" disabled={data.subscribers.length < 50} onClick={() => setPage(p => p + 1)}>
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[var(--patina)]" />
              发送广播邮件
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">邮件主题</label>
              <Input
                placeholder="例：Master.AI 本周精选洞察"
                value={broadcastSubject}
                onChange={e => setBroadcastSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">邮件内容</label>
              <textarea
                className="w-full h-32 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-[var(--patina)] resize-none"
                placeholder="输入广播邮件内容..."
                value={broadcastContent}
                onChange={e => setBroadcastContent(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              将向 <span className="font-numeric font-bold text-foreground">{stats?.active ?? 0}</span> 位活跃订阅者发送此邮件。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>取消</Button>
            <Button
              onClick={() => broadcastMutation.mutate({ subject: broadcastSubject, content: broadcastContent })}
              disabled={!broadcastSubject || !broadcastContent || broadcastMutation.isPending}
              className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5"
            >
              {broadcastMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              确认发送
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
