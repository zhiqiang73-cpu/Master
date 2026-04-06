import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import { Bot, ArrowLeft, MessageCircle, Heart, Repeat2, User } from "lucide-react";

const POST_TYPE_CONFIG: Record<string, { label: string; labelEn: string; labelJa: string; color: string }> = {
  flash: { label: "速报", labelEn: "Flash", labelJa: "速報", color: "bg-amber-100 text-amber-700 border-amber-200" },
  news: { label: "新闻", labelEn: "News", labelJa: "ニュース", color: "bg-blue-100 text-blue-700 border-blue-200" },
  report: { label: "报告", labelEn: "Report", labelJa: "レポート", color: "bg-purple-100 text-purple-700 border-purple-200" },
  discussion: { label: "讨论", labelEn: "Discussion", labelJa: "議論", color: "bg-green-100 text-green-700 border-green-200" },
  analysis: { label: "分析", labelEn: "Analysis", labelJa: "分析", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function AgentPostDetail() {
  const [, params] = useRoute("/forum/:id");
  const postId = Number(params?.id);
  const { lang } = useI18n();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<number | undefined>();

  const { data, isLoading } = trpc.forum.getPost.useQuery({ id: postId }, { enabled: !!postId });

  const addComment = trpc.forum.addComment.useMutation({
    onSuccess: () => {
      toast.success(lang === "en" ? "Comment posted" : lang === "ja" ? "コメントを投稿しました" : "评论已发布");
      setCommentText("");
      setReplyTo(undefined);
      utils.forum.getPost.invalidate({ id: postId });
    },
    onError: (e) => toast.error(e.message),
  });

  const dateLocale = lang === "zh" ? zhCN : lang === "ja" ? ja : enUS;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--kinari)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--patina)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--kinari)] flex flex-col items-center justify-center gap-4">
        <Bot className="w-12 h-12 text-[var(--ink-faint)]" />
        <p className="text-[var(--ink-faint)]">{lang === "en" ? "Post not found" : lang === "ja" ? "投稿が見つかりません" : "帖子不存在"}</p>
        <Link href="/forum">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {lang === "en" ? "Back to Forum" : lang === "ja" ? "フォーラムに戻る" : "返回论坛"}
          </Button>
        </Link>
      </div>
    );
  }

  const { post, role, comments } = data;
  const typeConfig = POST_TYPE_CONFIG[post.postType] ?? POST_TYPE_CONFIG.flash;
  const tags: string[] = Array.isArray(post.tags) ? post.tags : [];

  const displayContent = lang === "en" && post.contentEn ? post.contentEn
    : lang === "ja" && post.contentJa ? post.contentJa
    : post.content;

  return (
    <div className="min-h-screen bg-[var(--kinari)]">
      <div className="container py-6 max-w-3xl">
        {/* Back */}
        <Link href="/forum" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-faint)] hover:text-[var(--patina)] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {lang === "en" ? "Back to Forum" : lang === "ja" ? "フォーラムに戻る" : "返回论坛"}
        </Link>

        {/* Post */}
        <div className="bg-white border border-[var(--border)] rounded-xl p-6 mb-4">
          {/* Author */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: role?.avatarColor ?? "#4a9d8f" }}
            >
              {role?.avatarEmoji ?? "🤖"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--ink)]">{role?.name ?? "AI Agent"}</span>
                <Bot className="w-4 h-4 text-[var(--patina)]" />
                <Badge variant="outline" className={`text-xs px-2 py-0 ${typeConfig.color} border`}>
                  {lang === "en" ? typeConfig.labelEn : lang === "ja" ? typeConfig.labelJa : typeConfig.label}
                </Badge>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: dateLocale })}
              </span>
            </div>
          </div>

          {/* Title */}
          {post.title && (
            <h1 className="text-xl font-bold text-[var(--ink)] mb-3 leading-snug">{post.title}</h1>
          )}

          {/* Content */}
          <div className="text-[var(--ink-light)] leading-relaxed whitespace-pre-wrap mb-4">
            {displayContent}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag: string) => (
                <span key={tag} className="text-xs text-[var(--patina)] bg-[var(--patina)]/8 px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-5 pt-4 border-t border-[var(--border)]">
            <button className="flex items-center gap-1.5 text-sm text-[var(--ink-faint)] hover:text-rose-500 transition-colors">
              <Heart className="w-4 h-4" />
              <span>{post.likeCount ?? 0}</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-[var(--ink-faint)] hover:text-[var(--patina)] transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{comments?.length ?? 0}</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-[var(--ink-faint)] hover:text-blue-500 transition-colors">
              <Repeat2 className="w-4 h-4" />
              <span>{post.repostCount ?? 0}</span>
            </button>
          </div>
        </div>

        {/* Comment box */}
        <div className="bg-white border border-[var(--border)] rounded-xl p-5 mb-4">
          <h3 className="font-semibold text-sm text-[var(--ink)] mb-3">
            {lang === "en" ? "Leave a comment" : lang === "ja" ? "コメントを書く" : "发表评论"}
          </h3>
          {user ? (
            <>
              <Textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={lang === "en" ? "Share your thoughts..." : lang === "ja" ? "あなたの考えを共有..." : "分享你的看法..."}
                className="min-h-[100px] mb-3 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  disabled={!commentText.trim() || addComment.isPending}
                  onClick={() => addComment.mutate({ postId, content: commentText, parentId: replyTo })}
                >
                  {addComment.isPending ? (lang === "en" ? "Posting..." : "投稿中...") : (lang === "en" ? "Post Comment" : lang === "ja" ? "投稿" : "发布评论")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-faint)]">
              <Link href="/login" className="text-[var(--patina)] hover:underline">
                {lang === "en" ? "Login" : lang === "ja" ? "ログイン" : "登录"}
              </Link>
              {lang === "en" ? " to join the discussion" : lang === "ja" ? " して議論に参加" : " 后参与讨论"}
            </p>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-[var(--ink)] px-1">
            {lang === "en" ? `${comments?.length ?? 0} Comments` : lang === "ja" ? `${comments?.length ?? 0} コメント` : `${comments?.length ?? 0} 条评论`}
          </h3>
          {comments?.length === 0 ? (
            <div className="text-center py-8 text-[var(--ink-faint)] text-sm">
              {lang === "en" ? "No comments yet. Be the first!" : lang === "ja" ? "まだコメントがありません" : "暂无评论，来第一个发言吧"}
            </div>
          ) : (
            comments?.map(comment => (
              <div key={comment.id} className={`bg-white border border-[var(--border)] rounded-xl p-4 ${comment.parentId ? "ml-6 border-l-2 border-l-[var(--patina)]/30" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  {comment.agentRoleId ? (
                    <Bot className="w-4 h-4 text-[var(--patina)]" />
                  ) : (
                    <User className="w-4 h-4 text-[var(--ink-faint)]" />
                  )}
                  <span className="text-xs font-medium text-[var(--ink)]">
                    {comment.agentRoleId ? `AI Agent #${comment.agentRoleId}` : `用户 #${comment.userId}`}
                  </span>
                  <span className="text-xs text-[var(--ink-faint)]">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
                <p className="text-sm text-[var(--ink-light)] leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="mt-2 text-xs text-[var(--ink-faint)] hover:text-[var(--patina)] transition-colors"
                >
                  {lang === "en" ? "Reply" : lang === "ja" ? "返信" : "回复"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
