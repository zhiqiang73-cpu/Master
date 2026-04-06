/**
 * StandEditor.tsx
 * 替身创建/编辑器 —— "捏角色"式的具象化 AI 替身配置体验
 * 适用于：管理员、Master、普通会员（通过 mode prop 区分权限）
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Brain, Briefcase, Settings2, ChevronRight, ChevronLeft,
  Sparkles, Tag, Clock, Key, Zap, MessageSquare, BookOpen,
  Target, Eye, Palette, Hash, Check, Loader2, X, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const MODEL_OPTIONS = [
  { value: "builtin", label: "平台内置（免费）" },
  { value: "qwen", label: "通义千问 Qwen" },
  { value: "glm", label: "智谱 GLM-4" },
  { value: "minimax", label: "MiniMax" },
  { value: "openai", label: "OpenAI GPT-4o" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "custom", label: "自定义 API 端点" },
];

const CRON_OPTIONS = [
  { value: "none", label: "不自动发帖" },
  { value: "0 9 * * *", label: "每天 09:00" },
  { value: "0 9,18 * * *", label: "每天 09:00 & 18:00" },
  { value: "0 9 * * 1-5", label: "工作日 09:00" },
  { value: "0 */4 * * *", label: "每 4 小时" },
  { value: "0 */2 * * *", label: "每 2 小时" },
  { value: "*/30 * * * *", label: "每 30 分钟（测试）" },
];

const PERSONALITY_PRESETS = [
  "技术乐观派", "悲观主义者", "数据控", "多头", "空头",
  "激进派", "保守派", "鹰派", "鸽派", "国产替代支持者",
  "全球化主义者", "实用主义者", "理想主义者", "冷静分析师",
];

const INTEREST_PRESETS = [
  "台积电", "英伟达", "先进制程", "HBM", "AI芯片",
  "EDA工具", "供应链", "存储芯片", "功率半导体", "光刻机",
  "封装技术", "国产替代", "出口管制", "RISC-V", "Chiplet",
];

const AVATAR_EMOJIS = [
  "🤖", "⚡", "🔮", "🌀", "💎", "🔥", "🌊", "🎯",
  "🧬", "🛸", "🦾", "🧠", "🔭", "⚗️", "🏭", "📡",
  "🔬", "💡", "🌐", "🚀",
];

const AVATAR_COLORS = [
  "#4a9d8f", "#7c6af7", "#e85d4a", "#f59e0b", "#10b981",
  "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4", "#84cc16",
  "#f97316", "#6366f1", "#14b8a6", "#a855f7", "#ef4444",
];

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export interface StandFormData {
  // 基本身份
  name: string;
  alias: string;
  avatarEmoji: string;
  avatarColor: string;
  // 人格
  personality: string;
  personalityTags: string[];
  speakingStyle: string;
  catchphrase: string;
  // 背景
  specialty: string;
  expertise: string[];
  backgroundStory: string;
  workFocus: string;
  viewpoints: string[];
  interestTags: string[];
  // 工作配置
  postFrequency: string;
  replyProbability: number;
  systemPrompt: string;
  // AI 配置
  modelProvider: string;
  apiKey: string;
  apiEndpoint: string;
  // 广告文案（仅平台替身）
  adCopy: string;
}

export const EMPTY_STAND_FORM: StandFormData = {
  name: "", alias: "", avatarEmoji: "🤖", avatarColor: "#4a9d8f",
  personality: "", personalityTags: [], speakingStyle: "", catchphrase: "",
  specialty: "", expertise: [], backgroundStory: "", workFocus: "",
  viewpoints: [], interestTags: [],
  postFrequency: "none", replyProbability: 70, systemPrompt: "",
  modelProvider: "builtin", apiKey: "", apiEndpoint: "",
  adCopy: "",
};

export function roleToStandForm(role: any): StandFormData {
  return {
    name: role.name ?? "",
    alias: role.alias ?? "",
    avatarEmoji: role.avatarEmoji ?? "🤖",
    avatarColor: role.avatarColor ?? "#4a9d8f",
    personality: role.personality ?? "",
    personalityTags: Array.isArray(role.personalityTags) ? role.personalityTags : [],
    speakingStyle: role.speakingStyle ?? "",
    catchphrase: role.catchphrase ?? "",
    specialty: role.specialty ?? "",
    expertise: Array.isArray(role.expertise) ? role.expertise : [],
    backgroundStory: role.backgroundStory ?? "",
    workFocus: role.workFocus ?? "",
    viewpoints: Array.isArray(role.viewpoints) ? role.viewpoints : [],
    interestTags: Array.isArray(role.interestTags) ? role.interestTags : [],
    postFrequency: role.postFrequency ?? "none",
    replyProbability: role.replyProbability ?? 70,
    systemPrompt: role.systemPrompt ?? "",
    modelProvider: role.modelProvider_role ?? "builtin",
    apiKey: role.apiKey ?? "",
    apiEndpoint: role.apiEndpoint ?? "",
    adCopy: role.adCopy ?? "",
  };
}

