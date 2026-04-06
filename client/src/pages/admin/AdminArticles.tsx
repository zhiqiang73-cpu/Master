import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Streamdown } from "streamdown";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "bg-gray-100 text-gray-600" },
  pending: { label: "待审核", cls: "bg-yellow-100 text-yellow-700" },
  published: { label: "已发布", cls: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", cls: "bg-red-100 text-red-700" },
};

export default function AdminArticles() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [previewArticle, setPreviewArticle] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.listAllArticles.useQuery({ status: statusFilter || undefined, page, limit: 20 });
  const approveMutation = trpc.admin.approveArticle.useMutation({
    onSuccess: () => { toast.success("文章已通过审核！"); utils.admin.listAllArticles.invalidate(); setPreviewArticle(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectMutation = trpc.admin.rejectArticle.useMutation({
    onSuccess: () => { toast.success("文章已拒绝"); utils.admin.listAllArticles.invalidate(); setPreviewArticle(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const articles = data?.articles ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">文章审核</h1>
          <p className="text-xs text-muted-foreground mt-0.5">共 {data?.total ?? 0} 篇</p>
        </div>
        <div className="flex gap-1">
          {Object.entries({ "": "全部", pending: "待审核", published: "已发布", rejected: "已拒绝" }).map(([v, l]) => (
            <Button key={v} size="sm" variant={statusFilter === v ? "default" : "outline"}
              onClick={() => { setStatusFilter(v); setPage(1); }}
              className={statusFilter === v ? "bg-[var(--patina)] text-white hover:bg-[var(--patina-dark)] text-xs" : "text-xs"}>
              {l}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--kinari-deep)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">编号</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">标题</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">作者</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">提交时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--patina)]" /></td></tr>
            ) : articles.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-xs">暂无文章</td></tr>
            ) : articles.map((a: any) => {
              const s = STATUS_MAP[a.status] ?? STATUS_MAP.draft;
              return (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3"><span className="font-mono text-[10px] text-[var(--patina)]">{a.code}</span></td>
                  <td className="px-4 py-3 max-w-xs"><p className="text-xs font-medium truncate">{a.titleZh}</p></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.masterName ?? "-"}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{new Date(a.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setPreviewArticle(a)}>
                        <Eye className="w-3 h-3" /> 预览
                      </Button>
                      {a.status === "pending" && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
                            onClick={() => approveMutation.mutate({ id: a.id })} disabled={approveMutation.isPending}>
                            <CheckCircle className="w-3 h-3" /> 通过
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
                            onClick={() => rejectMutation.mutate({ id: a.id, note: "不符合平台规范" })} disabled={rejectMutation.isPending}>
                            <XCircle className="w-3 h-3" /> 拒绝
                          </Button>
                        </>
                      )}
                    </div>
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

      <Dialog open={!!previewArticle} onOpenChange={() => setPreviewArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{previewArticle?.titleZh}</DialogTitle>
            <div className="font-mono text-[10px] text-[var(--patina)]">{previewArticle?.code}</div>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <Streamdown>{previewArticle?.contentZh ?? "暂无内容"}</Streamdown>
          </div>
          {previewArticle?.status === "pending" && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                onClick={() => approveMutation.mutate({ id: previewArticle.id })} disabled={approveMutation.isPending}>
                <CheckCircle className="w-3 h-3 mr-1" /> 通过审核
              </Button>
              <Button variant="outline" className="flex-1 text-red-500 border-red-200 hover:bg-red-50 text-xs"
                onClick={() => rejectMutation.mutate({ id: previewArticle.id, note: "不符合平台规范" })} disabled={rejectMutation.isPending}>
                <XCircle className="w-3 h-3 mr-1" /> 拒绝
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
