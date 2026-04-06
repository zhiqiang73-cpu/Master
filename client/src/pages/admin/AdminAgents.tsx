import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Bot, Play, Plus, RefreshCw, CheckCircle, XCircle, Clock, Settings, Cpu, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
  running: <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
  completed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "等待中", running: "运行中", completed: "已完成", failed: "失败",
};

const PROVIDER_LABELS: Record<string, string> = {
  builtin: "🔵 内置模型",
  qwen: "🇨🇳 通义千问",
  glm: "🇨🇳 智谱 GLM",
  minimax: "🇨🇳 MiniMax",
  openai: "🇺🇸 OpenAI",
  custom: "⚙️ 自定义",
};

type LLMProvider = "builtin" | "qwen" | "glm" | "minimax" | "openai" | "custom";

interface MasterForm {
  displayName: string;
  alias: string;
  bio: string;
  expertise: string;
  llmProvider: LLMProvider;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  systemPrompt: string;
  researchDirections: string;
}

const DEFAULT_MASTER_FORM: MasterForm = {
  displayName: "", alias: "", bio: "", expertise: "",
  llmProvider: "builtin",
  llmApiKey: "", llmBaseUrl: "", llmModel: "",
  systemPrompt: "",
  researchDirections: "",
};

const PROVIDER_PLACEHOLDERS: Record<LLMProvider, { apiKey: string; baseUrl: string; model: string }> = {
  builtin: { apiKey: "", baseUrl: "", model: "" },
  qwen: { apiKey: "sk-xxxx（阿里云百炼 API Key）", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  glm: { apiKey: "xxxx（智谱 AI API Key）", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4" },
  minimax: { apiKey: "xxxx（MiniMax API Key）", baseUrl: "https://api.minimax.chat/v1", model: "abab6.5s-chat" },
  openai: { apiKey: "sk-xxxx", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  custom: { apiKey: "your-api-key", baseUrl: "https://your-api-base-url/v1", model: "your-model-name" },
};

export default function AdminAgents() {
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateMaster, setShowCreateMaster] = useState(false);
  const [taskForm, setTaskForm] = useState({ masterId: "", taskType: "write" as const, instruction: "", searchTopics: "" });
  const [masterForm, setMasterForm] = useState<MasterForm>(DEFAULT_MASTER_FORM);
  const utils = trpc.useUtils();

  const { data: tasks, isLoading } = trpc.agent.listTasks.useQuery({});
  const { data: masters } = trpc.admin.listMasters.useQuery();

  const createTaskMutation = trpc.agent.createTask.useMutation({
    onSuccess: () => { toast.success("任务已创建！"); setShowCreate(false); utils.agent.listTasks.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const runTaskMutation = trpc.agent.runTask.useMutation({
    onSuccess: () => { toast.success("任务开始执行！"); utils.agent.listTasks.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMasterMutation = trpc.admin.createAiMaster.useMutation({
    onSuccess: () => { toast.success("AI Master 已创建！"); setShowCreateMaster(false); setMasterForm(DEFAULT_MASTER_FORM); utils.admin.listMasters.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const taskList = Array.isArray(tasks) ? tasks : [];
  const aiMasters = (masters ?? []).filter((m: any) => m.isAiAgent);
  const ph = PROVIDER_PLACEHOLDERS[masterForm.llmProvider];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">AI Agent 控制台</h1>
          <p className="text-xs text-muted-foreground mt-0.5">管理虚拟 Master 和自动化写作任务</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateMaster(true)} className="text-xs gap-1">
            <Bot className="w-3.5 h-3.5" /> 创建 AI Master
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white text-xs gap-1">
            <Plus className="w-3.5 h-3.5" /> 新建写作任务
          </Button>
        </div>
      </div>

      {/* AI Masters list */}
      {aiMasters.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium mb-3">AI Master 列表</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {aiMasters.map((m: any) => (
              <div key={m.id} className="p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-medium">{m.displayName}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">@{m.alias}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Lv.{m.level} · {m.articleCount} 篇文章</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-[var(--kinari-deep)]">
          <span className="text-xs font-medium text-muted-foreground">写作任务列表</span>
        </div>
        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--patina)]" /></div>
        ) : taskList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-xs">暂无任务，点击「新建写作任务」开始</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {taskList.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">{STATUS_ICONS[task.status] ?? STATUS_ICONS.pending}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{task.instruction}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[task.status]}</span>
                      <span className="text-[10px] text-[var(--patina)] bg-[var(--patina)]/10 px-1.5 py-0.5 rounded">{task.taskType}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{new Date(task.createdAt).toLocaleString("zh-CN")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.status === "pending" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => runTaskMutation.mutate({ taskId: task.id })} disabled={runTaskMutation.isPending}>
                      <Play className="w-3 h-3" /> 执行
                    </Button>
                  )}
                  {task.status === "completed" && (
                    <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">已完成</span>
                  )}
                  {task.status === "failed" && task.errorMessage && (
                    <span className="text-[10px] text-red-500 max-w-32 truncate" title={task.errorMessage}>{task.errorMessage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建 AI 写作任务</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">选择 AI Master *</Label>
              <Select value={taskForm.masterId} onValueChange={v => setTaskForm(f => ({ ...f, masterId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="选择 Master" /></SelectTrigger>
                <SelectContent>
                  {aiMasters.map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">任务类型</Label>
              <Select value={taskForm.taskType} onValueChange={(v: any) => setTaskForm(f => ({ ...f, taskType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="research">资料收集</SelectItem>
                  <SelectItem value="write">撰写文章</SelectItem>
                  <SelectItem value="translate">多语翻译</SelectItem>
                  <SelectItem value="compliance">合规检测</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">任务指令 *</Label>
              <Textarea placeholder="例如：撰写一篇关于2024年先进封装技术发展趋势的深度分析文章，重点关注CoWoS和HBM..." value={taskForm.instruction} onChange={e => setTaskForm(f => ({ ...f, instruction: e.target.value }))} className="mt-1" rows={4} />
            </div>
            <div>
              <Label className="text-xs">搜索关键词（逗号分隔，可选）</Label>
              <Input placeholder="例如：先进封装, CoWoS, HBM, chiplet" value={taskForm.searchTopics} onChange={e => setTaskForm(f => ({ ...f, searchTopics: e.target.value }))} className="mt-1" />
            </div>
            <Button className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
              disabled={createTaskMutation.isPending || !taskForm.masterId || !taskForm.instruction}
              onClick={() => createTaskMutation.mutate({
                masterId: Number(taskForm.masterId),
                taskType: taskForm.taskType,
                instruction: taskForm.instruction,
                searchTopics: taskForm.searchTopics.split(",").map((s: string) => s.trim()).filter(Boolean),
              })}>
              {createTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "创建任务"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create AI Master Dialog - Full Config */}
      <Dialog open={showCreateMaster} onOpenChange={setShowCreateMaster}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[var(--patina)]" />
              创建 AI Master
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="basic" className="text-xs gap-1"><FileText className="w-3 h-3" /> 基本信息</TabsTrigger>
              <TabsTrigger value="model" className="text-xs gap-1"><Cpu className="w-3 h-3" /> AI 模型</TabsTrigger>
              <TabsTrigger value="prompt" className="text-xs gap-1"><Settings className="w-3 h-3" /> 个性化提示词</TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Info */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">显示名称 *</Label>
                  <Input placeholder="例如：芯片观察者" value={masterForm.displayName} onChange={e => setMasterForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">别名 (URL) *</Label>
                  <Input placeholder="例如：chip-observer" value={masterForm.alias} onChange={e => setMasterForm(f => ({ ...f, alias: e.target.value }))} className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">访问地址：/master/{masterForm.alias || "chip-observer"}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs">简介</Label>
                <Textarea placeholder="AI Master 的专业背景和研究方向..." value={masterForm.bio} onChange={e => setMasterForm(f => ({ ...f, bio: e.target.value }))} className="mt-1" rows={3} />
              </div>
              <div>
                <Label className="text-xs">专业领域（逗号分隔）</Label>
                <Input placeholder="例如：先进封装, EUV光刻, 存储芯片" value={masterForm.expertise} onChange={e => setMasterForm(f => ({ ...f, expertise: e.target.value }))} className="mt-1" />
              </div>
            </TabsContent>

            {/* Tab 2: AI Model Config */}
            <TabsContent value="model" className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                🤖 选择驱动此 AI Master 的大语言模型。选择「内置模型」无需配置，其他模型需要提供对应的 API Key。
              </div>
              <div>
                <Label className="text-xs">模型提供商</Label>
                <Select value={masterForm.llmProvider} onValueChange={v => setMasterForm(f => ({ ...f, llmProvider: v as LLMProvider, llmApiKey: "", llmBaseUrl: "", llmModel: "" }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builtin">🔵 内置模型（免配置，推荐）</SelectItem>
                    <SelectItem value="qwen">🇨🇳 通义千问 Qwen（阿里云）</SelectItem>
                    <SelectItem value="glm">🇨🇳 智谱 GLM（智谱AI）</SelectItem>
                    <SelectItem value="minimax">🇨🇳 MiniMax（海南科技）</SelectItem>
                    <SelectItem value="openai">🇺🇸 OpenAI / GPT-4</SelectItem>
                    <SelectItem value="custom">⚙️ 自定义 API（OpenAI 兼容）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {masterForm.llmProvider !== "builtin" && (
                <>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      API Key *
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{PROVIDER_LABELS[masterForm.llmProvider]}</Badge>
                    </Label>
                    <Input
                      type="password"
                      placeholder={ph.apiKey}
                      value={masterForm.llmApiKey}
                      onChange={e => setMasterForm(f => ({ ...f, llmApiKey: e.target.value }))}
                      className="mt-1 font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {masterForm.llmProvider === "qwen" && "前往 https://dashscope.aliyun.com 获取 API Key"}
                      {masterForm.llmProvider === "glm" && "前往 https://open.bigmodel.cn 获取 API Key"}
                      {masterForm.llmProvider === "minimax" && "前往 https://platform.minimaxi.com 获取 API Key"}
                      {masterForm.llmProvider === "openai" && "前往 https://platform.openai.com 获取 API Key"}
                      {masterForm.llmProvider === "custom" && "填入您的 OpenAI 兼容 API Key"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Base URL（可选）</Label>
                      <Input
                        placeholder={ph.baseUrl}
                        value={masterForm.llmBaseUrl}
                        onChange={e => setMasterForm(f => ({ ...f, llmBaseUrl: e.target.value }))}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">模型名称（可选）</Label>
                      <Input
                        placeholder={ph.model}
                        value={masterForm.llmModel}
                        onChange={e => setMasterForm(f => ({ ...f, llmModel: e.target.value }))}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {masterForm.llmProvider === "builtin" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
                  ✅ 使用内置模型，无需任何配置。AI Master 将使用平台默认的高质量大语言模型进行写作。
                </div>
              )}
            </TabsContent>

            {/* Tab 3: Personalized Prompts */}
            <TabsContent value="prompt" className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                ✍️ 个性化提示词决定了 AI Master 的写作风格、专业深度和研究方向。精心设计的提示词能显著提升文章质量。
              </div>
              <div>
                <Label className="text-xs">系统提示词（System Prompt）</Label>
                <Textarea
                  placeholder={`例如：你是一个专注于半导体先进封装工艺的行业分析师。你的文章风格简洁、数据驱动，善于将复杂技术转化为商业洞察。常用中文撰写，必要时提供英文或日文版本。你的分析总是基于最新的行业数据和供应链动态，避免泛泛而谈，注重具体的技术细节和市场影响。`}
                  value={masterForm.systemPrompt}
                  onChange={e => setMasterForm(f => ({ ...f, systemPrompt: e.target.value }))}
                  className="mt-1 text-xs"
                  rows={5}
                />
                <p className="text-[10px] text-muted-foreground mt-1">定义 AI Master 的身份、专业背景、写作风格和语言偏好</p>
              </div>
              <div>
                <Label className="text-xs">研究方向（每行一个主题）</Label>
                <Textarea
                  placeholder={`例如：\nCoWoS 先进封装技术进展\nHBM4 内存市场动态\n台积电 3nm 以下工艺成本分析\nChiplet 互联标准之争（UCIe vs OpenHBI）\n中国先进封装产能追赶情况`}
                  value={masterForm.researchDirections}
                  onChange={e => setMasterForm(f => ({ ...f, researchDirections: e.target.value }))}
                  className="mt-1 text-xs font-mono"
                  rows={5}
                />
                <p className="text-[10px] text-muted-foreground mt-1">每个方向将作为自动写作任务的默认搜索主题，AI Master 会定期围绕这些方向产出内容</p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 pt-4 border-t border-border">
            <Button
              className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
              disabled={createMasterMutation.isPending || !masterForm.displayName || !masterForm.alias}
              onClick={() => createMasterMutation.mutate({
                displayName: masterForm.displayName,
                alias: masterForm.alias,
                bio: masterForm.bio,
                expertise: masterForm.expertise.split(",").map((s: string) => s.trim()).filter(Boolean),
              })}
            >
              {createMasterMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
              创建 AI Master
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              {masterForm.llmProvider !== "builtin" && masterForm.llmApiKey ? "✅ 已配置自定义模型" : "使用内置模型"}
              {masterForm.systemPrompt ? " · ✅ 已设置个性化提示词" : ""}
              {masterForm.researchDirections ? " · ✅ 已设置研究方向" : ""}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
