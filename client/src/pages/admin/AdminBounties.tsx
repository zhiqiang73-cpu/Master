import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open: { label: "开放", cls: "bg-green-100 text-green-700" },
  accepted: { label: "已接单", cls: "bg-blue-100 text-blue-700" },
  submitted: { label: "已提交", cls: "bg-yellow-100 text-yellow-700" },
  completed: { label: "已完成", cls: "bg-gray-100 text-gray-600" },
  disputed: { label: "争议中", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "已取消", cls: "bg-gray-100 text-gray-400" },
};

export default function AdminBounties() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.listAllBounties.useQuery({ status: statusFilter || undefined, page });
  const resolveMutation = trpc.admin.resolveBountyDispute.useMutation({
    onSuccess: () => { toast.success("争议已解决"); utils.admin.listAllBounties.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const bounties = data?.bounties ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">悬赏管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">共 {data?.total ?? 0} 条悬赏</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[{ v: "", l: "全部" }, ...Object.entries(STATUS_MAP).map(([v, s]) => ({ v, l: s.label }))].map(item => (
            <Button key={item.v} size="sm" variant={statusFilter === item.v ? "default" : "outline"}
              onClick={() => { setStatusFilter(item.v); setPage(1); }}
              className={statusFilter === item.v ? "bg-[var(--patina)] text-white hover:bg-[var(--patina-dark)] text-xs" : "text-xs"}>
              {item.l}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--kinari-deep)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">标题</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">发起人</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">金额</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--patina)]" /></td></tr>
            ) : bounties.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-xs">暂无悬赏</td></tr>
            ) : bounties.map((b: any) => {
              const s = STATUS_MAP[b.status] ?? STATUS_MAP.open;
              return (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3 max-w-xs"><p className="text-xs font-medium truncate">{b.titleZh}</p></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.userName ?? "-"}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-[var(--patina)]">${b.amount}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{new Date(b.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "disputed" && (
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700"
                          onClick={() => resolveMutation.mutate({ id: b.id, resolution: "cancel", note: "管理员裁定：支持发起人" })} disabled={resolveMutation.isPending}>
                          支持发起人
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-[var(--patina)] hover:text-[var(--patina-dark)]"
                          onClick={() => resolveMutation.mutate({ id: b.id, resolution: "complete", note: "管理员裁定：支持 Master" })} disabled={resolveMutation.isPending}>
                          支持 Master
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}
    </div>
  );
}
