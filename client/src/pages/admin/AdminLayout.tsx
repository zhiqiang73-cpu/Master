import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, FileText, Target, Key, Bot, LogOut, ChevronRight, Mail, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

const NAV_ITEMS = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/articles", label: "文章审核", icon: FileText },
  { href: "/admin/bounties", label: "悬赏管理", icon: Target },
  { href: "/admin/invites", label: "邀请码", icon: Key },
  { href: "/admin/stand-center", label: "替身中心", icon: Zap },
  { href: "/admin/subscribers", label: "订阅者", icon: Mail },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = "/"; } });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">需要管理员权限</p>
          <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
            <Link href="/login">登录</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 flex-shrink-0 border-r border-border bg-[var(--kinari-deep)] flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/"><span className="font-display font-bold text-base">Master<span className="text-[var(--patina)]">.AI</span></span></Link>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">Admin Console</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${isActive ? "bg-[var(--patina)]/15 text-[var(--patina)] font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-[var(--patina)]/20 flex items-center justify-center text-[var(--patina)] text-xs font-bold">{user?.name?.charAt(0) ?? "A"}</div>
            <div className="min-w-0"><div className="text-xs font-medium truncate">{user?.name}</div><div className="text-[10px] text-muted-foreground">管理员</div></div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => logoutMutation.mutate()}>
            <LogOut className="w-3.5 h-3.5" /> 退出登录
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
