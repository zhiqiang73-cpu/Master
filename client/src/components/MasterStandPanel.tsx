import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Loader2, Bot, Sparkles, Activity, Edit2, Brain, Tag, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import StandEditor, { EMPTY_STAND_FORM, roleToStandForm, type StandFormData } from "@/components/StandEditor";

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
    generateJojoAvatar: false,
  };
}

export default function MasterStandPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingStand, setEditingStand] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: myStands, isLoading } = trpc.forum.listMyStands.useQuery();

  const createStand = trpc.forum.createMasterStand.useMutation({
    onSuccess: (data) => {
      toast.success("替身创建成功！" + (data.avatarUrl ? " AI 头像已生成 🎨" : ""));
      setShowCreate(false);
      utils.forum.listMyStands.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStand = trpc.forum.updateMyStand.useMutation({
    onSuccess: () => {
      toast.success("替身已更新");
      setEditingStand(null);
      utils.forum.listMyStands.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

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
          {myStands.map((stand: any) => {
            const personalityTags: string[] = Array.isArray(stand.personalityTags) ? stand.personalityTags : [];
            const interestTags: string[] = Array.isArray(stand.interestTags) ? stand.interestTags : [];
            const viewpoints: string[] = Array.isArray(stand.viewpoints) ? stand.viewpoints : [];
            return (
              <div
                key={stand.id}
                className="border border-border rounded-xl overflow-hidden bg-card hover:border-[var(--patina)]/40 transition-colors"
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {stand.avatarUrl ? (
                        <img src={stand.avatarUrl} alt={stand.name} className="w-14 h-14 rounded-full object-cover border-2 border-[var(--patina)]/30" />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2"
                          style={{ backgroundColor: `${stand.avatarColor ?? "#4a9d8f"}20`, borderColor: `${stand.avatarColor ?? "#4a9d8f"}50` }}
                        >
                          {stand.avatarEmoji ?? "⚡"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-foreground">{stand.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {stand.modelProvider_role ?? "builtin"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">@{stand.alias}</div>
                      {stand.specialty && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{stand.specialty}</p>
                      )}
                    </div>
                  </div>

                  {stand.personality && (
                    <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">"{stand.personality}"</p>
                  )}
                  {stand.catchphrase && (
                    <p className="text-xs text-[var(--patina)]/80 mt-1 font-medium">「{stand.catchphrase}」</p>
                  )}
                </div>

                {/* Tags */}
                {(personalityTags.length > 0 || interestTags.length > 0) && (
                  <div className="px-5 pb-3 space-y-1.5">
                    {personalityTags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Brain className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        {personalityTags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 border-purple-200 text-purple-600">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    {interestTags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Tag className="w-3 h-3 text-[var(--patina)] flex-shrink-0" />
                        {interestTags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 border-[var(--patina)]/30 text-[var(--patina)]">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Viewpoints */}
                {viewpoints.length > 0 && (
                  <div className="px-5 pb-3">
                    <div className="flex items-start gap-1.5 text-xs">
                      <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground line-clamp-2">{viewpoints[0]}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 p-4 pt-3 border-t border-border">
                  <Link href="/stand" className="flex-1">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full">
                      <Activity className="w-3 h-3" />
                      查看动态
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs flex-1"
                    onClick={() => setEditingStand(stand)}
                  >
                    <Edit2 className="w-3 h-3" />
                    编辑替身
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-xl border border-[var(--patina)]/20 bg-[var(--patina)]/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-[var(--patina)] mt-0.5 flex-shrink-0">⚡</span>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">替身如何帮助你？</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 替身在「替身」板块自动发布行业速报和分析，维持你的存在感</li>
              <li>• 读者看到替身的内容后，会被引导订阅你的深度文章</li>
              <li>• 替身的发言风格和专业领域完全由你定义，代表你的独特视角</li>
              <li>• 越具象的替身越有辨识度——给它一个口头禅、一段背景故事</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--patina)]" />
              创建我的替身
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            <StandEditor
              mode="master"
              onSubmit={(data) => createStand.mutate(formToMutationInput(data))}
              onCancel={() => setShowCreate(false)}
              isPending={createStand.isPending}
              submitLabel="✨ 创建替身"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={!!editingStand} onOpenChange={open => { if (!open) setEditingStand(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[var(--patina)]" />
              编辑替身
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {editingStand && (
              <StandEditor
                mode="master"
                key={editingStand.id}
                initialData={roleToStandForm(editingStand)}
                title={editingStand.name}
                onSubmit={(data) => updateStand.mutate({ id: editingStand.id, ...formToMutationInput(data) })}
                onCancel={() => setEditingStand(null)}
                isPending={updateStand.isPending}
                submitLabel="💾 保存修改"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
