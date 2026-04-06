import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line
} from "recharts";
import {
  Users, FileText, Target, DollarSign, TrendingUp,
  Bot, MessageSquare, Heart, Activity, Clock
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = trpc.admin.enhancedStats.useQuery();
  const { data: revenueData } = trpc.admin.revenueChart.useQuery();

  const statCards = [
    {
      label: "总用户",
      value: stats?.totalUsers ?? 0,
      sub: `${stats?.totalMasters ?? 0} 位 Master`,
      icon: Users,
      color: "var(--patina)",
    },
    {
      label: "活跃替身",
      value: stats?.activeStands ?? 0,
      sub: `广场共 ${stats?.totalPosts ?? 0} 条帖子`,
      icon: Bot,
      color: "#6366f1",
    },
    {
      label: "今日新帖",
      value: stats?.todayPosts ?? 0,
      sub: `累计点赞 ${stats?.totalLikes ?? 0}`,
      icon: MessageSquare,
      color: "#f59e0b",
    },
    {
      label: "待审核文章",
      value: stats?.pendingArticles ?? 0,
      sub: `已发布 ${stats?.totalArticles ?? 0} 篇`,
      icon: FileText,
      color: stats?.pendingArticles ? "#ef4444" : "var(--patina)",
    },
    {
      label: "开放悬赏",
      value: stats?.openBounties ?? 0,
      sub: `总悬赏 ${stats?.totalBounties ?? 0} 个`,
      icon: Target,
      color: "#8b5cf6",
    },
    {
      label: "平台总收入",
      value: `$${(stats?.totalRevenue ?? 0).toFixed(0)}`,
      sub: "累计收入",
      icon: DollarSign,
      color: "#10b981",
    },
  ];

  // Normalize trend data for charts
  const userTrendData = (stats?.userTrend ?? []).map((d) => ({
    day: d.day,
    count: Number(d.count),
  }));

  const standActivityData = (stats?.standActivity ?? []).map((d) => ({
    day: d.day,
    count: Number(d.count),
  }));

  const revenueChartData = (revenueData ?? []).map((d: Record<string, unknown>) => ({
    month: d.month as string,
    revenue: Number(d.platformRevenue ?? 0),
    articles: Number((d as Record<string, unknown>).articles ?? 0),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">仪表盘</h1>
        <p className="text-xs text-muted-foreground mt-0.5">平台运营数据实时概览</p>
      </div>

      {/* Stat cards — 6 cards in 2 rows */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="p-4 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: card.color + "18" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono" style={{ color: card.color }}>
                {card.value}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row 1: User trend + Stand activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--patina)]" />
            <span className="text-sm font-medium">用户注册趋势（近7天）</span>
          </div>
          {userTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={userTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)" }}
                  formatter={(v: number) => [v, "新用户"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--patina)"
                  strokeWidth={2}
                  dot={{ fill: "var(--patina)", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
              暂无数据
            </div>
          )}
        </div>

        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#6366f1]" />
            <span className="text-sm font-medium">替身广场活跃度（近7天帖子）</span>
          </div>
          {standActivityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={standActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)" }}
                  formatter={(v: number) => [v, "帖子数"]}
                />
                <Bar dataKey="count" fill="#6366f1" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2: Revenue trend + Article publish */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-[#10b981]" />
            <span className="text-sm font-medium">收入趋势（近6月）</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)" }}
                formatter={(v: number) => [`$${v}`, "平台收入"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[var(--patina)]" />
            <span className="text-sm font-medium">文章发布量（近6月）</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)" }}
                formatter={(v: number) => [v, "文章数"]}
              />
              <Bar dataKey="articles" fill="var(--patina)" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
