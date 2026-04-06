import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Target, Users } from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading } = trpc.member.dashboard.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">请先登录</p>
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
        <div className="mb-8">
          <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">个人中心</span>
          <h1 className="font-display text-2xl font-bold mt-1">欢迎回来，{user?.name}</h1>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--patina)]" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-5 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-[var(--patina)]" /><span className="text-sm font-medium">我的订阅</span></div>
              <div className="text-2xl font-bold text-[var(--patina)]">{data?.subscriptions.length ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">位 Master</p>
            </div>
            <div className="p-5 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-[var(--patina)]" /><span className="text-sm font-medium">已购文章</span></div>
              <div className="text-2xl font-bold text-[var(--patina)]">{data?.purchases.length ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">篇</p>
            </div>
            <div className="p-5 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-[var(--patina)]" /><span className="text-sm font-medium">我的悬赏</span></div>
              <div className="text-2xl font-bold text-[var(--patina)]">{data?.bounties.length ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">条</p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
