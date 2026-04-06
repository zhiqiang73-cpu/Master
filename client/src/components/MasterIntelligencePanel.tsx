/**
 * MasterIntelligencePanel
 * Merges the old "AI 助手" + "我的替身" tabs into a single "专属情报官" panel.
 * The stand is now positioned as an intelligence officer that:
 *   1. Collects industry intelligence (on-demand or scheduled)
 *   2. Generates content (article / ppt / pdf / chart)
 *   3. Is configured with expertise tags, custom sources, and trigger modes
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Zap, Loader2, Bot, Sparkles, Search, FileText, BarChart2, Presentation, FileDown, Settings, Globe, Tag, Brain, Clock, ToggleLeft, ToggleRight, RefreshCw, Link2 } from "lucide-react";
import { Link } from "wouter";

const MODEL_OPTIONS = [
  { value: "qwen", label: "通义千问 (Qwen)" },
  { value: "glm", label: "智谱 GLM" },
  { value: "minimax", label: "MiniMax" },
  { value: "openai", label: "OpenAI GPT" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "custom", label: "自定义 API 端点" },
];

const OUTPUT_FORMAT_OPTIONS = [
  { value: "article", label: "📝 深度文章", desc: "Markdown 格式，可直接发布" },
  { value: "ppt", label: "📊 PPT 大纲", desc: "幻灯片结构，含演讲备注" },
  { value: "pdf", label: "📋 研究报告", desc: "完整报告，含摘要和结论" },
  { value: "chart", label: "📈 数据分析", desc: "JSON 图表数据，可视化就绪" },
];

const TRIGGER_MODE_OPTIONS = [
  { value: "manual", label: "手动触发", desc: "仅在你主动请求时运行" },
  { value: "scheduled", label: "定时推送", desc: "按 Cron 计划自动收集情报" },
  { value: "keyword", label: "关键词监控", desc: "检测到关键词时自动触发" },
];

const CRON_PRESETS = [
  { value: "0 8 * * *", label: "每天早上 8:00" },
  { value: "0 8,20 * * *", label: "每天 8:00 和 20:00" },
  { value: "0 8 * * 1-5", label: "工作日早上 8:00" },
  { value: "0 */6 * * *", label: "每 6 小时" },
];

const PERSONALITY_PRESETS = ["技术乐观派", "数据控", "多头", "空头", "保守", "激进", "全球化主义者", "国产替代支持者"];
const INTEREST_PRESETS = ["台积电", "英伟达", "AI芯片", "HBM", "先进制程", "EDA工具", "供应链", "功率半导体"];

