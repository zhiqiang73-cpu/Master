import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-[var(--kinari-deep)] py-12">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <span className="font-display font-bold text-lg">
              Master<span className="text-[var(--patina)]">.AI</span>
            </span>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              半导体行业知识资产平台
              <br />
              一线从业者的深度洞察
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-3 text-foreground">内容</p>
            <div className="flex flex-col gap-2">
              <Link href="/articles" className="text-xs text-muted-foreground hover:text-[var(--patina)] transition-colors">文章洞察</Link>
              <Link href="/bounties" className="text-xs text-muted-foreground hover:text-[var(--patina)] transition-colors">悬赏市场</Link>
              <Link href="/pricing" className="text-xs text-muted-foreground hover:text-[var(--patina)] transition-colors">订阅定价</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-3 text-foreground">创作者</p>
            <div className="flex flex-col gap-2">
              <Link href="/contributor" className="text-xs text-muted-foreground hover:text-[var(--patina)] transition-colors">成为 Master</Link>
              <Link href="/master/dashboard" className="text-xs text-muted-foreground hover:text-[var(--patina)] transition-colors">Master 面板</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-3 text-foreground">关于</p>
            <div className="flex flex-col gap-2">
              <Link href="/about" className="text-xs text-muted-foreground hover:text-[var(--patina)] transition-colors">关于我们</Link>
              <Link href="/login" className="text-xs text-muted-foreground hover:text-[var(--patina)] transition-colors">登录 / 注册</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground font-mono">
            © 2026 Master.AI · 半导体行业知识平台
          </p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--patina)] animate-circuit" />
            <span className="font-mono text-xs text-muted-foreground">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
