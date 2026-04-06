import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, DollarSign, Users, FileText, ArrowUpRight, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const COLORS = ["#6B8F71", "#8BAF91", "#A8C5AE", "#C5DBCA", "#E2F0E5"];

export default function MasterRevenue() {
  const { isAuthenticated } = useAuth();

  const { data: masterData } = trpc.masters.myProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Revenue data comes from myProfile which includes revenue
  const revenueData = masterData?.revenue ?? null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    );
  }

  const totalRevenue = revenueData?.total ?? 0;
  const splits = revenueData?.splits ?? [];
  const chartData: Array<{month: string; revenue: number}> = [];
  const monthlyRevenue = 0;

  type RevenueSplit = (typeof splits)[number];
  const articleRevenue = splits.filter((s: RevenueSplit) => s.sourceType === "article_purchase");
  const subscriptionRevenue = splits.filter((s: RevenueSplit) => s.sourceType === "subscription");
  const bountyRevenue = splits.filter((s: RevenueSplit) => s.sourceType === "bounty");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-5xl py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display mb-1">收入一览</h1>
          <p className="text-muted-foreground text-sm">
            您的创作收益明细与分成记录
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-[var(--patina)]" />
                <span className="text-xs text-muted-foreground">累计收入</span>
              </div>
              <p className="text-2xl font-bold font-numeric text-[var(--patina)]">
                ¥{(totalRevenue / 100).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">本月收入</span>
              </div>
              <p className="text-2xl font-bold font-numeric text-blue-600">
                ¥{(monthlyRevenue / 100).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">文章数</span>
              </div>
              <p className="text-2xl font-bold font-numeric text-amber-600">
                {masterData?.articleCount ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">分成比例</span>
              </div>
              <p className="text-2xl font-bold font-numeric text-purple-600">
                {masterData?.levelInfo?.revenueShare ?? 70}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        {chartData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">收入趋势（近12个月）</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B8F71" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6B8F71" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `¥${(v / 100).toFixed(0)}`} />
                  <Tooltip formatter={(v: number) => [`¥${(v / 100).toFixed(2)}`, "收入"]} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6B8F71"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue Breakdown */}
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">全部明细</TabsTrigger>
            <TabsTrigger value="articles">文章购买</TabsTrigger>
            <TabsTrigger value="subscriptions">订阅收入</TabsTrigger>
            <TabsTrigger value="bounties">悬赏收入</TabsTrigger>
          </TabsList>

          {["all", "articles", "subscriptions", "bounties"].map(tab => {
                  const records = tab === "all"
                    ? (splits ?? [])
                    : tab === "articles"
                      ? articleRevenue
                      : tab === "subscriptions"
                        ? subscriptionRevenue
                        : bountyRevenue;

            return (
              <TabsContent key={tab} value={tab}>
                {records.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">暂无收入记录</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        发布文章或接受悬赏后，收入记录将在此显示
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {records.map((split) => (
                      <div
                        key={split.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--patina)]/10 flex items-center justify-center">
                            {split.sourceType === "article_purchase" && <FileText className="w-4 h-4 text-[var(--patina)]" />}
                            {split.sourceType === "subscription" && <Users className="w-4 h-4 text-blue-500" />}
                            {split.sourceType === "bounty" && <TrendingUp className="w-4 h-4 text-amber-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {split.sourceType === "article_purchase" && "文章购买"}
                              {split.sourceType === "subscription" && "订阅收入"}
                              {split.sourceType === "bounty" && "悬赏完成"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(split.createdAt).toLocaleString("zh-CN")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold font-numeric text-[var(--patina)]">
                            +¥{(Number(split.masterAmount) / 100).toFixed(2)}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-xs mt-0.5 border-amber-300 text-amber-700"
                          >
                            待结算
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Payout Info */}
        <Card className="mt-6 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">结算说明</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  收入每月1日自动结算，结算后转入您的账户余额。
                    您获得 <strong>{masterData?.levelInfo?.revenueShare ?? 70}%</strong>，
                  平台收取 <strong>{100 - Number(masterData?.levelInfo?.revenueShare ?? 70)}%</strong> 服务费。
                  Stripe 支付集成上线后，可直接提现至银行账户。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
