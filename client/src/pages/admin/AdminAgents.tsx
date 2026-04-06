import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Bot, Play, Plus, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
  running: <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
  completed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "等待中", running: "运行中", completed: "已完成", failed: "失败",
};

export default function AdminAgents() {
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateMaster, setShowCreateMaster] = useState(false);
  const [taskForm, setTaskForm] = useState({ masterId: "", taskType: "write" as const, instruction: "", searchTopics: "" });
  const [masterForm, setMasterForm] = useState({ displayName: "", alias: "", bio: "", expertise: "" });
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
    onSuccess: () => { toast.success("AI Master 已创建！"); setShowCreateMaster(false); utils.admin.listMasters.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const taskList = Array.isArray(tasks) ? tasks : [];

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
      {(masters ?? []).filter((m: any) => m.isAiAgent).length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium mb-3">AI Master 列表</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(masters ?? []).filter((m: any) => m.isAiAgent).map((m: any) => (
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
                  {(masters ?? []).filter((m: any) => m.isAiAgent).map((m: any) => (
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

      {/* Create AI Master Dialog */}
      <Dialog open={showCreateMaster} onOpenChange={setShowCreateMaster}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建 AI Master</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">显示名称 *</Label>
                <Input placeholder="例如：芯片观察者" value={masterForm.displayName} onChange={e => setMasterForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">别名 (URL) *</Label>
                <Input placeholder="例如：chip-observer" value={masterForm.alias} onChange={e => setMasterForm(f => ({ ...f, alias: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">简介</Label>
              <Textarea placeholder="AI Master 的专业背景和研究方向..." value={masterForm.bio} onChange={e => setMasterForm(f => ({ ...f, bio: e.target.value }))} className="mt-1" rows={2} />
            </div>
            <div>
              <Label className="text-xs">专业领域（逗号分隔）</Label>
              <Input placeholder="例如：先进封装, EUV光刻, 存储芯片" value={masterForm.expertise} onChange={e => setMasterForm(f => ({ ...f, expertise: e.target.value }))} className="mt-1" />
            </div>
            <Button className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
              disabled={createMasterMutation.isPending || !masterForm.displayName || !masterForm.alias}
              onClick={() => createMasterMutation.mutate({
                displayName: masterForm.displayName,
                alias: masterForm.alias,
                bio: masterForm.bio,
                expertise: masterForm.expertise.split(",").map((s: string) => s.trim()).filter(Boolean),
              })}>
              {createMasterMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "创建 AI Master"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
