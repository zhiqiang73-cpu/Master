import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Loader2, ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_LABELS: Record<string, string> = { user: "用户", master: "Master", admin: "管理员" };
const ROLE_COLORS: Record<string, string> = { user: "bg-gray-100 text-gray-600", master: "bg-[var(--patina)]/15 text-[var(--patina)]", admin: "bg-red-100 text-red-700" };

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.admin.listUsers.useQuery({ search: search || undefined, page, limit: 20 });
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("角色已更新"); utils.admin.listUsers.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const banMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => { toast.success("操作成功"); utils.admin.listUsers.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const users = data?.users ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">用户管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">共 {data?.total ?? 0} 位用户</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索用户名/邮箱..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 w-64" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--kinari-deep)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">用户</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">邮箱</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">角色</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">注册时间</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--patina)]" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-xs">暂无用户</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--patina)]/15 flex items-center justify-center text-[var(--patina)] text-xs font-bold flex-shrink-0">
                      {(user.name ?? "?").charAt(0)}
                    </div>
                    <span className="font-medium text-xs">{user.name ?? "未设置"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{user.email ?? "-"}</td>
                <td className="px-4 py-3">
                  <Select value={user.role} onValueChange={(v: any) => updateRoleMutation.mutate({ userId: user.id, role: v })}>
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">用户</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.isBanned ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {user.isBanned ? "已封禁" : "正常"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                  {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs gap-1 ${user.isBanned ? "text-green-600 hover:text-green-700" : "text-red-500 hover:text-red-600"}`}
                    onClick={() => banMutation.mutate({ userId: user.id, isBanned: !user.isBanned })}
                    disabled={banMutation.isPending}
                  >
                    {user.isBanned ? <><ShieldCheck className="w-3 h-3" />解封</> : <><ShieldOff className="w-3 h-3" />封禁</>}
                  </Button>
                </td>
              </tr>
            ))}
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
