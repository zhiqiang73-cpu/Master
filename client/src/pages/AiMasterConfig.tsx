import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Key, Cpu, BookOpen, Settings, Plus, X, Zap, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const MODEL_PROVIDERS = [
  {
    value: "builtin",
    label: "Manus 内置 LLM",
    description: "无需配置，开箱即用",
    icon: "🤖",
    models: ["默认模型"],
    requiresKey: false,
  },
  {
    value: "qwen",
    label: "阿里通义千问",
    description: "Qwen-Max / Qwen-Plus / Qwen-Turbo",
    icon: "🌐",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long"],
    requiresKey: true,
    keyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://help.aliyun.com/zh/dashscope/developer-reference/api-details",
  },
  {
    value: "glm",
    label: "智谱 GLM",
    description: "GLM-4 / GLM-4-Flash / GLM-3-Turbo",
    icon: "🧠",
    models: ["glm-4", "glm-4-flash", "glm-3-turbo"],
    requiresKey: true,
    keyPlaceholder: "xxxxxxxx.xxxxxxxxxxxxxxxx",
    docsUrl: "https://open.bigmodel.cn/dev/api",
  },
  {
    value: "minimax",
    label: "MiniMax",
    description: "abab6.5s / abab5.5s",
    icon: "⚡",
    models: ["abab6.5s-chat", "abab5.5s-chat"],
    requiresKey: true,
    keyPlaceholder: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    docsUrl: "https://api.minimax.chat/document/introduction",
  },
  {
    value: "openai",
    label: "OpenAI",
    description: "GPT-4o / GPT-4 Turbo / GPT-3.5",
    icon: "🔮",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    requiresKey: true,
    keyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    value: "anthropic",
    label: "Anthropic Claude",
    description: "Claude-3.5 Sonnet / Claude-3 Opus",
    icon: "🎭",
    models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
    requiresKey: true,
    keyPlaceholder: "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    value: "custom",
    label: "自定义 API",
    description: "兼容 OpenAI 格式的任意 API",
    icon: "🔧",
    models: [],
    requiresKey: true,
    keyPlaceholder: "your-api-key",
    requiresEndpoint: true,
  },
];

const DEFAULT_SYSTEM_PROMPT = `你是一位专注于半导体行业的深度分析师和知识传播者。你的专长是将复杂的技术趋势和市场动态转化为清晰、有价值的洞察文章。

你的写作风格：
- 客观、专业，基于公开数据和行业判断
- 深入浅出，让不同背景的读者都能理解
- 注重实用性，提供可操作的洞察
- 保持独立性，不受商业利益影响

你遵守的原则：
- 只使用公开信息，不披露任何保密数据
- 明确区分事实和判断
- 对不确定的信息保持谨慎`;

const DEFAULT_RESEARCH_PROMPT = `请收集关于以下主题的最新公开信息：
1. 最新行业新闻（过去7天）
2. 重要技术突破和产品发布
3. 市场数据和分析报告
4. 主要企业动态和战略调整
5. 政策法规变化

请整理成结构化的研究摘要，标注信息来源和时间。`;

const DEFAULT_WRITING_PROMPT = `基于提供的研究资料，撰写一篇专业的行业洞察文章：

要求：
- 标题：吸引人，体现核心洞察
- 摘要：100字以内，概括核心观点
- 正文：1500-3000字，结构清晰
- 包含：背景分析、关键数据、趋势判断、影响评估
- 结尾：对读者的实际建议或展望

格式：Markdown，使用标题、列表、重点标注等`;

