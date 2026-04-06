import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, string> = {
  open: "开放接单", accepted: "已接单", submitted: "已提交",
  completed: "已完成", disputed: "争议中", cancelled: "已取消",
};

export default function BountyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: bounty, isLoading } = trpc.bounties.byId.useQuery({ id: Number(id) }, { enabled: !!id });
  const acceptMutation = trpc.bounties.accept.useMutation({
    onSuccess: () => { toast.success("接单成功！"); utils.bounties.byId.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const completeMutation = trpc.bounties.complete.useMutation({
    onSuccess: () => { toast.success("已确认完成！"); utils.bounties.byId.invalidate(); },
    onError: e => toast.error(e.message),
  });

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--patina)]" /></div></div>;
  if (!bounty) return <div className="min-h-screen bg-background"><Navbar /><div className="container py-20 text-center text-muted-foreground">悬赏不存在</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-2xl">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="font-display text-xl font-bold">{bounty.titleZh}</h1>
            <span className="text-[var(--patina)] font-mono font-bold text-xl">${bounty.amount}</span>
          </div>
          <div className="text-xs text-muted-foreground mb-4">
            状态：<span className="font-medium text-foreground">{STATUS_MAP[bounty.status]}</span>
          </div>
          {bounty.descriptionZh && <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{bounty.descriptionZh}</p>}
          <div className="flex gap-2">
            {bounty.status === "open" && user?.role === "master" && (
              <Button onClick={() => acceptMutation.mutate({ id: bounty.id })} disabled={acceptMutation.isPending} className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                {acceptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "接单"}
              </Button>
            )}
            {bounty.status === "submitted" && bounty.userId === user?.id && (
              <Button onClick={() => completeMutation.mutate({ id: bounty.id, rating: 5 })} disabled={completeMutation.isPending} className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                {completeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认完成"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
