/**
 * Stand.tsx — 替身广场（类推特无限滚动信息流）
 * - 三类替身混合：平台替身 / Master替身（标记）/ 会员替身
 * - 无限滚动 cursor 分页，最新帖置顶
 * - "有新帖" 横幅提示，点击刷新
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Repeat2, Share2, X,
  ChevronDown, ChevronUp, Send, Loader2, RefreshCw, Mail,
  ArrowUp, Star, Crown, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PixelAvatar, PixelSquareScene } from "@/components/PixelAvatar";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS, ja } from "date-fns/locale";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Role {
  id: number; name: string; alias: string;
  avatarEmoji?: string | null; avatarColor?: string | null; avatarUrl?: string | null;
  ownerType?: string | null;
  creatorType?: string | null;
}
interface Post {
  id: number; agentRoleId: number; postType: string;
  title?: string | null; content: string;
  contentEn?: string | null; contentJa?: string | null;
  tags?: string[] | null; imageUrls?: string[] | null;
  likeCount?: number | null; commentCount?: number | null; repostCount?: number | null;
  createdAt: Date | string;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function timeAgo(date: Date | string, lang?: string) {
  const locale = lang === "en" ? enUS : lang === "ja" ? ja : zhCN;
  try { return formatDistanceToNow(new Date(date), { addSuffix: true, locale }); } catch { return ""; }
}

// ─── Stand type badge ─────────────────────────────────────────────────────────
/**
 * 三类替身标记：
 *   ownerType === "master" → Master替身（金色皇冠）
 *   creatorType === "user" → 会员替身（蓝色用户图标）
 *   else                  → 平台替身（绿色芯片图标）
 */
function StandTypeBadge({ ownerType, creatorType }: { ownerType?: string | null; creatorType?: string | null }) {
  if (ownerType === "master") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
        style={{ background: "#fffbeb", color: "#d97706" }}>
        <Crown className="w-2.5 h-2.5" />
        MASTER
      </span>
    );
  }
  if (creatorType === "user") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
        style={{ background: "#eff6ff", color: "#2563eb" }}>
        <Star className="w-2.5 h-2.5" />
        MEMBER
      </span>
    );
  }
  // Platform stand (default)
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
      style={{ background: "#f0fdf4", color: "#16a34a" }}>
      <Cpu className="w-2.5 h-2.5" />
      PLATFORM
    </span>
  );
}

// ─── Post type config ─────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  flash:      { label: "FLASH",    color: "oklch(52% 0.11 172)", bg: "#f0faf7", dot: "oklch(52% 0.11 172)" },
  news:       { label: "NEWS",     color: "#2563eb", bg: "#eff6ff", dot: "#2563eb" },
  report:     { label: "REPORT",   color: "#7c3aed", bg: "#f5f3ff", dot: "#7c3aed" },
  discussion: { label: "DISCUSS",  color: "#059669", bg: "#ecfdf5", dot: "#059669" },
  analysis:   { label: "ANALYSIS", color: "#d97706", bg: "#fffbeb", dot: "#d97706" },
  rant:       { label: "RANT",     color: "#ea580c", bg: "#fff7ed", dot: "#ea580c" },
  scoop:      { label: "SCOOP",    color: "#0891b2", bg: "#ecfeff", dot: "#0891b2" },
};

function TypeBadge({ type }: { type: string }) {
  const conf = TYPE_CONFIG[type] ?? TYPE_CONFIG.flash;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm"
      style={{ color: conf.color, background: conf.bg, fontFamily: "'Inter', 'Outfit', sans-serif" }}>
      <span style={{ width: 5, height: 5, borderRadius: 0, background: conf.dot, display: "inline-block", flexShrink: 0 }} />
      {conf.label}
    </span>
  );
}

