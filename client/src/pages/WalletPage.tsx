import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpRight, ArrowDownLeft, Gift, Tag, Clock } from "lucide-react";
import { getLoginUrl } from "@/const";

const TX_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  recharge: { label: "充值", color: "text-emerald-600", icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  spend: { label: "消费", color: "text-rose-500", icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
  refund: { label: "退款", color: "text-blue-500", icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  coupon: { label: "优惠券", color: "text-purple-500", icon: <Tag className="w-3.5 h-3.5" /> },
  admin_grant: { label: "赠送", color: "text-amber-500", icon: <Gift className="w-3.5 h-3.5" /> },
  admin_deduct: { label: "扣款", color: "text-rose-500", icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
};

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const [couponCode, setCouponCode] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: wallet, isLoading: walletLoading } = trpc.wallet.myWallet.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: transactions = [], isLoading: txLoading } = trpc.wallet.myTransactions.useQuery(
    { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { enabled: !!user }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--patina)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Wallet className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">请先登录查看账户余额</p>
        <Button asChild>
          <a href={getLoginUrl()}>登录</a>
        </Button>
      </div>
    );
  }

  const balance = wallet?.balance ?? 0;
  const totalCharged = wallet?.totalCharged ?? 0;
  const totalSpent = wallet?.totalSpent ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Balance card */}
      <div className="p-6 bg-gradient-to-br from-[var(--patina)] to-teal-600 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-2 mb-4 opacity-80">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium">账户余额</span>
        </div>
        <div className="text-4xl font-bold font-mono mb-1">
          ¥{(balance / 100).toFixed(2)}
        </div>
        <div className="text-xs opacity-70 mt-3 flex gap-4">
          <span>累计充值 ¥{(totalCharged / 100).toFixed(2)}</span>
          <span>累计消费 ¥{(totalSpent / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "可用余额", value: `¥${(balance / 100).toFixed(2)}`, color: "text-[var(--patina)]" },
          { label: "累计充值", value: `¥${(totalCharged / 100).toFixed(2)}`, color: "text-blue-500" },
          { label: "累计消费", value: `¥${(totalSpent / 100).toFixed(2)}`, color: "text-rose-500" },
        ].map((s, i) => (
          <div key={i} className="p-3 bg-card border border-border rounded-lg text-center">
            <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Coupon input */}
      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium">使用优惠券</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="输入优惠券码"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            className="font-mono text-sm"
          />
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => {
              // TODO: integrate with checkout flow
              alert("优惠券将在下次付款时自动抵扣");
            }}
          >
            验证
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">优惠券不可提现，仅限平台内消费使用</p>
      </div>

      {/* Recharge notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-700">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">充值功能即将开放</span>
        </div>
        <p className="text-xs text-amber-600 mt-1">支持 Stripe（信用卡）和支付宝，敬请期待。</p>
      </div>

      {/* Transaction history */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          交易记录
        </h3>
        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            暂无交易记录
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const meta = TX_TYPE_LABELS[tx.type] ?? { label: tx.type, color: "text-foreground", icon: null };
              const isPositive = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPositive ? "bg-emerald-100" : "bg-rose-100"}`}>
                    <span className={meta.color}>{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{tx.description ?? ""}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className={`font-mono font-semibold text-sm ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
                    {isPositive ? "+" : ""}¥{(tx.amount / 100).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {transactions.length === PAGE_SIZE && (
          <div className="flex justify-center mt-4">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)}>
              加载更多
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
