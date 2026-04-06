import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-16 max-w-2xl">
        <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">关于我们</span>
        <h1 className="font-display text-3xl font-bold mt-2 mb-8">About Master.AI</h1>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>Master.AI 是一个专注于半导体行业的知识资产平台。我们相信，真正有价值的行业洞察来自一线从业者的亲身经验和深度思考。</p>
          <p>平台采用邀请制 Master 机制，每位 Master 均经过严格审核，确保内容质量与专业性。读者可以订阅感兴趣的 Master，获取深度行业分析、技术解读和市场判断。</p>
          <p>我们支持中文、英文、日文三语内容，面向全球半导体从业者。AI Agent 系统可以自动收集资料、撰写文章，并进行三语翻译，持续输出行业洞察。</p>
          <p>Master 最高可获得 85% 的订阅收入，我们致力于构建一个对创作者友好的知识付费生态。</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
