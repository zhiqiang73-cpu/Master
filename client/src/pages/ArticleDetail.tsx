import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { Link } from "wouter";

export default function ArticleDetail() {
  const { code } = useParams<{ code: string }>();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: article, isLoading } = trpc.articles.byCode.useQuery({ code: code ?? "" }, { enabled: !!code });
  const purchaseMutation = trpc.payments.purchaseArticle.useMutation({
    onSuccess: () => { toast.success("购买成功！"); utils.articles.byCode.invalidate({ code: code ?? "" }); },
    onError: (e) => toast.error(e.message),
  });
  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--patina)]" /></div></div>;
  if (!article) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">文章不存在</div></div>;
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="article-code">{article.code}</span>
          {article.isFree && <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">免费</Badge>}
        </div>
        <h1 className="font-display text-2xl font-bold mb-4">{article.titleZh}</h1>
        {article.summaryZh && <p className="text-muted-foreground mb-6 text-sm leading-relaxed border-l-2 border-[var(--patina)] pl-4">{article.summaryZh}</p>}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-8 pb-4 border-b border-border">
          <span>{article.readCount} 次阅读</span>
          {!article.isFree && <span className="text-[var(--patina)] font-mono font-medium">${article.price}</span>}
        </div>
        {article.hasAccess ? (
          <div className="prose prose-sm max-w-none"><Streamdown>{article.contentZh ?? ""}</Streamdown></div>
        ) : (
          <div className="text-center py-12 border border-dashed border-[var(--patina)]/40 rounded-lg bg-[var(--patina)]/5 mt-4">
            <Lock className="w-8 h-8 mx-auto mb-3 text-[var(--patina)]" />
            <p className="text-sm font-medium mb-1">付费内容</p>
            <p className="text-xs text-muted-foreground mb-4">购买此文章或订阅该 Master 即可阅读全文</p>
            {isAuthenticated ? (
              <Button onClick={() => purchaseMutation.mutate({ articleId: article.id })} disabled={purchaseMutation.isPending} className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                {purchaseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `购买 $${article.price}`}
              </Button>
            ) : (
              <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"><Link href="/login">登录后购买</Link></Button>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