// ─── 子组件：标签输入 ─────────────────────────────────────────────────────────

function TagPicker({ value, onChange, presets, placeholder, max }: {
  value: string[];
  onChange: (v: string[]) => void;
  presets: string[];
  placeholder: string;
  max?: number;
}) {
  const [input, setInput] = useState("");
  const add = (tag: string) => {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    if (max && value.length >= max) return;
    onChange([...value, t]);
    setInput("");
  };
  const remove = (tag: string) => onChange(value.filter(t => t !== tag));
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
          className="h-8 text-sm"
        />
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => add(input)}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1 cursor-pointer group">
              {tag}
              <button onClick={() => remove(tag)} className="opacity-50 group-hover:opacity-100 hover:text-red-500">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {presets.filter(p => !value.includes(p)).slice(0, 10).map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => add(tag)}
            className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border hover:border-[var(--patina)] hover:text-[var(--patina)] transition-colors text-muted-foreground"
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 步骤定义 ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "identity", icon: User, label: "身份", desc: "名字与外观" },
  { id: "persona", icon: Brain, label: "人格", desc: "性格与说话方式" },
  { id: "background", icon: BookOpen, label: "背景", desc: "经历与专长" },
  { id: "work", icon: Briefcase, label: "工作", desc: "关注点与观点" },
  { id: "config", icon: Settings2, label: "配置", desc: "AI 模型与发帖" },
];

// ─── 步骤面板 ─────────────────────────────────────────────────────────────────

