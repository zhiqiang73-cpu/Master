import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, TrendingUp, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  fulfilled: "bg-blue-100 text-blue-700",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  active: "生效中",
  fulfilled: "已完成",
  expired: "已过期",
  cancelled: "已取消",
};

export default function SmartContracts() {
  const { isAuthenticated } = useAuth();
  const [earlyBirdOpen, setEarlyBirdOpen] = useState(false);
  const [revenueRightOpen, setRevenueRightOpen] = useState(false);

  // Form state
  const [articleId, setArticleId] = useState("");
  const [slots, setSlots] = useState("10");
  const [sharePct, setSharePct] = useState("5");
  const [terms, setTerms] = useState("");
  const [revenueSharePct, setRevenueSharePct] = useState("10");
  const [salePrice, setSalePrice] = useState("1000");

  const { data: contracts, refetch } = trpc.contracts.list.useQuery(
    { masterId: undefined },
    { enabled: isAuthenticated }
  );

  const earlyBirdMutation = trpc.contracts.createEarlyBird.useMutation({
    onSuccess: () => {
      toast.success("早期发现者合约已创建");
      setEarlyBirdOpen(false);
      refetch();
    },
    onError: (err) => toast.error("创建失败：" + err.message),
  });

  const revenueRightMutation = trpc.contracts.createRevenueRight.useMutation({
    onSuccess: () => {
      toast.success("收益权合约已创建");
      setRevenueRightOpen(false);
      refetch();
    },
    onError: (err) => toast.error("创建失败：" + err.message),
  });

  const earlyBirdContracts = contracts?.filter(c => c.contractType === "early_bird") ?? [];
  const revenueRightContracts = contracts?.filter(c => c.contractType === "revenue_right") ?? [];

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
      <div className="container max-w-5xl py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display mb-1">智能合约</h1>
          <p className="text-muted-foreground text-sm">
            管理早期发现者分成合约和文章收益权交易
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-numeric">{earlyBirdContracts.length}</p>
                  <p className="text-xs text-muted-foreground">早期发现者合约</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-numeric">{revenueRightContracts.length}</p>
                  <p className="text-xs text-muted-foreground">收益权合约</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--patina)]/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-[var(--patina)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-numeric">
                    {contracts?.filter(c => c.status === "active").length ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">生效中合约</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="early_bird">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="early_bird">早期发现者分成</TabsTrigger>
              <TabsTrigger value="revenue_right">收益权交易</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {/* Create Early Bird */}
              <Dialog open={earlyBirdOpen} onOpenChange={setEarlyBirdOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    早期发现者合约
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>创建早期发现者合约</DialogTitle>
                    <DialogDescription>
                      前 N 位付费读者将获得该文章未来收益的固定分成比例
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>文章 ID</Label>
                      <Input
                        value={articleId}
                        onChange={e => setArticleId(e.target.value)}
                        placeholder="输入文章 ID（在文章管理中查看）"
                        type="number"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>早期发现者名额</Label>
                        <Input
                          value={slots}
                          onChange={e => setSlots(e.target.value)}
                          type="number"
                          min="1"
                          max="100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>每位分成比例 (%)</Label>
                        <Input
                          value={sharePct}
                          onChange={e => setSharePct(e.target.value)}
                          type="number"
                          min="1"
                          max="20"
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                      <p className="font-medium">合约预览</p>
                      <p className="text-muted-foreground mt-1">
                        前 {slots} 位付费读者，每人获得该文章 {sharePct}% 的持续收益分成。
                        总分成上限：{Number(slots) * Number(sharePct)}%
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>合约条款（可选）</Label>
                      <Textarea
                        value={terms}
                        onChange={e => setTerms(e.target.value)}
                        placeholder="补充说明合约条款..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => earlyBirdMutation.mutate({
                        articleId: Number(articleId),
                        slots: Number(slots),
                        sharePct: Number(sharePct),
                        terms: terms || undefined,
                      })}
                      disabled={!articleId || earlyBirdMutation.isPending}
                      className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
                    >
                      {earlyBirdMutation.isPending ? "创建中..." : "创建合约"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Create Revenue Right */}
              <Dialog open={revenueRightOpen} onOpenChange={setRevenueRightOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
                    <Plus className="w-3.5 h-3.5" />
                    出售收益权
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>出售文章收益权</DialogTitle>
                    <DialogDescription>
                      将文章未来收益的一部分以固定价格出售给投资者
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>文章 ID</Label>
                      <Input
                        value={articleId}
                        onChange={e => setArticleId(e.target.value)}
                        placeholder="输入文章 ID"
                        type="number"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>出售收益权比例 (%)</Label>
                        <Input
                          value={revenueSharePct}
                          onChange={e => setRevenueSharePct(e.target.value)}
                          type="number"
                          min="1"
                          max="50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>出售价格（元）</Label>
                        <Input
                          value={salePrice}
                          onChange={e => setSalePrice(e.target.value)}
                          type="number"
                          min="10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>合约条款（可选）</Label>
                      <Textarea
                        value={terms}
                        onChange={e => setTerms(e.target.value)}
                        placeholder="补充说明合约条款..."
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => revenueRightMutation.mutate({
                        articleId: Number(articleId),
                        revenueSharePct: Number(revenueSharePct),
                        salePrice: Number(salePrice) * 100, // convert to cents
                        terms: terms || undefined,
                      })}
                      disabled={!articleId || revenueRightMutation.isPending}
                      className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white"
                    >
                      {revenueRightMutation.isPending ? "创建中..." : "创建合约"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Early Bird Contracts */}
          <TabsContent value="early_bird">
            {earlyBirdContracts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">还没有早期发现者合约</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    创建合约后，前 N 位付费读者将获得持续收益分成
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {earlyBirdContracts.map(contract => (
                  <Card key={contract.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">文章 #{contract.articleId}</span>
                            <Badge className={`text-xs ${statusColors[contract.status]}`}>
                              {statusLabels[contract.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            名额：{contract.earlyBirdFilled}/{contract.earlyBirdSlots} 已填充 ·
                            每位分成 {contract.earlyBirdSharePct}%
                          </p>
                          {contract.terms && (
                            <p className="text-xs text-muted-foreground mt-1">{contract.terms}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(contract.createdAt).toLocaleDateString("zh-CN")}
                          </p>
                          <p className="text-sm font-medium text-[var(--patina)] mt-1">
                            已支付 ¥{((contract.totalPaidOut ?? 0) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Revenue Right Contracts */}
          <TabsContent value="revenue_right">
            {revenueRightContracts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">还没有收益权合约</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    出售文章未来收益权，获得即时资金
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {revenueRightContracts.map(contract => (
                  <Card key={contract.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">文章 #{contract.articleId}</span>
                            <Badge className={`text-xs ${statusColors[contract.status]}`}>
                              {statusLabels[contract.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            出售 {contract.revenueSharePct}% 收益权 ·
                            售价 ¥{((contract.salePrice ?? 0) / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(contract.createdAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
