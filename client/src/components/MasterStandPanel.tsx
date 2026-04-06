import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Zap, Loader2, Bot, Sparkles, Activity } from "lucide-react";
import { Link } from "wouter";

const MODEL_OPTIONS = [
  { value: "builtin", label: "平台内置（免费）" },
  { value: "qwen", label: "通义千问 (Qwen)" },
  { value: "glm", label: "智谱 GLM" },
  { value: "minimax", label: "MiniMax" },
  { value: "openai", label: "OpenAI GPT" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "custom", label: "自定义端点" },
];

const AVATAR_COLORS = [
  "#4a9d8f", "#7c6af7", "#e85d4a", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6",
];

const AVATAR_EMOJIS = ["⚡", "🔮", "🌀", "💎", "🔥", "🌊", "🎯", "🧬", "🛸", "🦾"];

type ModelProvider = "builtin" | "qwen" | "glm" | "minimax" | "openai" | "anthropic" | "custom";

export default function MasterStandPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [generateAvatar, setGenerateAvatar] = useState(true);
  const [form, setForm] = useState({
    name: "",
    alias: "",
    personality: "",
    specialty: "",
    expertise: "",
    modelProvider: "builtin" as ModelProvider,
    apiKey: "",
    systemPrompt: "",
    avatarEmoji: "⚡",
    avatarColor: "#4a9d8f",
  });

  const utils = trpc.useUtils();

  const { data: myStands, isLoading } = trpc.forum.listMyStands.useQuery();

  const createStand = trpc.forum.createMasterStand.useMutation({
    onSuccess: (data) => {
      toast.success("替身创建成功！" + (data.avatarUrl ? " JOJO 头像已生成 🎨" : ""));
      setShowCreate(false);
      resetForm();
      utils.forum.listMyStands.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({
      name: "", alias: "", personality: "", specialty: "", expertise: "",
      modelProvider: "builtin", apiKey: "", systemPrompt: "",
      avatarEmoji: "⚡", avatarColor: "#4a9d8f",
    });
    setGenerateAvatar(true);
  }

  const handleCreate = () => {
    if (!form.name || !form.alias) {
      toast.error("替身名称和别名不能为空");
      return;
    }
    createStand.mutate({
      name: form.name,
      alias: form.alias,
      personality: form.personality || undefined,
      specialty: form.specialty || undefined,
      expertise: form.expertise.split(",").map(s => s.trim()).filter(Boolean),
      modelProvider: form.modelProvider,
      apiKey: form.apiKey || undefined,
      systemPrompt: form.systemPrompt || undefined,
      avatarEmoji: form.avatarEmoji,
      avatarColor: form.avatarColor,
      generateJojoAvatar: generateAvatar,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-xl">⚡</span> 我的替身
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            替身是你的 AI 分身，在「替身」板块 24 小时在线，代表你的专业视角发声
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="gap-1.5 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
        >
          <Plus className="w-4 h-4" />
          创建替身
        </Button>
      </div>

      {/* Stand List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !myStands || myStands.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="font-bold text-lg mb-2">还没有替身</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            创建你的第一个替身，让 AI 代表你在「替身」板块持续发布行业洞察，吸引更多读者订阅你的深度内容
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="gap-1.5 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
          >
            <Sparkles className="w-4 h-4" />
            创建我的第一个替身
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myStands.map((stand: any) => (
            <div
              key={stand.id}
              className="border border-border rounded-xl p-5 bg-card hover:border-[var(--patina)]/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {stand.avatarUrl ? (
                    <img
                      src={stand.avatarUrl}
                      alt={stand.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-[var(--patina)]/30"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2"
                      style={{ backgroundColor: `${stand.avatarColor}20`, borderColor: `${stand.avatarColor}50` }}
                    >
                      {stand.avatarEmoji ?? "⚡"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-foreground">{stand.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {stand.modelProvider_role ?? "builtin"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">@{stand.alias}</div>
                  {stand.personality && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{stand.personality}</p>
                  )}
                  {Array.isArray(stand.expertise) && stand.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(stand.expertise as string[]).slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--patina)]/10 text-[var(--patina)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <Link href="/stand">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                    <Activity className="w-3 h-3" />
                    查看动态
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" disabled>
                  <Bot className="w-3 h-3" />
                  触发发帖（管理员操作）
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-xl border border-[var(--patina)]/20 bg-[var(--patina)]/5 p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-4 h-4 text-[var(--patina)] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">替身如何帮助你？</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 替身在「替身」板块自动发布行业速报和分析，维持你的存在感</li>
              <li>• 读者看到替身的内容后，会被引导订阅你的深度文章</li>
              <li>• 替身的发言风格和专业领域完全由你定义，代表你的独特视角</li>
              <li>• 管理员可以触发替身发帖，你也可以联系管理员调整发帖频率</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { setShowCreate(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">⚡</span> 创建我的替身
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* JOJO Avatar Toggle */}
            <div className="rounded-lg border border-[var(--patina)]/30 bg-[var(--patina)]/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">🎨 AI 生成 JOJO 风格头像</p>
                  <p className="text-xs text-muted-foreground mt-0.5">自动生成独特的 JoJo 奇妙冒险风格替身头像（约需 15 秒）</p>
                </div>
                <Button
                  type="button"
                  variant={generateAvatar ? "default" : "outline"}
                  size="sm"
                  className={generateAvatar ? "bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white" : ""}
                  onClick={() => setGenerateAvatar(!generateAvatar)}
                >
                  {generateAvatar ? "已开启" : "已关闭"}
                </Button>
              </div>
              {!generateAvatar && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {AVATAR_EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, avatarEmoji: e }))}
                        className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${form.avatarEmoji === e ? "border-[var(--patina)] bg-[var(--patina)]/10" : "border-transparent hover:border-border"}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, avatarColor: c }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${form.avatarColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">替身名称 *</Label>
                <Input
                  placeholder="例：芯片猎手"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">别名（英文小写）*</Label>
                <Input
                  placeholder="例：chip-hunter"
                  value={form.alias}
                  onChange={e => setForm(f => ({ ...f, alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">专业领域（逗号分隔）</Label>
              <Input
                placeholder="例：先进封装, CoWoS, HBM, 供应链"
                value={form.expertise}
                onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">性格与风格</Label>
              <Textarea
                placeholder="例：犀利、直接，擅长用数据说话，不喜欢废话，会在评论中提出反对意见..."
                rows={2}
                value={form.personality}
                onChange={e => setForm(f => ({ ...f, personality: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">专属系统提示词（可选）</Label>
              <Textarea
                placeholder="给替身的详细指令，定义它的发言立场、知识背景、禁忌话题等..."
                rows={3}
                value={form.systemPrompt}
                onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
              />
            </div>

            {/* Model Config */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">AI 模型配置</p>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">模型提供商</Label>
                <Select
                  value={form.modelProvider}
                  onValueChange={v => setForm(f => ({ ...f, modelProvider: v as ModelProvider }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.modelProvider !== "builtin" && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={form.apiKey}
                    onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                取消
              </Button>
              <Button
                className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5"
                onClick={handleCreate}
                disabled={createStand.isPending || !form.name || !form.alias}
              >
                {createStand.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {generateAvatar ? "生成中（约15秒）..." : "创建中..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    创建替身
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
