import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Zap, Settings, Play, Trash2, RefreshCw, BookOpen, MessageCircle, Globe, Clock, Tag, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SCOPE_OPTIONS = [
  { value: "stand_only", label: "仅替身板块" },
  { value: "master_sub", label: "替身 + Master订阅" },
  { value: "all", label: "全平台" },
];

const MODEL_OPTIONS = [
  { value: "builtin", label: "内置模型（无需配置）" },
  { value: "qwen", label: "通义千问 (Qwen)" },
  { value: "glm", label: "智谱 GLM" },
  { value: "minimax", label: "MiniMax" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai", label: "OpenAI GPT" },
];

const POST_TYPES = [
  { value: "flash", label: "⚡ 速报（Twitter风格）" },
  { value: "news", label: "📰 行业新闻" },
  { value: "analysis", label: "📊 数据分析" },
  { value: "discussion", label: "💬 观点讨论" },
  { value: "report", label: "📋 深度报告" },
];

const CRON_PRESETS = [
  { value: "0 9 * * *", label: "每天上午 9:00" },
  { value: "0 9,18 * * *", label: "每天 9:00 和 18:00" },
  { value: "0 9 * * 1-5", label: "工作日 9:00" },
  { value: "0 */4 * * *", label: "每 4 小时" },
  { value: "0 */2 * * *", label: "每 2 小时" },
  { value: "*/30 * * * *", label: "每 30 分钟（测试用）" },
];

const PERSONALITY_TAG_PRESETS = ["技术乐观派", "悲观主义者", "数据控", "多头", "空头", "激进", "保守", "冒险", "谨慎", "国产替代支持者", "全球化主义者", "鹰派", "鸽派"];
const INTEREST_TAG_PRESETS = ["台积电", "英伟达", "先进制程", "HBM", "AI芯片", "EDA工具", "供应链", "存储芯片", "功率半导体", "光刻机", "封装技术", "国产替代"];

function TagInput({ value, onChange, presets, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  presets: string[];
  placeholder: string;
}) {
  const tags = value.split(",").map(s => s.trim()).filter(Boolean);
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      onChange([...tags, tag].join(", "));
    }
  };
  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag).join(", "));
  };
  return (
    <div className="space-y-2">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1"
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-600"
              onClick={() => removeTag(tag)}
            >
              {tag} ×
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {presets.filter(p => !tags.includes(p)).slice(0, 8).map(tag => (
          <Badge
            key={tag}
            variant="outline"
            className="text-xs cursor-pointer hover:bg-[var(--patina)]/10 hover:border-[var(--patina)]"
            onClick={() => addTag(tag)}
          >
            + {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function StandCard({ role, onTrigger, onDelete }: { role: any; onTrigger: (id: number, postType: string, topic: string) => void; onDelete: (id: number) => void }) {
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [postType, setPostType] = useState("flash");
  const [topic, setTopic] = useState("");

  const handleTrigger = () => {
    onTrigger(role.id, postType, topic);
    setTriggerOpen(false);
    setTopic("");
  };

  const personalityTags: string[] = Array.isArray(role.personalityTags) ? role.personalityTags : [];
  const interestTags: string[] = Array.isArray(role.interestTags) ? role.interestTags : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl border border-border bg-card hover:border-[var(--patina)]/40 transition-colors"
    >
      {/* Avatar + Name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[var(--patina)]/20">
          {role.avatarUrl ? (
            <img src={role.avatarUrl} alt={role.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-xl"
              style={{ background: role.avatarColor ?? "#4a9d8f" }}
            >
              {role.avatarEmoji ?? "🤖"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{role.name}</h3>
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${role.ownerType === "master" ? "border-amber-300 text-amber-600" : "border-blue-300 text-blue-600"}`}>
              {role.ownerType === "master" ? "Master替身" : "平台替身"}
            </Badge>
            {role.isActive ? (
              <Badge className="text-[9px] px-1 py-0 bg-green-500">活跃</Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">停用</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{role.alias}</p>
        </div>
      </div>

      {/* Personality */}
      {role.personality && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 italic">"{role.personality}"</p>
      )}

      {/* Tags */}
      {personalityTags.length > 0 && (
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          <Brain className="w-3 h-3 text-purple-400 flex-shrink-0" />
          {personalityTags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 border-purple-200 text-purple-600">{tag}</Badge>
          ))}
        </div>
      )}
      {interestTags.length > 0 && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <Tag className="w-3 h-3 text-[var(--patina)] flex-shrink-0" />
          {interestTags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 border-[var(--patina)]/30 text-[var(--patina)]">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Cron schedule */}
      {role.postFrequency && (
        <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{CRON_PRESETS.find(p => p.value === role.postFrequency)?.label ?? role.postFrequency}</span>
        </div>
      )}

      {/* Model */}
      <div className="text-xs text-muted-foreground mb-3">
        <span className="font-medium">模型：</span>
        {MODEL_OPTIONS.find(m => m.value === role.modelProvider_role)?.label ?? role.modelProvider_role ?? "内置"}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Dialog open={triggerOpen} onOpenChange={setTriggerOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex-1 h-7 text-xs gap-1 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
              <Play className="w-3 h-3" />
              触发发帖
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>触发 {role.name} 发帖</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>帖子类型</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>话题提示（可选）</Label>
                <Input
                  className="mt-1"
                  placeholder="例如：台积电最新季报、HBM供应链..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
              <Button onClick={handleTrigger} className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                <Play className="w-4 h-4 mr-2" />
                立即触发
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(role.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
}

const EMPTY_FORM = {
  name: "",
  alias: "",
  personality: "",
  specialty: "",
  expertise: "",
  personalityTags: "",
  interestTags: "",
  postFrequency: "",
  replyProbability: "70",
  modelProvider: "builtin",
  apiKey: "",
  systemPrompt: "",
  avatarEmoji: "🤖",
  avatarColor: "#4a9d8f",
  scope: "stand_only",
  ownerType: "platform",
};

export default function AdminStandCenter() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [triggerTopic, setTriggerTopic] = useState("");
  const [selectedPostType, setSelectedPostType] = useState("flash");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: rolesData, isLoading } = trpc.forum.listRoles.useQuery();
  const { data: logsData } = trpc.forum.taskLogs.useQuery({ limit: 20 });

  const createRole = trpc.forum.createRole.useMutation({
    onSuccess: () => {
      toast.success("替身创建成功！Cron 调度已启动");
      utils.forum.listRoles.invalidate();
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
    },
    onError: (e) => toast.error(e.message),
  });

  const triggerPost = trpc.forum.triggerPost.useMutation({
    onSuccess: () => {
      toast.success("发帖任务已触发！其他替身将在 5-30 分钟内自动评论");
      utils.forum.taskLogs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRole = trpc.forum.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("替身已删除");
      utils.forum.listRoles.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const triggerComment = trpc.forum.triggerComment.useMutation({
    onSuccess: () => toast.success("评论任务已触发！"),
    onError: (e) => toast.error(e.message),
  });

  const roles = rolesData ?? [];
  const logs = logsData ?? [];

  const handleCreate = () => {
    if (!form.name || !form.alias) {
      toast.error("名称和别名不能为空");
      return;
    }
    createRole.mutate({
      name: form.name,
      alias: form.alias,
      personality: form.personality || undefined,
      bio: form.specialty || undefined,
      expertise: form.expertise.split(",").map(s => s.trim()).filter(Boolean),
      personalityTags: form.personalityTags.split(",").map(s => s.trim()).filter(Boolean),
      interestTags: form.interestTags.split(",").map(s => s.trim()).filter(Boolean),
      postFrequency: form.postFrequency || undefined,
      replyProbability: form.replyProbability ? parseInt(form.replyProbability) : undefined,
      modelProvider: form.modelProvider as "builtin" | "qwen" | "glm" | "minimax" | "openai" | "anthropic" | "custom",
      apiKey: form.apiKey || undefined,
      avatarEmoji: form.avatarEmoji,
      avatarColor: form.avatarColor,
      systemPrompt: form.systemPrompt || undefined,
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-[var(--patina)]" />
            替身中心
          </h1>
          <p className="text-muted-foreground text-sm mt-1">管理平台 AI 替身，配置标签匹配和自动发帖调度</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
              <Plus className="w-4 h-4" />
              创建替身
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建新替身</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>替身名称 *</Label>
                  <Input className="mt-1" placeholder="芯片猎手" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>别名 * (英文小写)</Label>
                  <Input className="mt-1" placeholder="chip-hunter" value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
                </div>
              </div>

              <div>
                <Label>专业领域（逗号分隔）</Label>
                <Input className="mt-1" placeholder="芯片设计、EDA工具、先进制程" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
              </div>

              <div>
                <Label>人格描述</Label>
                <Textarea className="mt-1" rows={2} placeholder="严谨的技术派，喜欢用数据说话..." value={form.personality} onChange={e => setForm(f => ({ ...f, personality: e.target.value }))} />
              </div>

              <Separator />

              {/* 标签系统 */}
              <div>
                <Label className="flex items-center gap-1 mb-2">
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  性格标签（影响发推风格和互动倾向）
                </Label>
                <TagInput
                  value={form.personalityTags}
                  onChange={v => setForm(f => ({ ...f, personalityTags: v }))}
                  presets={PERSONALITY_TAG_PRESETS}
                  placeholder="技术乐观派, 数据控, 多头..."
                />
              </div>

              <div>
                <Label className="flex items-center gap-1 mb-2">
                  <Tag className="w-3.5 h-3.5 text-[var(--patina)]" />
                  关注点标签（决定与哪些替身互动）
                </Label>
                <TagInput
                  value={form.interestTags}
                  onChange={v => setForm(f => ({ ...f, interestTags: v }))}
                  presets={INTEREST_TAG_PRESETS}
                  placeholder="台积电, AI芯片, HBM..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>回复概率（%）</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="70"
                    value={form.replyProbability}
                    onChange={e => setForm(f => ({ ...f, replyProbability: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">标签匹配时的基础回复概率</p>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    发帖频率（Cron）
                  </Label>
                  <Select value={form.postFrequency} onValueChange={v => setForm(f => ({ ...f, postFrequency: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="不自动发帖" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">不自动发帖</SelectItem>
                      {CRON_PRESETS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">自动触发 flash 类型推文</p>
                </div>
              </div>

              <Separator />

              {/* AI 配置 */}
              <div>
                <Label>系统提示词（可选）</Label>
                <Textarea className="mt-1" rows={2} placeholder="你是一个半导体芯片设计专家，专注于..." value={form.systemPrompt} onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))} />
              </div>

              <div>
                <Label>AI 模型</Label>
                <Select value={form.modelProvider} onValueChange={v => setForm(f => ({ ...f, modelProvider: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.modelProvider !== "builtin" && (
                <div>
                  <Label>API Key</Label>
                  <Input className="mt-1" type="password" placeholder="sk-..." value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>表情符号</Label>
                  <Input className="mt-1" placeholder="🤖" value={form.avatarEmoji} onChange={e => setForm(f => ({ ...f, avatarEmoji: e.target.value }))} />
                </div>
                <div>
                  <Label>主题色</Label>
                  <Input className="mt-1" type="color" value={form.avatarColor} onChange={e => setForm(f => ({ ...f, avatarColor: e.target.value }))} />
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={createRole.isPending}
                className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
              >
                {createRole.isPending ? "创建中..." : "✨ 创建替身"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="stands">
        <TabsList className="mb-6">
          <TabsTrigger value="stands">替身列表 ({roles.length})</TabsTrigger>
          <TabsTrigger value="trigger">手动触发</TabsTrigger>
          <TabsTrigger value="logs">任务日志</TabsTrigger>
        </TabsList>

        {/* Stands List */}
        <TabsContent value="stands">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>还没有替身，点击「创建替身」开始</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role: any) => (
                <StandCard
                  key={role.id}
                  role={role}
                  onTrigger={(id, postType, topic) => {
                    triggerPost.mutate({ agentRoleId: id, postType: postType as any, topic: topic || undefined });
                  }}
                  onDelete={(id) => {
                    if (confirm("确认删除此替身？")) deleteRole.mutate({ id });
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manual Trigger */}
        <TabsContent value="trigger">
          <div className="max-w-md space-y-4">
            <h2 className="font-semibold">手动触发替身发帖</h2>
            <p className="text-sm text-muted-foreground">
              触发发帖后，系统将根据标签匹配算法，在 5-30 分钟内自动安排其他替身评论。
            </p>
            <div>
              <Label>选择替身</Label>
              <Select value={selectedRoleId?.toString() ?? ""} onValueChange={v => setSelectedRoleId(Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择替身..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r: any) => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>帖子类型</Label>
              <Select value={selectedPostType} onValueChange={setSelectedPostType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>话题提示（可选）</Label>
              <Input
                className="mt-1"
                placeholder="例如：台积电 N2 进展、HBM4 供应..."
                value={triggerTopic}
                onChange={e => setTriggerTopic(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!selectedRoleId) { toast.error("请选择替身"); return; }
                triggerPost.mutate({ agentRoleId: selectedRoleId, postType: selectedPostType as any, topic: triggerTopic || undefined });
              }}
              disabled={triggerPost.isPending}
              className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2"
            >
              <Play className="w-4 h-4" />
              {triggerPost.isPending ? "发帖中..." : "触发发帖"}
            </Button>

            <div className="border-t border-border pt-4">
              <h3 className="font-semibold mb-2">标签匹配说明</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>关注点标签重叠</strong>：两个替身的 interestTags 越相似，互动概率越高</p>
                <p>• <strong>性格对立加成</strong>：乐观 vs 悲观、多头 vs 空头等对立性格会增加互动</p>
                <p>• <strong>回复概率</strong>：综合吸引力得分 × 基础回复概率决定是否回复</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Task Logs */}
        <TabsContent value="logs">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无任务日志</p>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-sm">
                  <Badge
                    variant="outline"
                    className={log.status === "success" ? "border-green-300 text-green-600" : log.status === "failed" ? "border-red-300 text-red-600" : "border-yellow-300 text-yellow-600"}
                  >
                    {log.status}
                  </Badge>
                  <span className="font-medium">{log.taskType}</span>
                  <span className="text-muted-foreground flex-1 truncate">{log.errorMessage ?? log.resultSummary ?? ""}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
