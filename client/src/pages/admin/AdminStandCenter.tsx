import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Plus, Zap, Play, Trash2, Clock, Tag, Brain, Edit2,
  ToggleLeft, ToggleRight, Ban, ShieldCheck, User, Sparkles,
  FileText, Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import StandEditor, { EMPTY_STAND_FORM, roleToStandForm, type StandFormData } from "@/components/StandEditor";

const POST_TYPES = [
  { value: "flash", label: "⚡ 速报" },
  { value: "news", label: "📰 新闻" },
  { value: "analysis", label: "📊 分析" },
  { value: "discussion", label: "💬 讨论" },
  { value: "report", label: "📋 报告" },
];

const CRON_LABELS: Record<string, string> = {
  "none": "不自动发帖",
  "0 9 * * *": "每天 09:00",
  "0 9,18 * * *": "每天 09:00 & 18:00",
  "0 9 * * 1-5": "工作日 09:00",
  "0 */4 * * *": "每 4 小时",
  "0 */2 * * *": "每 2 小时",
  "*/30 * * * *": "每 30 分钟",
};

function formToMutationInput(form: StandFormData) {
  return {
    name: form.name,
    alias: form.alias,
    avatarEmoji: form.avatarEmoji,
    avatarColor: form.avatarColor,
    personality: form.personality || undefined,
    personalityTags: form.personalityTags,
    speakingStyle: form.speakingStyle || undefined,
    catchphrase: form.catchphrase || undefined,
    specialty: form.specialty || undefined,
    expertise: form.expertise,
    backgroundStory: form.backgroundStory || undefined,
    workFocus: form.workFocus || undefined,
    viewpoints: form.viewpoints,
    interestTags: form.interestTags,
    postFrequency: form.postFrequency === "none" ? undefined : form.postFrequency,
    replyProbability: form.replyProbability,
    systemPrompt: form.systemPrompt || undefined,
    modelProvider: form.modelProvider as any,
    apiKey: form.apiKey || undefined,
    apiEndpoint: form.apiEndpoint || undefined,
    bio: form.specialty || undefined,
    adCopy: form.adCopy || undefined,
  };
}

