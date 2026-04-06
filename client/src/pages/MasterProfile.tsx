import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, BookOpen } from "lucide-react";

export default function MasterProfile() {
  const { alias } = useParams<{ alias: string }>();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.masters.byAlias.useQuery({ alias: alias ?? "" }, { enabled: !!alias });
  const subscribeMutation = trpc.payments.subscribeMaster.useMutation({
    onSuccess: () => { toast.success("订阅成功！"); utils.masters.byAlias.invalidate(); },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--patina)]" /></div></div>;
  if (!data) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">Master 不存在</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-3xl">
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--patina)]/15 flex items-center justify-center text-[var(--patina)] font-bold text-2xl flex-shrink-0">
              {data.displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-xl font-bold">{data.displayName}</h1>
                {data.isVerified && <Badge variant="outline" className="text-[10px] border-[var(--patina)] text-[var(--patina)]">✓ 认证</Badge>}
                {data.isAiAgent && <Badge variant="outline" className="text-[10px] border-purple-400 text-purple-600">AI Master</Badge>}
              </div>
              <div className="font-mono text-xs text-[var(--patina)] mb-2">Lv.{data.level} · {data.levelInfo?.title ?? "见习"}</div>
              <p className="text-sm text-muted-foreground mb-4">{data.bio ?? "暂无简介"}</p>
              <div className="flex items-center gap-6 text-xs text-muted-foreground mb-4">
                <span>{data.articleCount} 篇文章</span>
                <span>{data.subscriberCount} 订阅者</span>
              </div>
              {isAuthenticated ? (
                <div className="flex gap-2">
                  <Button onClick={() => subscribeMutation.mutate({ masterId: data.id, plan: "monthly" })} disabled={subscribeMutation.isPending} className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white text-xs">
                    {subscribeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : `月度订阅 $${data.levelInfo?.monthlyPrice ?? 9.9}`}
                  </Button>
                  <Button variant="outline" onClick={() => subscribeMutation.mutate({ masterId: data.id, plan: "yearly" })} disabled={subscribeMutation.isPending} className="text-xs">
                    年度订阅 ${data.levelInfo?.yearlyPrice ?? 99}
                  </Button>
                </div>
              ) : (
                <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white text-xs">
                  <Link href="/login">登录后订阅</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-sm mb-4">最新文章</h2>
          {data.articles.length > 0 ? (
            <div className="space-y-3">
              {data.articles.map(a => (
                <Link key={a.id} href={`/article/${a.code}`}>
                  <div className="group p-4 bg-card border border-border rounded-lg hover:border-[var(--patina)]/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-1"><span className="article-code">{a.code}</span></div>
                    <p className="text-sm font-medium group-hover:text-[var(--patina)] transition-colors">{a.titleZh}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{a.readCount} 阅读</span>
                      {!a.isFree && <span className="text-[var(--patina)] font-mono">${a.price}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">暂无文章</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
