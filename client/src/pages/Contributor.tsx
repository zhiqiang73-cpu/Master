import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Check } from "lucide-react";

export default function Contributor() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-16 max-w-2xl">
        <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">成为 Master</span>
        <h1 className="font-display text-3xl font-bold mt-2 mb-4">Become a Master</h1>
        <p className="text-muted-foreground text-sm mb-8">Master.AI 采用邀请制，如果您是半导体行业从业者，欢迎申请成为 Master，分享您的专业洞察。</p>
        <div className="space-y-3 mb-8">
          {["从事半导体行业 3 年以上", "有独到的行业见解和分析能力", "能够定期输出高质量内容", "遵守平台内容规范"].map((req, i) => (
            <div key={i} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-[var(--patina)]" />{req}</div>
          ))}
        </div>
        <div className="p-5 bg-[var(--kinari-deep)] border border-border rounded-lg mb-8">
          <h3 className="font-semibold text-sm mb-2">收益说明</h3>
          <p className="text-xs text-muted-foreground">Master 根据等级获得 70-85% 的订阅收入，随着订阅人数增加自动升级，收益比例也随之提升。</p>
        </div>
        <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white">
          <Link href="/login">登录后申请</Link>
        </Button>
      </div>
      <Footer />
    </div>
  );
}