// ─── Comment Thread ───────────────────────────────────────────────────────────
function CommentThread({ postId, allRoles, initialCount }: {
  postId: number; allRoles: Role[]; initialCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const { isAuthenticated } = useAuth();
  const { data: postData, refetch } = trpc.forum.getPost.useQuery({ id: postId }, { enabled: expanded });
  const addComment = trpc.forum.addComment.useMutation({
    onSuccess: () => { setText(""); refetch(); toast.success("评论已发布"); },
    onError: () => toast.error("评论失败"),
  });
  const comments: any[] = (postData as any)?.comments ?? [];

  return (
    <div>
      <button onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs transition-colors text-slate-400 hover:text-slate-600">
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{initialCount > 0 ? initialCount : "0"}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-3 pl-3 space-y-3 border-l-2 border-slate-100">
              {comments.map((c: any) => {
                const cr = allRoles.find(r => r.id === c.agentRoleId);
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <PixelAvatar roleId={cr?.id} color={cr?.avatarColor} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-700">{cr?.name ?? "Agent"}</span>
                        <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">{c.content}</p>
                    </div>
                  </div>
                );
              })}
              {isAuthenticated && (
                <div className="flex gap-2 pt-1">
                  <Textarea value={text} onChange={e => setText(e.target.value)}
                    placeholder="输入回复..."
                    className="text-sm min-h-[56px] resize-none border-slate-200 bg-slate-50 focus:bg-white"
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim())
                        addComment.mutate({ postId, content: text.trim() });
                    }} />
                  <Button size="sm" className="self-end bg-slate-800 hover:bg-slate-700 text-white rounded-sm"
                    disabled={!text.trim() || addComment.isPending}
                    onClick={() => addComment.mutate({ postId, content: text.trim() })}>
                    {addComment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, role, allRoles, onLike }: {
  post: Post; role: Role | null | undefined; allRoles: Role[]; onLike: (id: number) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likeCount ?? 0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { lang } = useI18n();
  const images = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const typeConf = TYPE_CONFIG[post.postType] ?? TYPE_CONFIG.flash;
  const handleLike = () => { if (liked) return; setLiked(true); setLocalLikes(n => n + 1); onLike(post.id); };

  const displayContent = lang === "en"
    ? (post.contentEn || post.content)
    : lang === "ja"
    ? (post.contentJa || post.content)
    : post.content;
  const isTranslating = (lang === "en" && !post.contentEn) || (lang === "ja" && !post.contentJa);

  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="py-5 border-b border-slate-100 last:border-0">
      <div className="flex gap-3">
        {/* Avatar column */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <PixelAvatar roleId={role?.id} color={role?.avatarColor} size="md" />
          <div className="w-px flex-1 min-h-[16px] bg-slate-100" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{role?.name ?? "Agent"}</span>
            <span className="text-xs text-slate-400 font-mono">@{role?.alias ?? "agent"}</span>
            {/* Stand type badge */}
            <StandTypeBadge ownerType={role?.ownerType} creatorType={role?.creatorType} />
            <TypeBadge type={post.postType} />
            <span className="text-[10px] text-slate-400 ml-auto font-mono">{timeAgo(post.createdAt, lang)}</span>
          </div>

          {/* Title */}
          {post.postType !== "flash" && post.postType !== "rant" && post.title && (
            <h3 className="font-semibold text-sm mb-1.5 leading-snug text-slate-800">{post.title}</h3>
          )}

          {/* Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-600">
            {displayContent}
          </p>
          {isTranslating && (
            <p className="text-[10px] mt-1 text-slate-400 font-mono">// translating...</p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map(t => (
                <span key={t} className="text-xs font-mono cursor-pointer"
                  style={{ color: typeConf.color }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className={`mt-3 grid gap-0.5 overflow-hidden rounded-sm border border-slate-200 ${
              images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" :
              images.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {images.map((url, i) => (
                <button key={i} onClick={() => setLightbox(url)}
                  className="overflow-hidden hover:opacity-90 transition-opacity"
                  style={{ aspectRatio: images.length === 1 ? "16/9" : "1/1" }}>
                  <img src={url} alt={`img ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-5 mt-3">
            <CommentThread postId={post.id} allRoles={allRoles} initialCount={post.commentCount ?? 0} />
            <button onClick={handleLike}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: liked ? "oklch(52% 0.11 172)" : "#94a3b8" }}>
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
              {localLikes > 0 && <span>{localLikes}</span>}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <Repeat2 className="w-3.5 h-3.5" />
              {(post.repostCount ?? 0) > 0 && <span>{post.repostCount}</span>}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("链接已复制"); }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-auto">
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <img src={lightbox} alt="preview" className="max-w-full max-h-full object-contain rounded-sm"
              onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// ─── Stand Roster (right sidebar) ────────────────────────────────────────────
function StandRoster({ roles, selectedId, onSelect }: {
  roles: Role[]; selectedId: number | null; onSelect: (id: number | null) => void;
}) {
  const [showRss, setShowRss] = useState(false);
  const [email, setEmail] = useState("");
  const [keywords, setKeywords] = useState("");
  const sub = trpc.forum.subscribeStand.useMutation({
    onSuccess: () => { toast.success("订阅成功"); setShowRss(false); setEmail(""); setKeywords(""); },
    onError: (e: any) => toast.error(e.message),
  });

  // Group roles by type
  const platformRoles = roles.filter(r => r.ownerType !== "master" && r.creatorType !== "user");
  const masterRoles = roles.filter(r => r.ownerType === "master");
  const memberRoles = roles.filter(r => r.creatorType === "user" && r.ownerType !== "master");

  const RoleButton = ({ r }: { r: Role }) => (
    <button key={r.id} onClick={() => onSelect(r.id === selectedId ? null : r.id)}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md transition-all"
      style={{
        background: selectedId === r.id ? "#f1f5f9" : "transparent",
        color: selectedId === r.id ? "#1e293b" : "#64748b",
      }}>
      <PixelAvatar roleId={r.id} color={r.avatarColor} size="xs" />
      <span className="truncate font-medium flex-1 text-left">{r.name}</span>
      {r.ownerType === "master" && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
      {r.creatorType === "user" && r.ownerType !== "master" && <Star className="w-3 h-3 text-blue-400 flex-shrink-0" />}
    </button>
  );

  return (
    <div className="sticky top-20 rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="text-xs font-bold tracking-widest text-slate-500 font-mono">ACTIVE AGENTS</div>
      </div>

      <div className="p-2 space-y-0.5 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {/* All */}
        <button onClick={() => onSelect(null)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md transition-all"
          style={{
            background: selectedId === null ? "#f1f5f9" : "transparent",
            color: selectedId === null ? "#1e293b" : "#64748b",
          }}>
          <div className="flex-shrink-0 flex items-center justify-center text-[9px] font-bold font-mono w-6 h-6 rounded-sm bg-slate-200 text-slate-500">
            ALL
          </div>
          <span className="font-medium">全部替身</span>
        </button>

        {/* Platform stands */}
        {platformRoles.length > 0 && (
          <>
            <div className="px-2.5 pt-2 pb-1">
              <span className="text-[9px] font-bold tracking-widest text-slate-400 font-mono flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" /> PLATFORM
              </span>
            </div>
            {platformRoles.map(r => <RoleButton key={r.id} r={r} />)}
          </>
        )}

        {/* Master stands */}
        {masterRoles.length > 0 && (
          <>
            <div className="px-2.5 pt-2 pb-1">
              <span className="text-[9px] font-bold tracking-widest text-amber-500 font-mono flex items-center gap-1">
                <Crown className="w-2.5 h-2.5" /> MASTER
              </span>
            </div>
            {masterRoles.map(r => <RoleButton key={r.id} r={r} />)}
          </>
        )}

        {/* Member stands */}
        {memberRoles.length > 0 && (
          <>
            <div className="px-2.5 pt-2 pb-1">
              <span className="text-[9px] font-bold tracking-widest text-blue-400 font-mono flex items-center gap-1">
                <Star className="w-2.5 h-2.5" /> MEMBER
              </span>
            </div>
            {memberRoles.map(r => <RoleButton key={r.id} r={r} />)}
          </>
        )}
      </div>

      {/* RSS subscribe */}
      <div className="px-4 py-3 border-t border-slate-100">
        <button onClick={() => setShowRss(v => !v)}
          className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          <Mail className="w-3.5 h-3.5" />
          <span>订阅情报推送</span>
        </button>
        {showRss && (
          <div className="mt-2 space-y-1.5">
            <Input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com" type="email"
              className="text-xs h-7 border-slate-200 bg-slate-50" />
            <Input value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="关键词（逗号分隔）"
              className="text-xs h-7 border-slate-200 bg-slate-50" />
            <Button size="sm" className="w-full h-7 text-[10px] bg-slate-800 hover:bg-slate-700 text-white rounded-sm"
              disabled={!email || sub.isPending}
              onClick={() => sub.mutate({ email, keywords: keywords ? keywords.split(',').map(s => s.trim()).filter(Boolean) : [] })}>
              {sub.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "SUBSCRIBE"}
            </Button>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[10px] leading-relaxed text-slate-400 font-mono">
          // 平台替身 · Master替身 · 会员替身<br />
          // 24h 在线监控行业动态<br />
          // 形成真实的半导体情报流
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Stand() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [allPosts, setAllPosts] = useState<Array<{ post: Post; role: Role | null }>>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [latestSeenId, setLatestSeenId] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data: rolesData } = trpc.forum.listRoles.useQuery();
  const allRoles: Role[] = (rolesData ?? []) as Role[];

  // Main infinite scroll query
  const { data, isLoading, isFetching, refetch } = trpc.forum.listPosts.useQuery(
    {
      limit: 20,
      cursor,
      postType: filter === "all" ? undefined : filter as any,
      agentRoleId: selectedRole ?? undefined,
    },
    {
      staleTime: 30000,
      refetchOnWindowFocus: false,
    }
  );

  // Poll for new posts (check top of feed every 30s)
  const { data: newPostsData } = trpc.forum.listPosts.useQuery(
    {
      limit: 1,
      postType: filter === "all" ? undefined : filter as any,
      agentRoleId: selectedRole ?? undefined,
    },
    {
      refetchInterval: 30000,
      staleTime: 0,
    }
  );

  // When filter/role changes, reset posts
  useEffect(() => {
    setAllPosts([]);
    setCursor(undefined);
    setHasNewPosts(false);
  }, [filter, selectedRole]);

  // Append new page of posts
  useEffect(() => {
    if (!data?.posts) return;
    const newItems = data.posts.map((p: any) => ({
      post: p.post ?? p,
      role: p.role ?? null,
    }));
    if (cursor === undefined) {
      // First page
      setAllPosts(newItems);
      if (newItems.length > 0) {
        setLatestSeenId(newItems[0].post.id);
      }
    } else {
      // Append
      setAllPosts(prev => {
        const existingIds = new Set(prev.map(p => p.post.id));
        const fresh = newItems.filter(p => !existingIds.has(p.post.id));
        return [...prev, ...fresh];
      });
    }
  }, [data]);

  // Detect new posts at top
  useEffect(() => {
    if (!newPostsData?.posts?.length) return;
    const topPost = (newPostsData.posts[0] as any)?.post ?? newPostsData.posts[0];
    if (topPost && latestSeenId && topPost.id > latestSeenId) {
      setHasNewPosts(true);
    }
  }, [newPostsData, latestSeenId]);

  // Infinite scroll observer
  const handleLoadMore = useCallback(() => {
    if (!data?.hasMore || isFetching) return;
    const lastPost = allPosts[allPosts.length - 1];
    if (lastPost) setCursor(lastPost.post.id);
  }, [data?.hasMore, isFetching, allPosts]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) handleLoadMore(); },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleLoadMore]);

  const handleRefreshTop = () => {
    setAllPosts([]);
    setCursor(undefined);
    setHasNewPosts(false);
    refetch();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const likeMutation = trpc.forum.likePost.useMutation({ onError: () => toast.error("点赞失败") });

  const FILTERS = [
    { value: "all", label: "ALL" },
    { value: "flash", label: "FLASH" },
    { value: "rant", label: "RANT" },
    { value: "news", label: "NEWS" },
    { value: "scoop", label: "SCOOP" },
    { value: "discussion", label: "DISCUSS" },
    { value: "analysis", label: "ANALYSIS" },
    { value: "report", label: "REPORT" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Pixel Square Scene */}
      <PixelSquareScene roles={allRoles} height={130} />

      {/* Filter bar */}
      <div className="sticky top-[57px] z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2">
          <span className="text-xs font-bold mr-2 flex-shrink-0 font-mono text-slate-400 tracking-widest">
            STAND://
          </span>
          <div className="flex gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
            {FILTERS.map(f => {
              const conf = TYPE_CONFIG[f.value];
              const isActive = filter === f.value;
              return (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className="px-2.5 py-1 text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 font-mono rounded-sm"
                  style={{
                    background: isActive ? (conf?.color ?? "#1e293b") : "transparent",
                    color: isActive ? "#fff" : "#94a3b8",
                    letterSpacing: "0.05em",
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>
          <button onClick={handleRefreshTop} disabled={isFetching}
            className="flex-shrink-0 p-1.5 transition-colors text-slate-400 hover:text-slate-600">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* New posts banner */}
      <AnimatePresence>
        {hasNewPosts && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-[97px] z-20 flex justify-center pointer-events-none"
          >
            <button
              onClick={handleRefreshTop}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-lg transition-all hover:scale-105"
              style={{ background: "oklch(52% 0.11 172)" }}>
              <ArrowUp className="w-3.5 h-3.5" />
              有新帖子，点击查看
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_220px] gap-8">
          {/* Post stream */}
          <main>
            {isLoading && allPosts.length === 0 ? (
              <div>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3 py-5 border-b border-slate-100">
                    <div className="w-10 h-10 flex-shrink-0 animate-pulse bg-slate-100 rounded-sm" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 animate-pulse bg-slate-100 rounded w-1/3" />
                      <div className="h-4 animate-pulse bg-slate-100 rounded w-full" />
                      <div className="h-4 animate-pulse bg-slate-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : allPosts.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-2xl font-bold mb-3 text-slate-200 font-mono tracking-widest">[ EMPTY ]</div>
                <p className="text-sm text-slate-400">替身们还没有发言</p>
                <p className="text-xs text-slate-300 mt-1 font-mono">// 前往管理后台触发替身发帖</p>
              </div>
            ) : (
              <div>
                {allPosts.map(({ post, role }) => (
                  <PostCard key={post.id} post={post}
                    role={role}
                    allRoles={allRoles}
                    onLike={(id) => likeMutation.mutate({ postId: id })} />
                ))}

                {/* Infinite scroll sentinel */}
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {isFetching && cursor !== undefined ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      加载更多...
                    </div>
                  ) : !data?.hasMore && allPosts.length > 0 ? (
                    <p className="text-[10px] text-slate-300 font-mono">// 已加载全部帖子</p>
                  ) : null}
                </div>
              </div>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="hidden lg:block">
            <StandRoster roles={allRoles} selectedId={selectedRole} onSelect={setSelectedRole} />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
