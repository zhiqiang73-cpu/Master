import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Tag, Plus, Ban, Gift, Minus } from "lucide-react";
import { toast } from "sonner";

type CouponType = "fixed" | "percent";

export default function AdminWalletCenter() {
  const utils = trpc.useUtils();

  // Wallets list
  const { data: wallets = [], isLoading: walletsLoading } = trpc.wallet.adminListWallets.useQuery({ limit: 50, offset: 0 });
  const { data: coupons = [], isLoading: couponsLoading } = trpc.wallet.adminListCoupons.useQuery();

  // Grant/Deduct dialog
  const [grantDialog, setGrantDialog] = useState<{ open: boolean; userId: number; mode: "grant" | "deduct" }>({
    open: false, userId: 0, mode: "grant",
  });
  const [grantAmount, setGrantAmount] = useState("");
  const [grantDesc, setGrantDesc] = useState("");

  const grantMutation = trpc.wallet.adminGrant.useMutation({
    onSuccess: () => {
      toast.success("操作成功");
      utils.wallet.adminListWallets.invalidate();
      setGrantDialog({ open: false, userId: 0, mode: "grant" });
      setGrantAmount("");
      setGrantDesc("");
    },
    onError: (e) => toast.error(e.message),
  });
  const deductMutation = trpc.wallet.adminDeduct.useMutation({
    onSuccess: () => {
      toast.success("操作成功");
      utils.wallet.adminListWallets.invalidate();
      setGrantDialog({ open: false, userId: 0, mode: "grant" });
      setGrantAmount("");
      setGrantDesc("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGrantDeduct = () => {
    const amount = Math.round(parseFloat(grantAmount) * 100);
    if (isNaN(amount) || amount <= 0) {
      toast.error("请输入输入有效金额");
      return;
    }
    if (grantDialog.mode === "grant") {
      grantMutation.mutate({ userId: grantDialog.userId, amount, description: grantDesc || "管理员赠送" });
    } else {
      deductMutation.mutate({ userId: grantDialog.userId, amount, description: grantDesc || "管理员扣款" });
    }
  };

  // Coupon creation dialog
  const [couponDialog, setCouponDialog] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "fixed" as CouponType,
    value: "",
    minSpend: "",
    totalCount: "",
    perUserLimit: "1",
    description: "",
    expiresAt: "",
  });

  const createCouponMutation = trpc.wallet.adminCreateCoupon.useMutation({
    onSuccess: () => {
      toast.success("优惠券创建成功");
      utils.wallet.adminListCoupons.invalidate();
      setCouponDialog(false);
      setCouponForm({ code: "", type: "fixed", value: "", minSpend: "", totalCount: "", perUserLimit: "1", description: "", expiresAt: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = trpc.wallet.adminDeactivateCoupon.useMutation({
    onSuccess: () => {
      toast.success("优惠券已停用");
      utils.wallet.adminListCoupons.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreateCoupon = () => {
    const value = couponForm.type === "fixed"
      ? Math.round(parseFloat(couponForm.value) * 100)
      : parseInt(couponForm.value);
    if (isNaN(value) || value <= 0) {
      toast.error("请输入有效面值");
      return;
    }
    createCouponMutation.mutate({
      code: couponForm.code,
      type: couponForm.type,
      value,
      minSpend: couponForm.minSpend ? Math.round(parseFloat(couponForm.minSpend) * 100) : 0,
      totalCount: couponForm.totalCount ? parseInt(couponForm.totalCount) : undefined,
      perUserLimit: parseInt(couponForm.perUserLimit) || 1,
      description: couponForm.description || undefined,
      expiresAt: couponForm.expiresAt || undefined,
    });
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setCouponForm((f) => ({ ...f, code }));
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="font-display text-xl font-bold">余额管理</h1>
        <p className="text-xs text-muted-foreground mt-0.5">管理用户账户余额和优惠券</p>
      </div>

      {/* User Wallets */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--patina)]" />
            <h2 className="text-sm font-semibold">用户钱包</h2>
          </div>
        </div>
        {walletsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}
          </div>
        ) : wallets.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">暂无用户钱包数据</div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">用户ID</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">余额</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">累计充值</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">累计消费</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/10">
                    <td className="px-3 py-2 font-mono">{w.userId}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--patina)]">
                      ¥{(w.balance / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-500">
                      ¥{(w.totalCharged / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-500">
                      ¥{(w.totalSpent / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-emerald-600 hover:bg-emerald-50"
                          onClick={() => setGrantDialog({ open: true, userId: w.userId, mode: "grant" })}
                        >
                          <Gift className="w-3 h-3 mr-1" />赠送
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-rose-500 hover:bg-rose-50"
                          onClick={() => setGrantDialog({ open: true, userId: w.userId, mode: "deduct" })}
                        >
                          <Minus className="w-3 h-3 mr-1" />扣款
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Coupons */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold">优惠券管理</h2>
          </div>
          <Button size="sm" onClick={() => setCouponDialog(true)} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" />创建优惠券
          </Button>
        </div>
        {couponsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">暂无优惠券</div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">券码</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">类型/面值</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">使用量</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">说明</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">状态</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/10">
                    <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                    <td className="px-3 py-2">
                      {c.type === "fixed"
                        ? <span className="text-emerald-600">¥{(c.value / 100).toFixed(0)} 减免</span>
                        : <span className="text-blue-500">{c.value}% 折扣</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-center font-mono">
                      {c.usedCount}/{c.totalCount ?? "∞"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">
                      {c.description ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        variant={c.isActive ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {c.isActive ? "启用" : "停用"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-rose-500 hover:bg-rose-50"
                          onClick={() => deactivateMutation.mutate({ id: c.id })}
                        >
                          <Ban className="w-3 h-3 mr-1" />停用
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Grant/Deduct Dialog */}
      <Dialog open={grantDialog.open} onOpenChange={(open) => setGrantDialog((d) => ({ ...d, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {grantDialog.mode === "grant" ? "赠送余额" : "扣款"}（用户 #{grantDialog.userId}）
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">金额（元）</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="例：10.00"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">备注说明</label>
              <Input
                placeholder={grantDialog.mode === "grant" ? "管理员赠送" : "管理员扣款"}
                value={grantDesc}
                onChange={(e) => setGrantDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantDialog({ open: false, userId: 0, mode: "grant" })}>取消</Button>
            <Button
              onClick={handleGrantDeduct}
              disabled={grantMutation.isPending || deductMutation.isPending}
              className={grantDialog.mode === "deduct" ? "bg-rose-500 hover:bg-rose-600" : ""}
            >
              {grantDialog.mode === "grant" ? "确认赠送" : "确认扣款"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Coupon Dialog */}
      <Dialog open={couponDialog} onOpenChange={setCouponDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>创建优惠券</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">券码</label>
                <Input
                  placeholder="MASTER2025"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={generateCode} className="h-9">随机生成</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">类型</label>
                <Select
                  value={couponForm.type}
                  onValueChange={(v) => setCouponForm((f) => ({ ...f, type: v as CouponType }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">固定金额减免</SelectItem>
                    <SelectItem value="percent">百分比折扣</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  {couponForm.type === "fixed" ? "面值（元）" : "折扣（%）"}
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder={couponForm.type === "fixed" ? "10" : "20"}
                  value={couponForm.value}
                  onChange={(e) => setCouponForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">最低消费（元）</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0（无门槛）"
                  value={couponForm.minSpend}
                  onChange={(e) => setCouponForm((f) => ({ ...f, minSpend: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">总发行量</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="空=无限"
                  value={couponForm.totalCount}
                  onChange={(e) => setCouponForm((f) => ({ ...f, totalCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">每人限用次数</label>
                <Input
                  type="number"
                  min="1"
                  value={couponForm.perUserLimit}
                  onChange={(e) => setCouponForm((f) => ({ ...f, perUserLimit: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">过期时间</label>
                <Input
                  type="datetime-local"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">说明</label>
              <Input
                placeholder="内测专属优惠券"
                value={couponForm.description}
                onChange={(e) => setCouponForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCouponDialog(false)}>取消</Button>
            <Button onClick={handleCreateCoupon} disabled={createCouponMutation.isPending}>
              创建优惠券
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