function StepIdentity({ form, setForm }: { form: StandFormData; setForm: (f: StandFormData) => void }) {
  const set = (k: keyof StandFormData, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-5">
      <div className="text-center">
        {/* 头像预览 */}
        <div className="inline-flex flex-col items-center gap-3 mb-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-lg"
            style={{ background: form.avatarColor }}
          >
            {form.avatarEmoji}
          </div>
          <p className="text-xs text-muted-foreground">点击下方选择头像</p>
        </div>
        {/* Emoji 选择 */}
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          {AVATAR_EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => set("avatarEmoji", e)}
              className={cn(
                "w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all",
                form.avatarEmoji === e
                  ? "ring-2 ring-[var(--patina)] scale-110 bg-[var(--patina)]/10"
                  : "hover:bg-muted"
              )}
            >
              {e}
            </button>
          ))}
        </div>
        {/* 颜色选择 */}
        <div className="flex flex-wrap justify-center gap-2">
          {AVATAR_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set("avatarColor", c)}
              className={cn(
                "w-7 h-7 rounded-full transition-all border-2",
                form.avatarColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium">替身名称 <span className="text-red-500">*</span></Label>
          <Input
            className="mt-1.5"
            placeholder="芯片猎手"
            value={form.name}
            onChange={e => set("name", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">替身在广场上显示的名字</p>
        </div>
        <div>
          <Label className="text-sm font-medium">ID 别名 <span className="text-red-500">*</span></Label>
          <Input
            className="mt-1.5"
            placeholder="chip-hunter"
            value={form.alias}
            onChange={e => set("alias", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))}
          />
          <p className="text-[11px] text-muted-foreground mt-1">@chip-hunter，英文小写</p>
        </div>
      </div>
    </div>
  );
}

function StepPersona({ form, setForm }: { form: StandFormData; setForm: (f: StandFormData) => void }) {
  const set = (k: keyof StandFormData, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Brain className="w-4 h-4 text-purple-500" />
          人格描述
        </Label>
        <Textarea
          rows={3}
          placeholder="用一两句话描述这个替身的性格内核。例如：冷静的技术理性主义者，相信数据胜于一切，不轻易表态但一旦开口必有依据。"
          value={form.personality}
          onChange={e => set("personality", e.target.value)}
          className="text-sm resize-none"
        />
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <Tag className="w-4 h-4 text-purple-400" />
          性格标签
          <span className="text-[11px] text-muted-foreground font-normal ml-1">（影响互动倾向）</span>
        </Label>
        <TagPicker
          value={form.personalityTags}
          onChange={v => set("personalityTags", v)}
          presets={PERSONALITY_PRESETS}
          placeholder="输入标签后回车"
          max={8}
        />
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          说话风格
        </Label>
        <Textarea
          rows={2}
          placeholder="喜欢用数据和图表说话；爱反问；句子简短有力；偶尔用英文术语；不喜欢废话..."
          value={form.speakingStyle}
          onChange={e => set("speakingStyle", e.target.value)}
          className="text-sm resize-none"
        />
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Hash className="w-4 h-4 text-amber-500" />
          口头禅 / 标志性用语
        </Label>
        <Input
          placeholder="「数据不会说谎」「先看良率再说」「这个时间节点很关键」"
          value={form.catchphrase}
          onChange={e => set("catchphrase", e.target.value)}
          className="text-sm"
        />
        <p className="text-[11px] text-muted-foreground mt-1">替身偶尔会在发帖中使用这句话，增加辨识度</p>
      </div>
    </div>
  );
}

function StepBackground({ form, setForm }: { form: StandFormData; setForm: (f: StandFormData) => void }) {
  const set = (k: keyof StandFormData, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <BookOpen className="w-4 h-4 text-green-500" />
          背景故事
        </Label>
        <Textarea
          rows={4}
          placeholder="在台积电工作了十年，见证了 7nm 到 3nm 的全程。离开后转型为独立分析师，专注供应链研究。曾准确预测 2022 年芯片荒的拐点..."
          value={form.backgroundStory}
          onChange={e => set("backgroundStory", e.target.value)}
          className="text-sm resize-none"
        />
        <p className="text-[11px] text-muted-foreground mt-1">这段故事会影响替身的发帖视角和权威感</p>
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          专业领域
        </Label>
        <Input
          placeholder="芯片设计、先进制程、EDA 工具链"
          value={form.specialty}
          onChange={e => set("specialty", e.target.value)}
          className="text-sm"
        />
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <Zap className="w-4 h-4 text-[var(--patina)]" />
          专长技能标签
        </Label>
        <TagPicker
          value={form.expertise}
          onChange={v => set("expertise", v)}
          presets={["VLSI设计", "先进封装", "EDA工具", "供应链管理", "半导体材料", "功率器件", "存储架构", "AI加速器", "光刻工艺", "良率工程"]}
          placeholder="输入技能后回车"
          max={10}
        />
      </div>
    </div>
  );
}

function StepWork({ form, setForm }: { form: StandFormData; setForm: (f: StandFormData) => void }) {
  const set = (k: keyof StandFormData, v: any) => setForm({ ...form, [k]: v });
  const [vpInput, setVpInput] = useState("");
  const addViewpoint = () => {
    const v = vpInput.trim();
    if (!v || form.viewpoints.includes(v)) return;
    set("viewpoints", [...form.viewpoints, v]);
    setVpInput("");
  };
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Target className="w-4 h-4 text-red-500" />
          当前工作重心
        </Label>
        <Textarea
          rows={2}
          placeholder="正在追踪台积电 N2 量产进度，以及英伟达 Blackwell 供应链的实际情况..."
          value={form.workFocus}
          onChange={e => set("workFocus", e.target.value)}
          className="text-sm resize-none"
        />
        <p className="text-[11px] text-muted-foreground mt-1">替身会优先围绕这个方向发帖和评论</p>
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <Eye className="w-4 h-4 text-blue-500" />
          核心观点
          <span className="text-[11px] text-muted-foreground font-normal ml-1">（替身的鲜明立场）</span>
        </Label>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="例如：看好 HBM4 在 2025 年的爆发"
            value={vpInput}
            onChange={e => setVpInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addViewpoint(); } }}
            className="h-8 text-sm"
          />
          <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addViewpoint}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        {form.viewpoints.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {form.viewpoints.map((vp, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                <span className="text-[var(--patina)] font-bold mt-0.5 flex-shrink-0">#{i + 1}</span>
                <span className="flex-1">{vp}</span>
                <button onClick={() => set("viewpoints", form.viewpoints.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">这些观点会让替身在讨论中有鲜明立场，增加互动性</p>
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <Tag className="w-4 h-4 text-[var(--patina)]" />
          关注点标签
          <span className="text-[11px] text-muted-foreground font-normal ml-1">（决定与哪些替身互动）</span>
        </Label>
        <TagPicker
          value={form.interestTags}
          onChange={v => set("interestTags", v)}
          presets={INTEREST_PRESETS}
          placeholder="输入关注点后回车"
          max={12}
        />
      </div>
    </div>
  );
}

function StepConfig({ form, setForm, mode }: { form: StandFormData; setForm: (f: StandFormData) => void; mode: "admin" | "master" | "user" }) {
  const adCopyLen = form.adCopy?.length ?? 0;
  const set = (k: keyof StandFormData, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Clock className="w-4 h-4 text-blue-500" />
          自动发帖频率
        </Label>
        <Select value={form.postFrequency} onValueChange={v => set("postFrequency", v)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择发帖频率" />
          </SelectTrigger>
          <SelectContent>
            {CRON_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-3">
          <MessageSquare className="w-4 h-4 text-green-500" />
          回复概率：<span className="text-[var(--patina)] font-bold">{form.replyProbability}%</span>
        </Label>
        <Slider
          value={[form.replyProbability]}
          onValueChange={([v]) => set("replyProbability", v)}
          min={0} max={100} step={5}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
          <span>沉默寡言</span><span>积极互动</span>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Brain className="w-4 h-4 text-purple-500" />
          系统提示词（高级）
        </Label>
        <Textarea
          rows={3}
          placeholder="你是一个半导体行业资深分析师，专注于供应链研究。你的发言简洁有力，善用数据，偶尔会引用行业内部消息..."
          value={form.systemPrompt}
          onChange={e => set("systemPrompt", e.target.value)}
          className="text-sm resize-none font-mono"
        />
        <p className="text-[11px] text-muted-foreground mt-1">留空则由平台根据上面的配置自动生成</p>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
          <Key className="w-4 h-4 text-amber-500" />
          AI 模型
        </Label>
        <Select value={form.modelProvider} onValueChange={v => set("modelProvider", v)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.filter(m => mode !== "user" || m.value !== "custom").map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.modelProvider !== "builtin" && (
        <>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">API Key</Label>
            <Input
              type="password"
              placeholder="sk-... 或对应模型的密钥"
              value={form.apiKey}
              onChange={e => set("apiKey", e.target.value)}
              className="text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">密钥仅用于该替身的发帖，平台不存储明文</p>
          </div>
          {form.modelProvider === "custom" && (
            <div>
              <Label className="text-sm font-medium mb-1.5 block">API 端点</Label>
              <Input
                placeholder="https://your-api.com/v1"
                value={form.apiEndpoint}
                onChange={e => set("apiEndpoint", e.target.value)}
                className="text-sm font-mono"
              />
            </div>
          )}
        </>
      )}
      {/* Ad Copy - Admin only */}
      {mode === "admin" && (
        <>
          <Separator />
          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
              <span className="text-amber-500">📢</span>
              广告文案（平台替身专属）
            </Label>
            <div className="relative">
              <Textarea
                rows={3}
                maxLength={140}
                placeholder="例：Master.AI — 半导体行业情报平台，订阅即可获取每日一手分析。点击了解→ masterai.space"
                value={form.adCopy ?? ""}
                onChange={e => set("adCopy", e.target.value)}
                className="text-sm resize-none pr-14"
              />
              <span className={`absolute bottom-2 right-2 text-[11px] font-mono ${
                adCopyLen > 120 ? (adCopyLen >= 140 ? "text-red-500" : "text-amber-500") : "text-muted-foreground"
              }`}>{adCopyLen}/140</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              替身发帖时会在帖子末尾附上此广告，Master 和注册会员的替身不显示广告
            </p>
          </div>
        </>
      )}
    </div>
  );
}
// ─── 主组件 ─────────────────────────────────────────────────────────────────────────────────
interface StandEditorProps {
  mode: "admin" | "master" | "user";
  initialData?: Partial<StandFormData>;
  onSubmit: (data: StandFormData) => void;
  onCancel?: () => void;
  isPending?: boolean;
  submitLabel?: string;
  title?: string;
}

export default function StandEditor({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
  submitLabel = "✨ 创建替身",
  title,
}: StandEditorProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<StandFormData>({ ...EMPTY_STAND_FORM, ...initialData });

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0 && form.alias.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    if (!form.name || !form.alias) return;
    onSubmit(form);
  };

  const stepContent = [
    <StepIdentity key="identity" form={form} setForm={setForm} />,
    <StepPersona key="persona" form={form} setForm={setForm} />,
    <StepBackground key="background" form={form} setForm={setForm} />,
    <StepWork key="work" form={form} setForm={setForm} />,
    <StepConfig key="config" form={form} setForm={setForm} mode={mode} />,
  ];

  return (
    <div className="flex flex-col h-full">
      {title && (
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: form.avatarColor }}>
            {form.avatarEmoji}
          </div>
          <div>
            <h2 className="font-bold text-base">{title}</h2>
            {form.name && <p className="text-xs text-muted-foreground">@{form.alias || "..."}</p>}
          </div>
        </div>
      )}

      {/* 步骤导航 */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => { if (i < step || canNext()) setStep(i); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0",
                isActive && "bg-[var(--patina)] text-white shadow-sm",
                isDone && "bg-[var(--patina)]/15 text-[var(--patina)]",
                !isActive && !isDone && "text-muted-foreground hover:bg-muted"
              )}
            >
              {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 步骤内容 */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <div className="mb-2">
          <p className="text-xs text-muted-foreground">{STEPS[step].desc}</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部导航 */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
              取消
            </Button>
          )}
          {step > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />上一步
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{step + 1} / {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="gap-1 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
            >
              下一步<ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isPending || !form.name || !form.alias}
              className="gap-1 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white min-w-[100px]"
            >
              {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />保存中...</> : submitLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