export default function AiMasterConfig() {
  const { user, isAuthenticated } = useAuth();
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("builtin");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [researchPrompt, setResearchPrompt] = useState(DEFAULT_RESEARCH_PROMPT);
  const [writingPrompt, setWritingPrompt] = useState(DEFAULT_WRITING_PROMPT);
  const [autoPublish, setAutoPublish] = useState(false);
  const [targetLangs, setTargetLangs] = useState<string[]>(["zh", "en", "ja"]);

  const { data: config, isLoading } = trpc.aiConfig.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const saveMutation = trpc.aiConfig.save.useMutation({
    onSuccess: () => toast.success("AI 配置已保存"),
    onError: (err) => toast.error("保存失败：" + err.message),
  });

  useEffect(() => {
    if (config) {
      setSelectedProvider(config.modelProvider ?? "builtin");
      setSelectedModel(config.modelName ?? "");
      setApiKey(config.apiKey ?? "");
      setApiEndpoint(config.apiEndpoint ?? "");
      setSystemPrompt(config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT);
      setResearchPrompt(config.researchPrompt ?? DEFAULT_RESEARCH_PROMPT);
      setWritingPrompt(config.writingPrompt ?? DEFAULT_WRITING_PROMPT);
      setAutoPublish(config.autoPublish ?? false);
      setTopics((config.researchTopics as string[]) ?? []);
      setTargetLangs((config.targetLanguages as string[]) ?? ["zh", "en", "ja"]);
    }
  }, [config]);

  const currentProvider = MODEL_PROVIDERS.find(p => p.value === selectedProvider);

  const handleSave = () => {
    saveMutation.mutate({
      modelProvider: selectedProvider as any,
      apiKey: apiKey || undefined,
      apiEndpoint: apiEndpoint || undefined,
      modelName: selectedModel || undefined,
      systemPrompt,
      researchPrompt,
      writingPrompt,
      researchTopics: topics,
      targetLanguages: targetLangs,
      autoPublish,
    });
  };

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const toggleLang = (lang: string) => {
    setTargetLangs(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--patina)]/15 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[var(--patina)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">AI Master 配置</h1>
              <p className="text-sm text-muted-foreground">配置您的 AI 助手模型、研究方向和写作风格</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="model" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="model" className="gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5" />模型配置
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5" />提示词
            </TabsTrigger>
            <TabsTrigger value="research" className="gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5" />研究方向
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" />发布设置
            </TabsTrigger>
          </TabsList>

          {/* Model Configuration */}
          <TabsContent value="model">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">选择 AI 模型</CardTitle>
                <CardDescription>选择驱动您 AI Master 的大语言模型</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Provider Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MODEL_PROVIDERS.map(provider => (
                    <button
                      key={provider.value}
                      onClick={() => {
                        setSelectedProvider(provider.value);
                        setSelectedModel("");
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedProvider === provider.value
                          ? "border-[var(--patina)] bg-[var(--patina)]/8 shadow-sm"
                          : "border-border hover:border-[var(--patina)]/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{provider.icon}</div>
                      <div className="text-sm font-medium leading-tight">{provider.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{provider.description}</div>
                      {!provider.requiresKey && (
                        <Badge variant="secondary" className="mt-1.5 text-xs py-0">免费</Badge>
                      )}
                    </button>
                  ))}
                </div>

                {/* Model Selection */}
                {currentProvider && currentProvider.models.length > 0 && (
                  <div className="space-y-2">
                    <Label>具体模型</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择模型版本" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentProvider.models.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom model name */}
                {selectedProvider === "custom" && (
                  <div className="space-y-2">
                    <Label>模型名称</Label>
                    <Input
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      placeholder="如：gpt-4o, llama-3.1-70b"
                    />
                  </div>
                )}

                {/* API Key */}
                {currentProvider?.requiresKey && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" />
                        API Key
                      </Label>
                      {currentProvider.docsUrl && (
                        <a
                          href={currentProvider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--patina)] hover:underline"
                        >
                          获取 API Key →
                        </a>
                      )}
                    </div>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder={currentProvider.keyPlaceholder ?? "your-api-key"}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">API Key 将加密存储，仅用于 AI 生成任务</p>
                  </div>
                )}

                {/* Custom Endpoint */}
                {(selectedProvider === "custom" || currentProvider?.requiresEndpoint) && (
                  <div className="space-y-2">
                    <Label>API 端点 URL</Label>
                    <Input
                      value={apiEndpoint}
                      onChange={e => setApiEndpoint(e.target.value)}
                      placeholder="https://api.example.com/v1"
                    />
                    <p className="text-xs text-muted-foreground">需兼容 OpenAI Chat Completions API 格式</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompts */}
          <TabsContent value="prompts">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">系统提示词（人格定义）</CardTitle>
                  <CardDescription>定义 AI Master 的专业背景、写作风格和行为准则</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    rows={8}
                    className="font-mono text-sm resize-y"
                    placeholder="描述 AI Master 的专业背景、写作风格..."
                  />
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-muted-foreground">{systemPrompt.length} 字符</p>
                    <button
                      onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                      className="text-xs text-[var(--patina)] hover:underline"
                    >
                      恢复默认
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">研究收集提示词</CardTitle>
                  <CardDescription>指导 AI 如何收集和整理行业资料</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={researchPrompt}
                    onChange={e => setResearchPrompt(e.target.value)}
                    rows={6}
                    className="font-mono text-sm resize-y"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => setResearchPrompt(DEFAULT_RESEARCH_PROMPT)}
                      className="text-xs text-[var(--patina)] hover:underline"
                    >
                      恢复默认
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">文章撰写提示词</CardTitle>
                  <CardDescription>指导 AI 如何将研究资料转化为文章</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={writingPrompt}
                    onChange={e => setWritingPrompt(e.target.value)}
                    rows={8}
                    className="font-mono text-sm resize-y"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => setWritingPrompt(DEFAULT_WRITING_PROMPT)}
                      className="text-xs text-[var(--patina)] hover:underline"
                    >
                      恢复默认
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Research Topics */}
          <TabsContent value="research">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">研究方向与主题</CardTitle>
                <CardDescription>设置 AI Master 持续关注的行业话题</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add topic */}
                <div className="flex gap-2">
                  <Input
                    value={newTopic}
                    onChange={e => setNewTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addTopic()}
                    placeholder="添加研究主题，如：HBM4 供应链、台积电 2nm..."
                    className="flex-1"
                  />
                  <Button onClick={addTopic} size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Topics list */}
                <div className="flex flex-wrap gap-2 min-h-12">
                  {topics.length === 0 && (
                    <p className="text-sm text-muted-foreground">还没有添加研究主题</p>
                  )}
                  {topics.map(topic => (
                    <Badge
                      key={topic}
                      variant="secondary"
                      className="gap-1 pr-1 cursor-default"
                    >
                      {topic}
                      <button
                        onClick={() => setTopics(topics.filter(t => t !== topic))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                {/* Suggested topics */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">推荐主题（点击添加）：</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "先进封装工艺", "HBM 存储", "台积电 2nm", "英伟达 GPU 供应链",
                      "中国半导体自主", "ASML EUV 光刻", "Chiplet 标准", "功率半导体",
                      "SiC/GaN 器件", "存储芯片市场", "AI 芯片竞争", "半导体设备国产化"
                    ].map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          if (!topics.includes(t)) setTopics([...topics, t]);
                        }}
                        disabled={topics.includes(t)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          topics.includes(t)
                            ? "border-[var(--patina)] text-[var(--patina)] bg-[var(--patina)]/8 cursor-default"
                            : "border-border hover:border-[var(--patina)]/50 hover:bg-muted/50 cursor-pointer"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target languages */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label>目标语言（文章将自动翻译为以下语言）</Label>
                  <div className="flex gap-3">
                    {[
                      { code: "zh", label: "🇨🇳 中文" },
                      { code: "en", label: "🇬🇧 English" },
                      { code: "ja", label: "🇯🇵 日本語" },
                    ].map(lang => (
                      <label key={lang.code} className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={targetLangs.includes(lang.code)}
                          onCheckedChange={() => toggleLang(lang.code)}
                        />
                        <span className="text-sm">{lang.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">自动发布设置</CardTitle>
                <CardDescription>配置 AI Master 的自动研究和发布计划</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-sm">自动发布</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AI 完成文章后自动提交审核（仍需管理员审批）
                    </p>
                  </div>
                  <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-[var(--patina)]" />
                    <p className="text-sm font-medium">手动触发（推荐）</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    在管理员后台的「AI Agent 控制台」中手动触发研究任务，
                    可以精确控制每次生成的主题和参数。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
          >
            {saveMutation.isPending ? "保存中..." : "保存配置"}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
