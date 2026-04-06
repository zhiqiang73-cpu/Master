import { trpc } from "@/lib/trpc";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Users, FileText, Target, DollarSign, TrendingUp, Clock } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = trpc.admin.stats.useQuery();
  const { data: revenueData } = trpc.admin.revenueChart.useQuery();

  const statCards = [
    { label: "总用户", value: stats?.totalUsers ?? 0, icon: Users, change: `共 ${stats?.totalMasters ?? 0} 位 Master` },
    { label: "总文章数", value: stats?.totalArticles ?? 0, icon: FileText, change: `${stats?.pendingArticles ?? 0} 待审核` },
    { label: "悬赏总数", value: stats?.totalBounties ?? 0, icon: Target, change: `${stats?.openBounties ?? 0} 开放中` },
    { label: "平台总收入", value: `$${(stats?.totalRevenue ?? 0).toFixed(0)}`, icon: DollarSign, change: "累计收入" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">仪表盘</h1>
        <p className="text-xs text-muted-foreground mt-0.5">平台运营数据概览</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <Icon className="w-4 h-4 text-[var(--patina)]" />
              </div>
              <div className="text-2xl font-bold font-mono">{card.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{card.change}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[var(--patina)]" />
            <span className="text-sm font-medium">收入趋势（近6月）</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)" }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--patina)" fill="var(--patina)" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[var(--patina)]" />
            <span className="text-sm font-medium">文章发布量（近6月）</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, background: "var(--card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="articles" fill="var(--patina)" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