function TagInput({ value, onChange, presets, placeholder }: { value: string; onChange: (v: string) => void; presets: string[]; placeholder: string }) {
  const tags = value.split(",").map(s => s.trim()).filter(Boolean);
  const addTag = (tag: string) => { if (!tags.includes(tag)) onChange([...tags, tag].join(", ")); };
  const removeTag = (tag: string) => { onChange(tags.filter(t => t !== tag).join(", ")); };
  return (
    <div className="space-y-2">
      <Input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="mt-1" />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-600" onClick={() => removeTag(tag)}>
              {tag} ×
            </Badge>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {presets.filter(p => !tags.includes(p)).slice(0, 8).map(tag => (
          <Badge key={tag} variant="outline" className="text-xs cursor-pointer hover:bg-[var(--patina)]/10 hover:border-[var(--patina)]" onClick={() => addTag(tag)}>
            + {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

const EMPTY_CREATE_FORM = {
  name: "", alias: "", personality: "", specialty: "", expertise: "",
  personalityTags: "", interestTags: "", triggerMode: "manual",
  triggerKeywords: "", postFrequency: "", intelligenceSources: "",
  outputFormats: "article", modelProvider: "qwen", apiKey: "", apiEndpoint: "",
  modelName: "", systemPrompt: "", avatarEmoji: "⚡", avatarColor: "#4a9d8f",
};

export default function MasterIntelligencePanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingStand, setEditingStand] = useState<any>(null);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE_FORM });
  const [editForm, setEditForm] = useState({ ...EMPTY_CREATE_FORM });

  // Intelligence task state
  const [selectedStandId, setSelectedStandId] = useState<number | null>(null);
  const [intelKeywords, setIntelKeywords] = useState("");
  const [intelCustomSources, setIntelCustomSources] = useState("");
  const [intelResult, setIntelResult] = useState("");

  // Content generation state
  const [genFormat, setGenFormat] = useState<"article" | "ppt" | "pdf" | "chart">("article");
  const [genTopic, setGenTopic] = useState("");
  const [genKeywords, setGenKeywords] = useState("");
  const [genLang, setGenLang] = useState<"zh" | "en" | "ja">("zh");
  const [genResult, setGenResult] = useState<{ title: string; content: string; format: string } | null>(null);

  const utils = trpc.useUtils();
  const { data: myStands, isLoading } = trpc.forum.listMyStands.useQuery();

  const createStand = trpc.forum.createMasterStand.useMutation({
    onSuccess: (data) => {
      toast.success("情报官创建成功！" + (data.avatarUrl ? " 头像已生成 🎨" : ""));
      setShowCreate(false);
      setCreateForm({ ...EMPTY_CREATE_FORM });
      utils.forum.listMyStands.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStand = trpc.forum.updateMyStand.useMutation({
    onSuccess: () => {
      toast.success("情报官配置已更新");
      setEditingStand(null);
      utils.forum.listMyStands.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const runIntelligence = trpc.forum.runIntelligenceTask.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIntelResult("任务已启动，请稍后查看结果（通常 30-60 秒）...");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateContent = trpc.forum.generateContent.useMutation({
    onSuccess: (data) => {
      setGenResult(data);
      toast.success(`${data.format.toUpperCase()} 内容生成完成！`);
    },
    onError: (e) => toast.error(e.message),
  });

  const stands = myStands ?? [];
  const activeStand = stands.find((s: any) => s.id === selectedStandId) ?? stands[0];

  const handleCreate = () => {
    if (!createForm.name || !createForm.alias) { toast.error("名称和别名不能为空"); return; }
    createStand.mutate({
      name: createForm.name,
      alias: createForm.alias,
      personality: createForm.personality || undefined,
      specialty: createForm.specialty || undefined,
      expertise: createForm.expertise.split(",").map(s => s.trim()).filter(Boolean),
      personalityTags: createForm.personalityTags.split(",").map(s => s.trim()).filter(Boolean),
      interestTags: createForm.interestTags.split(",").map(s => s.trim()).filter(Boolean),
      modelProvider: createForm.modelProvider as any,
      apiKey: createForm.apiKey || undefined,
      systemPrompt: createForm.systemPrompt || undefined,
      avatarEmoji: createForm.avatarEmoji,
      avatarColor: createForm.avatarColor,
      generateJojoAvatar: true,
    });
  };

  const openEdit = (stand: any) => {
    setEditingStand(stand);
    setEditForm({
      name: stand.name ?? "",
      alias: stand.alias ?? "",
      personality: stand.personality ?? "",
      specialty: stand.specialty ?? "",
      expertise: Array.isArray(stand.expertise) ? stand.expertise.join(", ") : "",
      personalityTags: Array.isArray(stand.personalityTags) ? stand.personalityTags.join(", ") : "",
      interestTags: Array.isArray(stand.interestTags) ? stand.interestTags.join(", ") : "",
      triggerMode: stand.triggerMode ?? "manual",
      triggerKeywords: Array.isArray(stand.triggerKeywords) ? stand.triggerKeywords.join(", ") : "",
      postFrequency: stand.postFrequency ?? "",
      intelligenceSources: Array.isArray(stand.intelligenceSources) ? stand.intelligenceSources.join("\n") : "",
      outputFormats: Array.isArray(stand.outputFormats) ? stand.outputFormats.join(",") : "article",
      modelProvider: stand.modelProvider_role ?? "qwen",
      apiKey: stand.apiKey ?? "",
      apiEndpoint: stand.apiEndpoint ?? "",
      modelName: stand.modelName ?? "",
      systemPrompt: stand.systemPrompt ?? "",
      avatarEmoji: stand.avatarEmoji ?? "⚡",
      avatarColor: stand.avatarColor ?? "#4a9d8f",
    });
  };

  const handleUpdate = () => {
    if (!editingStand) return;
    updateStand.mutate({
      id: editingStand.id,
      name: editForm.name || undefined,
      personality: editForm.personality || undefined,
      specialty: editForm.specialty || undefined,
      expertise: editForm.expertise.split(",").map(s => s.trim()).filter(Boolean),
      personalityTags: editForm.personalityTags.split(",").map(s => s.trim()).filter(Boolean),
      interestTags: editForm.interestTags.split(",").map(s => s.trim()).filter(Boolean),
      triggerMode: editForm.triggerMode as any,
      triggerKeywords: editForm.triggerKeywords.split(",").map(s => s.trim()).filter(Boolean),
      postFrequency: editForm.postFrequency || undefined,
      intelligenceSources: editForm.intelligenceSources.split("\n").map(s => s.trim()).filter(Boolean),
      outputFormats: editForm.outputFormats.split(",").map(s => s.trim()).filter(Boolean),
      modelProvider: editForm.modelProvider as any,
      apiKey: editForm.apiKey || undefined,
      apiEndpoint: editForm.apiEndpoint || undefined,
      modelName: editForm.modelName || undefined,
      systemPrompt: editForm.systemPrompt || undefined,
      avatarEmoji: editForm.avatarEmoji,
      avatarColor: editForm.avatarColor,
    });
  };

  const handleRunIntelligence = () => {
    const standId = selectedStandId ?? stands[0]?.id;
    if (!standId) { toast.error("请先创建情报官"); return; }
    runIntelligence.mutate({
      agentRoleId: standId,
      keywords: intelKeywords.split(",").map(s => s.trim()).filter(Boolean),
      customSources: intelCustomSources.split("\n").map(s => s.trim()).filter(Boolean),
    });
  };

  const handleGenerate = () => {
    const standId = selectedStandId ?? stands[0]?.id;
    if (!standId) { toast.error("请先创建情报官"); return; }
    if (!genTopic) { toast.error("请输入主题"); return; }
    setGenResult(null);
    generateContent.mutate({
      agentRoleId: standId,
      format: genFormat,
      topic: genTopic,
      keywords: genKeywords.split(",").map(s => s.trim()).filter(Boolean),
      language: genLang,
    });
  };

  const downloadContent = () => {
    if (!genResult) return;
    const ext = genResult.format === "article" ? "md" : genResult.format === "chart" ? "json" : "txt";
    const blob = new Blob([genResult.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${genResult.title}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--patina)]" />
            专属情报官
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            基于你的专业身份，自动收集行业情报、生成文章/PPT/报告，让 AI 成为你的研究助理
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
          <Plus className="w-4 h-4" />
          创建情报官
        </Button>
      </div>

      {/* Sync Status Banner */}
      {stands.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Link2 className="w-4 h-4" />
            <span>情报官的系统提示词可与 <strong>AI Master 配置</strong>（人格、研究方向）自动同步</span>
          </div>
          <Link href="/master/ai-config">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-100">
              <RefreshCw className="w-3 h-3" />
              前往同步
            </Button>
          </Link>
        </div>
      )}

      {stands.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="font-bold text-lg mb-2">还没有专属情报官</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            创建你的情报官，配置专业领域和情报源，让 AI 帮你监控行业动态、生成深度内容
          </p>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
            <Sparkles className="w-4 h-4" />
            创建我的情报官
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="intelligence">
          <TabsList className="mb-4">
            <TabsTrigger value="intelligence" className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              情报收集
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              内容生成
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              情报官配置
            </TabsTrigger>
          </TabsList>

          {/* Intelligence Collection */}
          <TabsContent value="intelligence" className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--patina)]" />
                触发情报收集
              </h3>
              {stands.length > 1 && (
                <div className="mb-3">
                  <Label>选择情报官</Label>
                  <Select value={selectedStandId?.toString() ?? ""} onValueChange={v => setSelectedStandId(Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="使用第一个情报官" /></SelectTrigger>
                    <SelectContent>
                      {stands.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="mb-3">
                <Label>关键词（逗号分隔，留空则使用情报官的关注标签）</Label>
                <Input className="mt-1" placeholder="台积电, HBM4, 先进封装..." value={intelKeywords} onChange={e => setIntelKeywords(e.target.value)} />
              </div>
              <div className="mb-4">
                <Label>补充情报源（每行一个 URL，可选）</Label>
                <Textarea className="mt-1" rows={3} placeholder="https://example.com/semiconductor-news&#10;https://another-source.com/reports" value={intelCustomSources} onChange={e => setIntelCustomSources(e.target.value)} />
              </div>
              <Button onClick={handleRunIntelligence} disabled={runIntelligence.isPending} className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2">
                {runIntelligence.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />收集中...</> : <><Search className="w-4 h-4" />立即收集情报</>}
              </Button>
              {intelResult && (
                <div className="mt-3 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                  {intelResult}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                情报官会收集什么？
              </h3>
              <div className="text-sm text-muted-foreground space-y-1.5">
                <p>• <strong>市场需求动态</strong>：全网用户/企业在寻找什么解决方案</p>
                <p>• <strong>行业热点事件</strong>：最近 1-2 周内的重要动态</p>
                <p>• <strong>竞争格局变化</strong>：主要玩家的最新动向</p>
                <p>• <strong>文章选题建议</strong>：3-5 个可供你撰写的深度选题</p>
              </div>
            </div>
          </TabsContent>

          {/* Content Generation */}
          <TabsContent value="generate" className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-card/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                内容生成
              </h3>
              {stands.length > 1 && (
                <div className="mb-3">
                  <Label>选择情报官</Label>
                  <Select value={selectedStandId?.toString() ?? ""} onValueChange={v => setSelectedStandId(Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="使用第一个情报官" /></SelectTrigger>
                    <SelectContent>
                      {stands.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="mb-3">
                <Label>输出格式</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {OUTPUT_FORMAT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGenFormat(opt.value as any)}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${genFormat === opt.value ? "border-[var(--patina)] bg-[var(--patina)]/5" : "border-border hover:border-[var(--patina)]/40"}`}
                    >
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <Label>主题 *</Label>
                <Input className="mt-1" placeholder="例如：台积电 CoWoS 封装技术的竞争格局分析" value={genTopic} onChange={e => setGenTopic(e.target.value)} />
              </div>
              <div className="mb-3">
                <Label>关键词（逗号分隔，可选）</Label>
                <Input className="mt-1" placeholder="CoWoS, 先进封装, 英伟达..." value={genKeywords} onChange={e => setGenKeywords(e.target.value)} />
              </div>
              <div className="mb-4">
                <Label>语言</Label>
                <Select value={genLang} onValueChange={v => setGenLang(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={generateContent.isPending} className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2">
                {generateContent.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />生成中（约 30 秒）...</> : <><Sparkles className="w-4 h-4" />生成内容</>}
              </Button>
            </div>

            {genResult && (
              <div className="p-4 rounded-xl border border-[var(--patina)]/30 bg-[var(--patina)]/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{genResult.title}</h3>
                  <Button size="sm" variant="outline" onClick={downloadContent} className="gap-1.5 text-xs">
                    <FileDown className="w-3.5 h-3.5" />
                    下载
                  </Button>
                </div>
                <Separator />
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-80 overflow-y-auto font-mono leading-relaxed">
                  {genResult.content}
                </pre>
              </div>
            )}
          </TabsContent>

          {/* Configuration */}
          <TabsContent value="config" className="space-y-4">
            {stands.map((stand: any) => (
              <div key={stand.id} className="p-4 rounded-xl border border-border bg-card hover:border-[var(--patina)]/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {stand.avatarUrl ? (
                      <img src={stand.avatarUrl} alt={stand.name} className="w-14 h-14 rounded-full object-cover border-2 border-[var(--patina)]/30" />
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2" style={{ backgroundColor: `${stand.avatarColor}20`, borderColor: `${stand.avatarColor}50` }}>
                        {stand.avatarEmoji ?? "⚡"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-bold">{stand.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {MODEL_OPTIONS.find(m => m.value === stand.modelProvider_role)?.label ?? stand.modelProvider_role ?? "未配置"}
                      </Badge>
                      {stand.triggerMode && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600">
                          {TRIGGER_MODE_OPTIONS.find(t => t.value === stand.triggerMode)?.label ?? stand.triggerMode}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">@{stand.alias}</div>
                    {stand.specialty && <p className="text-xs text-muted-foreground">专业领域：{stand.specialty}</p>}
                    {Array.isArray(stand.interestTags) && stand.interestTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(stand.interestTags as string[]).slice(0, 4).map((tag: string) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--patina)]/10 text-[var(--patina)]">{tag}</span>
                        ))}
                      </div>
                    )}
                    {Array.isArray(stand.intelligenceSources) && stand.intelligenceSources.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Globe className="w-3 h-3" />
                        <span>{stand.intelligenceSources.length} 个情报源</span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(stand)} className="gap-1 text-xs flex-shrink-0">
                    <Settings className="w-3 h-3" />
                    配置
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>创建专属情报官</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>情报官名称 *</Label>
                <Input className="mt-1" placeholder="芯片情报官" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>别名 * (英文小写)</Label>
                <Input className="mt-1" placeholder="chip-intel" value={createForm.alias} onChange={e => setCreateForm(f => ({ ...f, alias: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
              </div>
            </div>
            <div>
              <Label>专业领域（你的专长，越具体越好）</Label>
              <Input className="mt-1" placeholder="碳化硅功率半导体、车规级芯片、陶瓷基板..." value={createForm.specialty} onChange={e => setCreateForm(f => ({ ...f, specialty: e.target.value }))} />
            </div>
            <div>
              <Label>人格描述</Label>
              <Textarea className="mt-1" rows={2} placeholder="严谨的技术派，喜欢用数据说话，关注产业链上下游..." value={createForm.personality} onChange={e => setCreateForm(f => ({ ...f, personality: e.target.value }))} />
            </div>
            <Separator />
            <div>
              <Label className="flex items-center gap-1 mb-2"><Tag className="w-3.5 h-3.5 text-[var(--patina)]" />关注点标签</Label>
              <TagInput value={createForm.interestTags} onChange={v => setCreateForm(f => ({ ...f, interestTags: v }))} presets={INTEREST_PRESETS} placeholder="台积电, AI芯片, HBM..." />
            </div>
            <div>
              <Label className="flex items-center gap-1 mb-2"><Brain className="w-3.5 h-3.5 text-purple-500" />性格标签</Label>
              <TagInput value={createForm.personalityTags} onChange={v => setCreateForm(f => ({ ...f, personalityTags: v }))} presets={PERSONALITY_PRESETS} placeholder="技术乐观派, 数据控..." />
            </div>
            <Separator />
            <div>
              <Label>AI 模型</Label>
              <Select value={createForm.modelProvider} onValueChange={v => setCreateForm(f => ({ ...f, modelProvider: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API Key</Label>
              <Input className="mt-1" type="password" placeholder="sk-..." value={createForm.apiKey} onChange={e => setCreateForm(f => ({ ...f, apiKey: e.target.value }))} />
            </div>
            <Button onClick={handleCreate} disabled={createStand.isPending} className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
              {createStand.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />创建中...</> : "✨ 创建情报官"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingStand} onOpenChange={(open) => { if (!open) setEditingStand(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>配置情报官：{editingStand?.name}</DialogTitle></DialogHeader>
          <Tabs defaultValue="identity">
            <TabsList className="mb-4">
              <TabsTrigger value="identity">身份</TabsTrigger>
              <TabsTrigger value="sources">情报源</TabsTrigger>
              <TabsTrigger value="model">模型</TabsTrigger>
            </TabsList>
            <TabsContent value="identity" className="space-y-4">
              <div>
                <Label>专业领域</Label>
                <Input className="mt-1" placeholder="碳化硅功率半导体..." value={editForm.specialty} onChange={e => setEditForm(f => ({ ...f, specialty: e.target.value }))} />
              </div>
              <div>
                <Label>人格描述</Label>
                <Textarea className="mt-1" rows={2} value={editForm.personality} onChange={e => setEditForm(f => ({ ...f, personality: e.target.value }))} />
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-2"><Tag className="w-3.5 h-3.5 text-[var(--patina)]" />关注点标签</Label>
                <TagInput value={editForm.interestTags} onChange={v => setEditForm(f => ({ ...f, interestTags: v }))} presets={INTEREST_PRESETS} placeholder="台积电, AI芯片..." />
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-2"><Brain className="w-3.5 h-3.5 text-purple-500" />性格标签</Label>
                <TagInput value={editForm.personalityTags} onChange={v => setEditForm(f => ({ ...f, personalityTags: v }))} presets={PERSONALITY_PRESETS} placeholder="技术乐观派..." />
              </div>
              <div>
                <Label>系统提示词</Label>
                <Textarea className="mt-1" rows={3} placeholder="你是一位专注于碳化硅领域的行业情报官..." value={editForm.systemPrompt} onChange={e => setEditForm(f => ({ ...f, systemPrompt: e.target.value }))} />
              </div>
            </TabsContent>
            <TabsContent value="sources" className="space-y-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  自定义情报源（每行一个 URL）
                </Label>
                <Textarea className="mt-1" rows={5} placeholder="https://example.com/semiconductor-news&#10;https://another-source.com/reports&#10;https://industry-forum.com/posts" value={editForm.intelligenceSources} onChange={e => setEditForm(f => ({ ...f, intelligenceSources: e.target.value }))} />
                <p className="text-xs text-muted-foreground mt-1">情报官会参考这些网站收集行业动态</p>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  触发模式
                </Label>
                <Select value={editForm.triggerMode} onValueChange={v => setEditForm(f => ({ ...f, triggerMode: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_MODE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editForm.triggerMode === "scheduled" && (
                <div>
                  <Label>定时计划（Cron）</Label>
                  <Select value={editForm.postFrequency} onValueChange={v => setEditForm(f => ({ ...f, postFrequency: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="选择频率" /></SelectTrigger>
                    <SelectContent>
                      {CRON_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editForm.triggerMode === "keyword" && (
                <div>
                  <Label>监控关键词（逗号分隔）</Label>
                  <Input className="mt-1" placeholder="台积电, HBM, 碳化硅..." value={editForm.triggerKeywords} onChange={e => setEditForm(f => ({ ...f, triggerKeywords: e.target.value }))} />
                </div>
              )}
              <div>
                <Label>支持的输出格式</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {OUTPUT_FORMAT_OPTIONS.map(opt => {
                    const selected = editForm.outputFormats.split(",").includes(opt.value);
                    const toggle = () => {
                      const current = editForm.outputFormats.split(",").filter(Boolean);
                      const next = selected ? current.filter(v => v !== opt.value) : [...current, opt.value];
                      setEditForm(f => ({ ...f, outputFormats: next.join(",") }));
                    };
                    return (
                      <button key={opt.value} onClick={toggle} className={`p-2 rounded-lg border text-left text-xs transition-colors ${selected ? "border-[var(--patina)] bg-[var(--patina)]/5" : "border-border hover:border-[var(--patina)]/40"}`}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="model" className="space-y-4">
              <div>
                <Label>AI 模型提供商</Label>
                <Select value={editForm.modelProvider} onValueChange={v => setEditForm(f => ({ ...f, modelProvider: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>API Key</Label>
                <Input className="mt-1" type="password" placeholder="sk-..." value={editForm.apiKey} onChange={e => setEditForm(f => ({ ...f, apiKey: e.target.value }))} />
              </div>
              {editForm.modelProvider === "custom" && (
                <>
                  <div>
                    <Label>API 端点 URL</Label>
                    <Input className="mt-1" placeholder="https://api.example.com/v1" value={editForm.apiEndpoint} onChange={e => setEditForm(f => ({ ...f, apiEndpoint: e.target.value }))} />
                  </div>
                  <div>
                    <Label>模型名称</Label>
                    <Input className="mt-1" placeholder="gpt-4o" value={editForm.modelName} onChange={e => setEditForm(f => ({ ...f, modelName: e.target.value }))} />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
          <Button onClick={handleUpdate} disabled={updateStand.isPending} className="w-full mt-4 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
            {updateStand.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />保存中...</> : "💾 保存配置"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
