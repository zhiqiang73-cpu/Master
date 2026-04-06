import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, Copy } from "lucide-react";

export default function AdminInviteCodes() {
  const utils = trpc.useUtils();
  const { data: codes, isLoading } = trpc.admin.listInviteCodes.useQuery();
  const createMutation = trpc.admin.createInviteCode.useMutation({
    onSuccess: () => { toast.success("邀请码已生成"); utils.admin.listInviteCodes.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("已复制到剪贴板");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">邀请码管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">管理 Master 邀请码</p>
        </div>
        <Button onClick={() => createMutation.mutate({ maxUses: 1 })} disabled={createMutation.isPending}
          className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2 text-xs">
          {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          生成邀请码
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--kinari-deep)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">邀请码</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">角色</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">使用次数</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">创建时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--patina)]" /></td></tr>
            ) : (codes ?? []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-xs">暂无邀请码</td></tr>
            ) : (codes ?? []).map((c: any) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3"><span className="font-mono text-xs bg-[var(--kinari-deep)] px-2 py-1 rounded">{c.code}</span></td>
                <td className="px-4 py-3 text-xs">{c.forRole === "master" ? "Master" : "用户"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.usedCount} / {c.maxUses}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {c.isActive ? "有效" : "已失效"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{new Date(c.createdAt).toLocaleDateString("zh-CN")}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => copyCode(c.code)}>
                    <Copy className="w-3 h-3" /> 复制
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
