import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Check } from "lucide-react";

export default function Pricing() {
  const { data: levels } = trpc.masters.levels.useQuery();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-16 max-w-4xl">
        <div className="text-center mb-12">
          <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">订阅定价</span>
          <h1 className="font-display text-3xl font-bold mt-2 mb-3">Pricing</h1>
          <p className="text-muted-foreground text-sm">订阅价格由 Master 等级决定，等级越高，内容价值越高</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(levels ?? []).map(level => (
            <div key={level.level} className="p-5 bg-card border border-border rounded-lg hover:border-[var(--patina)]/50 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs text-[var(--patina)] bg-[var(--patina)]/10 px-2 py-0.5 rounded">Lv.{level.level}</span>
                <span className="font-semibold text-sm">{level.title}</span>
              </div>
              <div className="mb-4">
                <span className="text-2xl font-bold text-[var(--patina)]">${level.monthlyPrice}</span>
                <span className="text-xs text-muted-foreground">/月</span>
                <div className="text-xs text-muted-foreground mt-0.5">${level.yearlyPrice}/年</div>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[var(--patina)]" />无限阅读该 Master 所有文章</div>
                <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[var(--patina)]" />新文章邮件通知</div>
                <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[var(--patina)]" />Master 分成 {level.revenueShare}%</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 p-6 bg-[var(--kinari-deep)] border border-border rounded-lg text-center">
          <h2 className="font-semibold mb-2">透明分成机制</h2>
          <p className="text-sm text-muted-foreground">Master 根据等级获得 70-85% 的订阅收入。平台仅收取 15-30% 的服务费，用于维护平台运营和内容审核。</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