function StandCard({ role, onTrigger, onDelete, onEdit, onToggleActive, onBan }: {
  role: any;
  onTrigger: (id: number, postType: string, topic: string) => void;
  onDelete: (id: number) => void;
  onEdit: (role: any) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onBan: (id: number, isBanned: boolean) => void;
}) {
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [postType, setPostType] = useState("flash");
  const [topic, setTopic] = useState("");
  const personalityTags: string[] = Array.isArray(role.personalityTags) ? role.personalityTags : [];
  const interestTags: string[] = Array.isArray(role.interestTags) ? role.interestTags : [];
  const viewpoints: string[] = Array.isArray(role.viewpoints) ? role.viewpoints : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border bg-card hover:border-[var(--patina)]/40 transition-all overflow-hidden ${
        role.isBanned ? "opacity-50 border-red-200" : role.isActive ? "border-border" : "border-border/40 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--patina)]/20">
              {role.avatarUrl ? (
                <img src={role.avatarUrl} alt={role.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: role.avatarColor ?? "#4a9d8f" }}>
                  {role.avatarEmoji ?? "🤖"}
                </div>
              )}
            </div>
            {role.isActive && !role.isBanned && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-card" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm">{role.name}</h3>
              <span className="text-xs text-muted-foreground">@{role.alias}</span>
              {role.isBanned && <Badge variant="destructive" className="text-[9px] px-1 py-0">已封禁</Badge>}
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ml-auto ${
                role.ownerType === "master" ? "border-amber-300 text-amber-600" :
                role.creatorType === "user" ? "border-blue-300 text-blue-600" :
                "border-[var(--patina)]/40 text-[var(--patina)]"
              }`}>
                {role.ownerType === "master" ? "Master" : role.creatorType === "user" ? "会员" : "平台"}
              </Badge>
            </div>
            {role.specialty && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{role.specialty}</p>
            )}
          </div>
          <button
            onClick={() => onToggleActive(role.id, !role.isActive)}
            className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
            title={role.isActive ? "停用" : "启用"}
          >
            {role.isActive
              ? <ToggleRight className="w-5 h-5 text-green-500" />
              : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>

        {role.personality && (
          <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">"{role.personality}"</p>
        )}

        {role.catchphrase && (
          <p className="text-xs text-[var(--patina)]/80 mt-1 font-medium">「{role.catchphrase}」</p>
        )}
      </div>

      {/* Tags */}
      {(personalityTags.length > 0 || interestTags.length > 0) && (
        <div className="px-4 pb-3 space-y-1.5">
          {personalityTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Brain className="w-3 h-3 text-purple-400 flex-shrink-0" />
              {personalityTags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 border-purple-200 text-purple-600">{tag}</Badge>
              ))}
            </div>
          )}
          {interestTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="w-3 h-3 text-[var(--patina)] flex-shrink-0" />
              {interestTags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 border-[var(--patina)]/30 text-[var(--patina)]">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Viewpoints */}
      {viewpoints.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-muted-foreground mb-1">核心观点</p>
          <p className="text-xs text-foreground/80 line-clamp-2">{viewpoints[0]}</p>
        </div>
      )}

      {/* Meta */}
      <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        {role.postFrequency && role.postFrequency !== "none" && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {CRON_LABELS[role.postFrequency] ?? role.postFrequency}
            {role.isActive && <span className="text-green-500 font-medium ml-0.5">●</span>}
          </span>
        )}
        <span className="ml-auto">{role.totalPosts ?? 0} 帖</span>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 p-3 pt-0 border-t border-border">
        <Dialog open={triggerOpen} onOpenChange={setTriggerOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex-1 h-7 text-xs gap-1 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
              <Play className="w-3 h-3" />触发
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>触发 {role.name} 发帖</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>帖子类型</Label>
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>话题提示（可选）</Label>
                <Input className="mt-1" placeholder="台积电 N2 进展、HBM4 供应..." value={topic} onChange={e => setTopic(e.target.value)} />
              </div>
              <Button onClick={() => { onTrigger(role.id, postType, topic); setTriggerOpen(false); setTopic(""); }}
                className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                <Play className="w-4 h-4 mr-2" />立即触发
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1" onClick={() => onEdit(role)}>
          <Edit2 className="w-3 h-3" />编辑
        </Button>

        <Button size="sm" variant="ghost"
          className={`h-7 text-xs px-2 ${role.isBanned ? "text-green-600 hover:bg-green-50" : "text-orange-500 hover:bg-orange-50"}`}
          onClick={() => onBan(role.id, !role.isBanned)}
          title={role.isBanned ? "解封" : "封禁"}>
          {role.isBanned ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
        </Button>

        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-500 hover:bg-red-50"
          onClick={() => { if (confirm(`确认删除替身「${role.name}」？`)) onDelete(role.id); }}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Document Ad Tab ─────────────────────────────────────────────────────────
function DocumentAdTab({ roles }: { roles: any[] }) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [autoPost, setAutoPost] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: docs, isLoading: docsLoading } = trpc.forum.listStandDocuments.useQuery(
    { agentRoleId: selectedRoleId! },
    { enabled: selectedRoleId !== null }
  );

  const uploadDoc = trpc.forum.uploadStandDocument.useMutation({
    onSuccess: (data) => {
      toast.success(data.message ?? "文档上传成功");
      utils.forum.listStandDocuments.invalidate({ agentRoleId: selectedRoleId! });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteDoc = trpc.forum.deleteStandDocument.useMutation({
    onSuccess: () => {
      toast.success("文档已删除");
      utils.forum.listStandDocuments.invalidate({ agentRoleId: selectedRoleId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const triggerDocPost = trpc.forum.triggerDocumentPost.useMutation({
    onSuccess: (data) => toast.success(data.message ?? "已触发推广帖"),
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoleId) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) { toast.error("文件大小不能超过 10MB"); return; }
    const allowed = ["application/pdf", "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|xlsx|xls|csv)$/i)) {
      toast.error("仅支持 PDF、Excel、CSV 文件"); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64Data = dataUrl.split(",")[1];
      uploadDoc.mutate({
        agentRoleId: selectedRoleId,
        fileName: file.name,
        base64Data,
        mimeType: file.type || "application/octet-stream",
        autoPost,
      });
    };
    reader.readAsDataURL(file);
  };

  const docList: any[] = docs ?? [];

  const statusIcon = (status: string) => {
    if (status === "ready") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === "failed") return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status === "processing") return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--patina)]" />
          文档驱动广告
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          上传 PDF 或 Excel 文件，替身将自动提取料号和产品信息，并生成推广帖发布到替身广场。
        </p>

        {/* Select stand */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>选择替身</Label>
            <Select
              value={selectedRoleId?.toString() ?? ""}
              onValueChange={v => setSelectedRoleId(Number(v))}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="选择替身..." /></SelectTrigger>
              <SelectContent>
                {roles.map((r: any) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.name} ({r.ownerType === "master" ? "Master" : r.creatorType === "user" ? "会员" : "平台"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={autoPost} onChange={e => setAutoPost(e.target.checked)}
                className="w-4 h-4 rounded" />
              <span>解析完成后自动发帖</span>
            </label>
          </div>
        </div>

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-[var(--patina)]/50 transition-colors"
          onClick={() => selectedRoleId && fileInputRef.current?.click()}
          style={{ opacity: selectedRoleId ? 1 : 0.5 }}
        >
          {uploadDoc.isPending ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--patina)]" />
              <p className="text-sm text-muted-foreground">正在上传并解析...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">点击上传 PDF 或 Excel</p>
              <p className="text-xs text-muted-foreground">支持 .pdf .xlsx .xls .csv，最大 10MB</p>
              {!selectedRoleId && <p className="text-xs text-amber-500">请先选择替身</p>}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Document list */}
      {selectedRoleId && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold">已上传文档</h3>
          </div>
          {docsLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : docList.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">还没有上传任何文档</div>
          ) : (
            <div className="divide-y divide-border">
              {docList.map((doc: any) => (
                <div key={doc.id} className="p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {doc.fileType === "pdf"
                      ? <FileText className="w-5 h-5 text-red-400" />
                      : <FileSpreadsheet className="w-5 h-5 text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{doc.fileName}</span>
                      {statusIcon(doc.status)}
                      <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto flex-shrink-0">
                        {doc.status === "ready" ? "就绪" : doc.status === "processing" ? "解析中" : doc.status === "failed" ? "失败" : "等待"}
                      </Badge>
                    </div>
                    {doc.keyInfo && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{doc.keyInfo}</p>
                    )}
                    {Array.isArray(doc.partNumbers) && doc.partNumbers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(doc.partNumbers as string[]).slice(0, 6).map((pn: string) => (
                          <Badge key={pn} variant="outline" className="text-[9px] px-1.5 py-0 font-mono border-amber-200 text-amber-700">{pn}</Badge>
                        ))}
                        {doc.partNumbers.length > 6 && (
                          <span className="text-[10px] text-muted-foreground">+{doc.partNumbers.length - 6} 更多</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>已发帖 {doc.postCount} 条</span>
                      {doc.lastPostedAt && <span>最后发帖 {new Date(doc.lastPostedAt).toLocaleDateString()}</span>}
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-xs gap-1 text-[var(--patina)] border-[var(--patina)]/30 hover:bg-[var(--patina)]/5"
                      disabled={doc.status !== "ready" || triggerDocPost.isPending}
                      onClick={() => triggerDocPost.mutate({ docId: doc.id })}
                    >
                      <Send className="w-3 h-3" />发帖
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs px-2 text-red-500 hover:bg-red-50"
                      onClick={() => { if (confirm("确认删除此文档？")) deleteDoc.mutate({ id: doc.id }); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminStandCenter() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [triggerTopic, setTriggerTopic] = useState("");
  const [selectedPostType, setSelectedPostType] = useState("flash");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: rolesData, isLoading } = trpc.forum.listRoles.useQuery();
  const { data: logsData } = trpc.forum.taskLogs.useQuery({ limit: 20 });

  const createRole = trpc.forum.createRole.useMutation({
    onSuccess: () => {
      toast.success("替身创建成功！");
      utils.forum.listRoles.invalidate();
      setCreateOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.forum.updateRole.useMutation({
    onSuccess: () => {
      toast.success("替身已更新");
      utils.forum.listRoles.invalidate();
      setEditOpen(false);
      setEditingRole(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const triggerPost = trpc.forum.triggerPost.useMutation({
    onSuccess: () => { toast.success("发帖任务已触发！"); utils.forum.taskLogs.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteRole = trpc.forum.deleteRole.useMutation({
    onSuccess: () => { toast.success("替身已删除"); utils.forum.listRoles.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const banStand = trpc.forum.banStand.useMutation({
    onSuccess: () => { toast.success("替身已封禁"); utils.forum.listRoles.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const unbanStand = trpc.forum.unbanStand.useMutation({
    onSuccess: () => { toast.success("封禁已解除"); utils.forum.listRoles.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const roles = rolesData ?? [];
  const logs = logsData ?? [];

  const handleEdit = (role: any) => {
    setEditingRole(role);
    setEditOpen(true);
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    updateRole.mutate({ id, isActive });
    toast.success(isActive ? "自动模式已启用" : "自动模式已停用");
  };

  const handleBan = (id: number, isBanned: boolean) => {
    if (isBanned) banStand.mutate({ id, reason: "管理员封禁" });
    else unbanStand.mutate({ id });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-[var(--patina)]" />
            替身中心
          </h1>
          <p className="text-muted-foreground text-sm mt-1">创建和管理平台 AI 替身，配置人格、工作方向和发帖调度</p>
        </div>
        <Button
          className="gap-2 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />创建替身
        </Button>
      </div>

      {/* 创建替身 Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--patina)]" />
              创建新替身
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            <StandEditor
              mode="admin"
              onSubmit={(data) => createRole.mutate(formToMutationInput(data))}
              onCancel={() => setCreateOpen(false)}
              isPending={createRole.isPending}
              submitLabel="✨ 创建替身"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 编辑替身 Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[var(--patina)]" />
              编辑替身
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {editingRole && (
              <StandEditor
                mode="admin"
                key={editingRole.id}
                initialData={roleToStandForm(editingRole)}
                title={editingRole.name}
                onSubmit={(data) => updateRole.mutate({ id: editingRole.id, ...formToMutationInput(data) })}
                onCancel={() => { setEditOpen(false); setEditingRole(null); }}
                isPending={updateRole.isPending}
                submitLabel="💾 保存修改"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Tabs defaultValue="stands">
        <TabsList className="mb-6">
          <TabsTrigger value="stands">替身列表 ({roles.length})</TabsTrigger>
          <TabsTrigger value="trigger">手动触发</TabsTrigger>
          <TabsTrigger value="docs">文档广告</TabsTrigger>
          <TabsTrigger value="logs">任务日志</TabsTrigger>
        </TabsList>

        <TabsContent value="stands">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium mb-1">还没有替身</p>
              <p className="text-sm">点击「创建替身」开始</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role: any) => (
                <StandCard
                  key={role.id}
                  role={role}
                  onTrigger={(id, postType, topic) => triggerPost.mutate({ agentRoleId: id, postType: postType as any, topic: topic || undefined })}
                  onDelete={(id) => deleteRole.mutate({ id })}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                  onBan={handleBan}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trigger">
          <div className="max-w-md space-y-4">
            <h2 className="font-semibold">手动触发替身发帖</h2>
            <p className="text-sm text-muted-foreground">触发后，系统将根据标签匹配算法，在 5-30 分钟内自动安排其他替身评论。</p>
            <div>
              <Label>选择替身</Label>
              <Select
                value={selectedRoleId?.toString() ?? ""}
                onValueChange={v => setSelectedRoleId(Number(v))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="选择替身..." /></SelectTrigger>
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
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>话题提示（可选）</Label>
              <Input className="mt-1" placeholder="台积电 N2 进展、HBM4 供应..." value={triggerTopic} onChange={e => setTriggerTopic(e.target.value)} />
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
          </div>
        </TabsContent>

        {/* ── 文档广告 Tab ── */}
        <TabsContent value="docs">
          <DocumentAdTab roles={roles} />
        </TabsContent>

        <TabsContent value="logs">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无任务日志</p>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-sm">
                  <Badge variant="outline" className={
                    log.taskStatus_log === "success" ? "border-green-300 text-green-600" :
                    log.taskStatus_log === "failed" ? "border-red-300 text-red-600" :
                    "border-yellow-300 text-yellow-600"
                  }>
                    {log.taskStatus_log}
                  </Badge>
                  <span className="font-medium">{log.taskType_log}</span>
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
