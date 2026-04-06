import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

const MODEL_OPTIONS = [
  { value: "builtin", label: "内置 LLM（免配置）", placeholder: "" },
  { value: "qwen", label: "阿里通义千问 (Qwen)", placeholder: "qwen-max" },
  { value: "glm", label: "智谱 GLM", placeholder: "glm-4" },
  { value: "minimax", label: "MiniMax", placeholder: "abab6.5s-chat" },
  { value: "openai", label: "OpenAI", placeholder: "gpt-4o" },
  { value: "anthropic", label: "Anthropic Claude", placeholder: "claude-3-5-sonnet" },
  { value: "custom", label: "自定义 API", placeholder: "" },
] as const;

type Provider = typeof MODEL_OPTIONS[number]["value"];

export default function AiAssistantPanel() {
  const [step, setStep] = useState<"basic" | "model" | "prompts">("basic");
  const [form, setForm] = useState({
    displayName: "",
    alias: "",
    bio: "",
    expertise: "",
    researchTopics: "",
    llmProvider: "builtin" as Provider,
    llmApiKey: "",
    llmBaseUrl: "",
    llmModel: "",
    systemPrompt: "",
    researchPrompt: "",
    writingPrompt: "",
  });

  const createMutation = trpc.articles.createAiAssistant.useMutation({
    onSuccess: () => {
      toast.success("成功创建 AI 助手 Master！");
      setForm({
        displayName: "", alias: "", bio: "", expertise: "", researchTopics: "",
        llmProvider: "builtin", llmApiKey: "", llmBaseUrl: "", llmModel: "",
        systemPrompt: "", researchPrompt: "", writingPrompt: "",
      });
      setStep("basic");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const selectedModel = MODEL_OPTIONS.find(m => m.value === form.llmProvider);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--patina)]" />
          创建 AI 助手 Master
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          配置一个属于您的 AI 虚拟 Master，它将按照您设定的方向自动收集资料并撰写洞察文章。
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-6 bg-muted/40 p-1 rounded-lg">
        {(["basic", "model", "prompts"] as const).map((tab, i) => (
          <button
            key={tab}
            onClick={() => setStep(tab)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
              step === tab ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {i + 1}. {tab === "basic" ? "基本信息" : tab === "model" ? "AI 模型" : "提示词"}
          </button>
        ))}
      </div>

      {step === "basic" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">显示名称 *</Label>
              <Input
                placeholder="如：先进封装观察者"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">唯一别名 *</Label>
              <Input
                placeholder="如：advanced-packaging-ai"
                value={form.alias}
                onChange={e => setForm(f => ({ ...f, alias: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">简介</Label>
            <Textarea
              placeholder="描述这个 AI Master 的专长和研究方向..."
              rows={3}
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">专长领域（逗号分隔）</Label>
            <Input
              placeholder="先进封装, CoWoS, HBM, 存储芯片..."
              value={form.expertise}
              onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">研究方向关键词（逗号分隔）</Label>
            <Input
              placeholder="英伟达 CoWoS, 台积电 N2, 山安光子 EUV..."
              value={form.researchTopics}
              onChange={e => setForm(f => ({ ...f, researchTopics: e.target.value }))}
            />
          </div>
          <Button
            className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
            onClick={() => setStep("model")}
            disabled={!form.displayName || !form.alias}
          >
            下一步：配置 AI 模型 →
          </Button>
        </div>
      )}

      {step === "model" && (
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">选择 AI 模型提供商</Label>
            <div className="grid grid-cols-2 gap-2">
              {MODEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, llmProvider: opt.value }))}
                  className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                    form.llmProvider === opt.value
                      ? "border-[var(--patina)] bg-[var(--patina)]/5 text-foreground"
                      : "border-border hover:border-[var(--patina)]/50 text-muted-foreground"
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  {opt.placeholder && (
                    <div className="text-muted-foreground/60 mt-0.5">如：{opt.placeholder}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {form.llmProvider !== "builtin" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">API Key</Label>
                <Input
                  type="password"
                  placeholder={`输入 ${selectedModel?.label} 的 API Key`}
                  value={form.llmApiKey}
                  onChange={e => setForm(f => ({ ...f, llmApiKey: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground/60 mt-1">密钥将加密存储，仅用于 AI 调用</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">模型名称</Label>
                  <Input
                    placeholder={selectedModel?.placeholder ?? ""}
                    value={form.llmModel}
                    onChange={e => setForm(f => ({ ...f, llmModel: e.target.value }))}
                  />
                </div>
                {form.llmProvider === "custom" && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">API 端点 URL</Label>
                    <Input
                      placeholder="https://api.example.com/v1"
                      value={form.llmBaseUrl}
                      onChange={e => setForm(f => ({ ...f, llmBaseUrl: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("basic")}>← 返回</Button>
            <Button
              className="flex-1 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
              onClick={() => setStep("prompts")}
            >
              下一步：个性化提示词 →
            </Button>
          </div>
        </div>
      )}

      {step === "prompts" && (
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              系统提示词（定义 AI Master 的个性和专长）
            </Label>
            <Textarea
              placeholder="例：你是一位专注于先进封装技术的半导体行业分析师。你擅长分析 CoWoS、SoIC、Chiplet 等封装技术的市场影响，并能用深入浅出的方式向行业从业者传递洞察..."
              rows={4}
              value={form.systemPrompt}
              onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              研究收集提示词（指导如何搜集资料）
            </Label>
            <Textarea
              placeholder="例：请搜集最近 7 天内关于 {topic} 的最新动态，包括上市公司公告、学术论文、行业报告和新闻资讯..."
              rows={3}
              value={form.researchPrompt}
              onChange={e => setForm(f => ({ ...f, researchPrompt: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              撰写提示词（指导文章风格）
            </Label>
            <Textarea
              placeholder="例：请基于收集的资料撰写一篇 800-1200 字的洞察文章。风格要求：开头必须有核心观点，数据支撑论断，结尾给出行动建议..."
              rows={3}
              value={form.writingPrompt}
              onChange={e => setForm(f => ({ ...f, writingPrompt: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("model")}>← 返回</Button>
            <Button
              className="flex-1 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-1.5"
              disabled={createMutation.isPending}
              onClick={() => {
                createMutation.mutate({
                  displayName: form.displayName,
                  alias: form.alias,
                  bio: form.bio || undefined,
                  expertise: form.expertise.split(",").map(s => s.trim()).filter(Boolean),
                  llmProvider: form.llmProvider,
                  llmApiKey: form.llmApiKey || undefined,
                  llmBaseUrl: form.llmBaseUrl || undefined,
                  llmModel: form.llmModel || undefined,
                  systemPrompt: form.systemPrompt || undefined,
                  researchPrompt: form.researchPrompt || undefined,
                  writingPrompt: form.writingPrompt || undefined,
                  researchTopics: form.researchTopics.split(",").map(s => s.trim()).filter(Boolean),
                });
              }}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              创建 AI Master
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
