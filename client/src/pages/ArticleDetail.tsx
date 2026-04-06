import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { Link } from "wouter";

export default function ArticleDetail() {
  const { code } = useParams<{ code: string }>();
  const { user, isAuthenticated } = useAuth();
  const { lang, t } = useI18n();
  const utils = trpc.useUtils();
  const { data: article, isLoading } = trpc.articles.byCode.useQuery({ code: code ?? "" }, { enabled: !!code });
  const purchaseMutation = trpc.payments.purchaseArticle.useMutation({
    onSuccess: () => { toast.success("购买成功！"); utils.articles.byCode.invalidate({ code: code ?? "" }); },
    onError: (e) => toast.error(e.message),
  });

  // Language-aware field selectors
  const getTitle = (a: typeof article) => {
    if (!a) return "";
    if (lang === "en") return (a as any).titleEn || a.titleZh;
    if (lang === "ja") return (a as any).titleJa || a.titleZh;
    return a.titleZh;
  };

  const getSummary = (a: typeof article) => {
    if (!a) return "";
    if (lang === "en") return (a as any).summaryEn || (a as any).summaryZh;
    if (lang === "ja") return (a as any).summaryJa || (a as any).summaryZh;
    return (a as any).summaryZh;
  };

  const getContent = (a: typeof article) => {
    if (!a) return "";
    if (lang === "en") return (a as any).contentEn || (a as any).contentZh || "";
    if (lang === "ja") return (a as any).contentJa || (a as any).contentZh || "";
    return (a as any).contentZh || "";
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--patina)]" />
      </div>
    </div>
  );

  if (!article) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-20 text-center text-muted-foreground">
        {lang === "en" ? "Article not found" : lang === "ja" ? "記事が見つかりません" : "文章不存在"}
      </div>
    </div>
  );

  const title = getTitle(article);
  const summary = getSummary(article);
  const content = getContent(article);

  // Language availability badges
  const hasEn = !!(article as any).contentEn;
  const hasJa = !!(article as any).contentJa;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-3xl">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="article-code">{article.code}</span>
          {article.isFree && (
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
              {lang === "en" ? "Free" : lang === "ja" ? "無料" : "免费"}
            </Badge>
          )}
          {/* Language availability indicators */}
          <div className="flex gap-1 ml-auto">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${lang === "zh" ? "bg-[var(--patina)]/10 border-[var(--patina)]/40 text-[var(--patina)]" : "border-border text-muted-foreground"}`}>中</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${lang === "en" ? "bg-[var(--patina)]/10 border-[var(--patina)]/40 text-[var(--patina)]" : hasEn ? "border-border text-muted-foreground" : "border-border text-muted-foreground/30"}`}>EN</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${lang === "ja" ? "bg-[var(--patina)]/10 border-[var(--patina)]/40 text-[var(--patina)]" : hasJa ? "border-border text-muted-foreground" : "border-border text-muted-foreground/30"}`}>JP</span>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold mb-4">{title}</h1>

        {summary && (
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed border-l-2 border-[var(--patina)] pl-4">
            {summary}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-8 pb-4 border-b border-border">
          <span>{article.readCount} {lang === "en" ? "reads" : lang === "ja" ? "回閲覧" : "次阅读"}</span>
          {!article.isFree && (
            <span className="text-[var(--patina)] font-mono font-medium">¥{article.price}</span>
          )}
          {/* Show notice if current language translation is not available */}
          {lang !== "zh" && !getContent(article) && (
            <span className="text-amber-500 text-[10px]">
              {lang === "en" ? "English translation not yet available" : "日本語翻訳は未対応"}
            </span>
          )}
        </div>

        {article.hasAccess ? (
          <div className="prose prose-sm max-w-none">
            {content ? (
              <Streamdown>{content}</Streamdown>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>
                  {lang === "en"
                    ? "English translation is not yet available. Showing original Chinese version:"
                    : "日本語翻訳はまだ利用できません。中国語版を表示しています："}
                </p>
                <div className="mt-4 text-left">
                  <Streamdown>{(article as any).contentZh ?? ""}</Streamdown>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-[var(--patina)]/40 rounded-lg bg-[var(--patina)]/5 mt-4">
            <Lock className="w-8 h-8 mx-auto mb-3 text-[var(--patina)]" />
            <p className="text-sm font-medium mb-1">
              {lang === "en" ? "Premium Content" : lang === "ja" ? "有料コンテンツ" : "付费内容"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {lang === "en"
                ? "Purchase this article or subscribe to this Master to read the full content"
                : lang === "ja"
                ? "この記事を購入するか、このマスターを購読して全文をお読みください"
                : "购买此文章或订阅该 Master 即可阅读全文"}
            </p>
            {isAuthenticated ? (
              <Button
                onClick={() => purchaseMutation.mutate({ articleId: article.id })}
                disabled={purchaseMutation.isPending}
                className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
              >
                {purchaseMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : `${lang === "en" ? "Buy" : lang === "ja" ? "購入" : "购买"} ¥${article.price}`}
              </Button>
            ) : (
              <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                <Link href="/login">
                  {lang === "en" ? "Login to Purchase" : lang === "ja" ? "ログインして購入" : "登录后购买"}
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
