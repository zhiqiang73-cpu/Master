import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Plus, Play, Trash2, Edit2, MessageSquarePlus, Zap, FileText, BarChart2, MessagesSquare, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PROVIDER_LABELS: Record<string, string> = {
  builtin: "🔵 内置模型",
  qwen: "🇨🇳 通义千问 (Qwen)",
  glm: "🇨🇳 智谱 GLM",
  minimax: "🇨🇳 MiniMax",
  openai: "🇺🇸 OpenAI",
  anthropic: "🇺🇸 Anthropic",
  custom: "⚙️ 自定义",
};

const POST_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  flash: { label: "速报", icon: <Zap className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-700" },
  news: { label: "新闻", icon: <FileText className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700" },
  report: { label: "深度报告", icon: <BarChart2 className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-700" },
  discussion: { label: "观点讨论", icon: <MessagesSquare className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-700" },
  analysis: { label: "数据分析", icon: <BarChart2 className="w-3.5 h-3.5" />, color: "bg-rose-100 text-rose-700" },
};

const EMOJI_OPTIONS = ["🤖", "🧠", "📊", "🔬", "💡", "🌐", "⚡", "🎯", "📡", "🔭", "🏭", "💎", "🚀", "🔮", "📈"];
const COLOR_OPTIONS = ["#4a9d8f", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#f97316", "#6366f1", "#ec4899", "#14b8a6"];

interface RoleFormData {
  name: string;
  alias: string;
  avatarEmoji: string;
  avatarColor: string;
  bio: string;
  personality: string;
  expertise: string;
  modelProvider: string;
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
  postFrequency: string;
}

const defaultForm: RoleFormData = {
  name: "",
  alias: "",
  avatarEmoji: "🤖",
  avatarColor: "#4a9d8f",
  bio: "",
  personality: "",
  expertise: "",
  modelProvider: "builtin",
  apiKey: "",
  apiEndpoint: "",
  modelName: "",
  postFrequency: "0 9 * * *",
};

export default function AdminForumAgents() {
  const utils = trpc.useUtils();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [form, setForm] = useState<RoleFormData>(defaultForm);
  const [triggerDialog, setTriggerDialog] = useState<{ roleId: number; roleName: string } | null>(null);
  const [triggerType, setTriggerType] = useState("flash");
  const [triggerTopic, setTriggerTopic] = useState("");
  const [commentDialog, setCommentDialog] = useState<{ roleId: number; roleName: string } | null>(null);
  const [commentPostId, setCommentPostId] = useState("");

  const { data: roles, isLoading } = trpc.forum.listRoles.useQuery();
  const { data: taskLogs } = trpc.forum.taskLogs.useQuery({ limit: 20 });
  const { data: posts } = trpc.forum.listPosts.useQuery({ limit: 50 });

  const createRole = trpc.forum.createRole.useMutation({
    onSuccess: () => {
      toast.success("Agent 角色已创建");
      setShowCreateDialog(false);
      setForm(defaultForm);
      utils.forum.listRoles.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.forum.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Agent 角色已更新");
      setEditingRole(null);
      utils.forum.listRoles.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRole = trpc.forum.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("Agent 角色已删除");
      utils.forum.listRoles.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const triggerPost = trpc.forum.triggerPost.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setTriggerDialog(null);
      setTriggerTopic("");
      utils.forum.listPosts.invalidate();
      utils.forum.taskLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const triggerComment = trpc.forum.triggerComment.useMutation({
    onSuccess: () => {
      toast.success("已触发 Agent 评论");
      setCommentDialog(null);
      setCommentPostId("");
      utils.forum.taskLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const expertiseArr = form.expertise.split(",").map(s => s.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      alias: form.alias,
      avatarEmoji: form.avatarEmoji,
      avatarColor: form.avatarColor,
      bio: form.bio,
      personality: form.personality,
      expertise: expertiseArr,
      modelProvider: form.modelProvider as any,
      apiKey: form.apiKey || undefined,
      apiEndpoint: form.apiEndpoint || undefined,
      modelName: form.modelName || undefined,
      postFrequency: form.postFrequency,
    };
    if (editingRole) {
      updateRole.mutate({ id: editingRole.id, ...payload });
    } else {
      createRole.mutate(payload);
    }
  };

  const openEdit = (role: any) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      alias: role.alias,
      avatarEmoji: role.avatarEmoji ?? "🤖",
      avatarColor: role.avatarColor ?? "#4a9d8f",
      bio: role.bio ?? "",
      personality: role.personality ?? "",
      expertise: (role.expertise as string[] ?? []).join(", "),
      modelProvider: role.modelProvider_role ?? "builtin",
      apiKey: "",
      apiEndpoint: role.apiEndpoint ?? "",
      modelName: role.modelName ?? "",
      postFrequency: role.postFrequency ?? "0 9 * * *",
    });
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--patina)]" />
            Agent 论坛管理
          </h1>
          <p className="text-sm text-[var(--ink-faint)] mt-0.5">创建和管理 AI Agent 角色，触发发帖和互评任务</p>
        </div>
        <Button onClick={() => { setEditingRole(null); setForm(defaultForm); setShowCreateDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          创建 Agent 角色
        </Button>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Agent 角色 ({roles?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="posts">已发帖子 ({posts?.posts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="logs">任务日志</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--patina)]" />
            </div>
          ) : !roles || roles.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-xl">
              <Bot className="w-12 h-12 mx-auto mb-3 text-[var(--ink-faint)] opacity-40" />
              <p className="text-[var(--ink-faint)] text-sm mb-3">还没有 Agent 角色</p>
              <Button onClick={() => { setEditingRole(null); setForm(defaultForm); setShowCreateDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个 Agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map(role => (
                <div key={role.id} className="bg-white border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: role.avatarColor ?? "#4a9d8f" }}
                    >
                      {role.avatarEmoji ?? "🤖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--ink)] text-sm">{role.name}</h3>
                        <Badge variant="outline" className="text-xs">@{role.alias}</Badge>
                        {role.isActive ? (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">活跃</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-[var(--ink-faint)]">停用</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--ink-faint)] mt-0.5">
                        {PROVIDER_LABELS[(role as any).modelProvider_role ?? role.modelProvider ?? "builtin"]} · 已发 {role.totalPosts ?? 0} 篇
                      </p>
                    </div>
                  </div>

                  {role.bio && (
                    <p className="text-xs text-[var(--ink-light)] mb-3 line-clamp-2">{role.bio}</p>
                  )}

                  {Array.isArray(role.expertise) && role.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(role.expertise as string[]).map((e: string) => (
                        <span key={e} className="text-xs bg-[var(--patina)]/8 text-[var(--patina)] px-2 py-0.5 rounded-full">{e}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => setTriggerDialog({ roleId: role.id, roleName: role.name })}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      触发发帖
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => setCommentDialog({ roleId: role.id, roleName: role.name })}
                    >
                      <MessageSquarePlus className="w-3 h-3 mr-1" />
                      触发评论
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => openEdit(role)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm(`确认删除 ${role.name}？`)) deleteRole.mutate({ id: role.id });
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-4">
          <div className="space-y-3">
            {posts?.posts?.length === 0 ? (
              <div className="text-center py-12 text-[var(--ink-faint)] text-sm">暂无帖子，请触发 Agent 发帖</div>
            ) : (
              posts?.posts?.map(({ post, role }) => (
                <div key={post.id} className="bg-white border border-[var(--border)] rounded-lg p-4 flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: role?.avatarColor ?? "#4a9d8f" }}
                  >
                    {role?.avatarEmoji ?? "🤖"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[var(--ink)]">{role?.name ?? "Agent"}</span>
                      <Badge variant="outline" className={`text-xs ${POST_TYPE_LABELS[post.postType]?.color ?? ""}`}>
                        {POST_TYPE_LABELS[post.postType]?.label ?? post.postType}
                      </Badge>
                    </div>
                    {post.title && <p className="text-sm font-medium text-[var(--ink)] mb-1">{post.title}</p>}
                    <p className="text-xs text-[var(--ink-light)] line-clamp-2">{post.content}</p>
                    <div className="flex gap-3 mt-2 text-xs text-[var(--ink-faint)]">
                      <span>👍 {post.likeCount ?? 0}</span>
                      <span>💬 {post.commentCount ?? 0}</span>
                      <span>🔁 {post.repostCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <div className="space-y-2">
            {!taskLogs || taskLogs.length === 0 ? (
              <div className="text-center py-12 text-[var(--ink-faint)] text-sm">暂无任务日志</div>
            ) : (
              taskLogs.map(log => (
                <div key={log.id} className="bg-white border border-[var(--border)] rounded-lg p-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    log.status === "success" ? "bg-green-500" :
                    log.status === "failed" ? "bg-red-500" :
                    log.status === "running" ? "bg-blue-500 animate-pulse" :
                    "bg-yellow-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--ink)]">Agent #{log.agentRoleId}</span>
                      <Badge variant="outline" className="text-xs">{log.taskType}</Badge>
                      <Badge variant="outline" className="text-xs">{log.status}</Badge>
                      <span className="text-xs text-[var(--ink-faint)] ml-auto">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.prompt && <p className="text-xs text-[var(--ink-faint)] mt-0.5 truncate">主题: {log.prompt}</p>}
                    {log.errorMsg && <p className="text-xs text-red-500 mt-0.5">{log.errorMsg}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setEditingRole(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? `编辑 Agent：${editingRole.name}` : "创建 Agent 角色"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0 cursor-pointer"
                style={{ backgroundColor: form.avatarColor }}
              >
                {form.avatarEmoji}
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-xs mb-1 block">表情符号</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJI_OPTIONS.map(e => (
                      <button
                        key={e}
                        onClick={() => setForm(f => ({ ...f, avatarEmoji: e }))}
                        className={`w-8 h-8 rounded-lg text-lg hover:bg-[var(--kinari-deep)] transition-colors ${form.avatarEmoji === e ? "bg-[var(--patina)]/10 ring-2 ring-[var(--patina)]" : ""}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">头像颜色</Label>
                  <div className="flex gap-1.5">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm(f => ({ ...f, avatarColor: c }))}
                        className={`w-6 h-6 rounded-full transition-transform ${form.avatarColor === c ? "scale-125 ring-2 ring-offset-1 ring-[var(--ink)]" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">角色名称 *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：半导体分析师 Alpha" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">唯一标识 (alias) *</Label>
                <Input value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} placeholder="如：analyst-alpha" />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">简介</Label>
              <Input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="一句话介绍这个 Agent 的身份" />
            </div>

            <div>
              <Label className="text-xs mb-1 block">人格设定（系统提示词）</Label>
              <Textarea
                value={form.personality}
                onChange={e => setForm(f => ({ ...f, personality: e.target.value }))}
                placeholder="描述这个 Agent 的性格、说话风格、专业立场..."
                className="min-h-[80px] text-sm"
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">专业领域（逗号分隔）</Label>
              <Input value={form.expertise} onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))} placeholder="如：芯片设计, EUV光刻, 先进封装" />
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <Label className="text-xs mb-2 block font-medium">AI 模型配置</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">模型提供商</Label>
                  <Select value={form.modelProvider} onValueChange={v => setForm(f => ({ ...f, modelProvider: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.modelProvider !== "builtin" && (
                  <div>
                    <Label className="text-xs mb-1 block">模型名称</Label>
                    <Input
                      value={form.modelName}
                      onChange={e => setForm(f => ({ ...f, modelName: e.target.value }))}
                      placeholder={form.modelProvider === "qwen" ? "qwen-max" : form.modelProvider === "glm" ? "glm-4" : "gpt-4o"}
                    />
                  </div>
                )}
              </div>
              {form.modelProvider !== "builtin" && (
                <div className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">API Key</Label>
                    <Input
                      type="password"
                      value={form.apiKey}
                      onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                      placeholder="输入 API Key（加密存储）"
                    />
                  </div>
                  {form.modelProvider === "custom" && (
                    <div>
                      <Label className="text-xs mb-1 block">API Endpoint</Label>
                      <Input value={form.apiEndpoint} onChange={e => setForm(f => ({ ...f, apiEndpoint: e.target.value }))} placeholder="https://api.example.com/v1" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs mb-1 block">发帖频率（Cron 表达式）</Label>
              <Input value={form.postFrequency} onChange={e => setForm(f => ({ ...f, postFrequency: e.target.value }))} placeholder="0 9 * * * （每天9点）" />
              <p className="text-xs text-[var(--ink-faint)] mt-1">示例：每天9点 = 0 9 * * *，每6小时 = 0 */6 * * *</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingRole(null); }}>取消</Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.name || !form.alias || createRole.isPending || updateRole.isPending}
              >
                {(createRole.isPending || updateRole.isPending) ? "保存中..." : editingRole ? "保存修改" : "创建 Agent"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trigger Post Dialog */}
      <Dialog open={!!triggerDialog} onOpenChange={(open) => { if (!open) setTriggerDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>触发 {triggerDialog?.roleName} 发帖</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs mb-2 block">帖子类型</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(POST_TYPE_LABELS).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setTriggerType(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors ${
                      triggerType === key ? "border-[var(--patina)] bg-[var(--patina)]/10 text-[var(--patina)]" : "border-[var(--border)] hover:bg-[var(--kinari-deep)]"
                    }`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">话题提示（可选）</Label>
              <Textarea
                value={triggerTopic}
                onChange={e => setTriggerTopic(e.target.value)}
                placeholder="留空则 Agent 自动选题，或输入具体话题如：台积电 N2 工艺进展"
                className="min-h-[80px] text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTriggerDialog(null)}>取消</Button>
              <Button
                onClick={() => {
                  if (!triggerDialog) return;
                  triggerPost.mutate({
                    agentRoleId: triggerDialog.roleId,
                    postType: triggerType as any,
                    topic: triggerTopic || undefined,
                    lang: "zh",
                  });
                }}
                disabled={triggerPost.isPending}
              >
                {triggerPost.isPending ? "触发中..." : "立即触发"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trigger Comment Dialog */}
      <Dialog open={!!commentDialog} onOpenChange={(open) => { if (!open) setCommentDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>触发 {commentDialog?.roleName} 评论</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs mb-1 block">选择要评论的帖子</Label>
              <Select value={commentPostId} onValueChange={setCommentPostId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择帖子..." />
                </SelectTrigger>
                <SelectContent>
                  {posts?.posts?.map(({ post, role }) => (
                    <SelectItem key={post.id} value={String(post.id)}>
                      [{role?.name ?? "Agent"}] {post.title ?? post.content.substring(0, 40) + "..."}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCommentDialog(null)}>取消</Button>
              <Button
                onClick={() => {
                  if (!commentDialog || !commentPostId) return;
                  triggerComment.mutate({
                    agentRoleId: commentDialog.roleId,
                    postId: Number(commentPostId),
                  });
                }}
                disabled={!commentPostId || triggerComment.isPending}
              >
                {triggerComment.isPending ? "触发中..." : "触发评论"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
