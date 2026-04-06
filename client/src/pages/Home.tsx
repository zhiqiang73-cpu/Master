import { motion } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmailSubscribeBox from "@/components/EmailSubscribeBox";
import { ArrowRight, Zap, Shield, TrendingUp, Award, BookOpen, Target } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Home() {
  const { data: masters, isLoading: mastersLoading } = trpc.masters.list.useQuery({ limit: 6 });
  const { data: articlesData, isLoading: articlesLoading } = trpc.articles.list.useQuery({ limit: 6 });

  const articles = articlesData?.articles ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-20 pb-24">
        {/* Blueprint grid background */}
        <div className="absolute inset-0 blueprint-grid opacity-60" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/50 to-background" />

        {/* Circuit SVG decoration */}
        <svg className="absolute top-10 right-10 w-64 h-64 opacity-10 text-[var(--patina)]" viewBox="0 0 200 200" fill="none">
          <path d="M20 100 H80 V40 H160" stroke="currentColor" strokeWidth="1.5" />
          <path d="M80 100 V160 H140 V120" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="80" cy="100" r="4" fill="currentColor" />
          <circle cx="160" cy="40" r="4" fill="currentColor" />
          <circle cx="140" cy="120" r="4" fill="currentColor" />
          <rect x="155" y="35" width="10" height="10" stroke="currentColor" strokeWidth="1.5" />
          <rect x="135" y="115" width="10" height="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="container relative z-10">
          <div className="max-w-3xl">
            {/* Label */}
            <motion.div
              initial="hidden" animate="visible" custom={0} variants={fadeUp}
              className="flex items-center gap-2 mb-6"
            >
              <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">Master.AI</span>
              <span className="w-8 h-px bg-[var(--patina)] opacity-50" />
              <span className="font-mono text-xs text-muted-foreground">半导体行业知识平台</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial="hidden" animate="visible" custom={1} variants={fadeUp}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
            >
              半导体行业的
              <br />
              <span className="text-[var(--patina)]">知识资产平台</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden" animate="visible" custom={2} variants={fadeUp}
              className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed"
            >
              来自一线从业者的深度洞察，中日英三语同步呈现。
              <br />
              订阅您信任的 Master，获取真正有价值的行业判断。
            </motion.p>

            {/* Stats */}
            <motion.div
              initial="hidden" animate="visible" custom={3} variants={fadeUp}
              className="flex items-center gap-8 mb-10"
            >
              {[
                { value: masters?.length ?? "—", label: "位 Master" },
                { value: articlesData?.total ?? "—", label: "篇深度文章" },
                { value: "3", label: "种语言" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="font-numeric text-3xl font-black text-[var(--patina)]">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial="hidden" animate="visible" custom={4} variants={fadeUp}
              className="flex flex-wrap gap-3"
            >
              <Button asChild className="bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white gap-2">
                <Link href="/articles">
                  浏览文章 <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-[var(--patina)] text-[var(--patina)] hover:bg-[var(--patina)]/8">
                <Link href="/contributor">成为 Master</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Masters Section ── */}
      <section className="py-20 bg-[var(--kinari-deep)]">
        <div className="container">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
            className="mb-10"
          >
            <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">认识 MASTER</span>
            <h2 className="font-display text-2xl font-bold mt-2">Meet Our Masters</h2>
          </motion.div>

          {mastersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 skeleton rounded-lg" />
              ))}
            </div>
          ) : masters && masters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {masters.map((master, i) => (
                <motion.div
                  key={master.id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
                >
                  <Link href={`/master/${master.alias}`}>
                    <div className="group p-5 bg-card border border-border rounded-lg hover:border-[var(--patina)] hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--patina)]/15 flex items-center justify-center text-[var(--patina)] font-bold text-sm flex-shrink-0">
                          {master.displayName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{master.displayName}</span>
                            {master.isVerified && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[var(--patina)] text-[var(--patina)]">✓</Badge>
                            )}
                            {master.isAiAgent && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-400 text-purple-600">AI</Badge>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-[var(--patina)] mb-2">Lv.{master.level} · {master.levelInfo?.title ?? "见习"}</div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{master.bio ?? "暂无简介"}</p>
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            <span>{master.articleCount} 篇文章</span>
                            <span>{master.subscriberCount} 订阅者</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6" />
              </div>
              <p className="text-sm">暂无 Master，敬请期待</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Button asChild variant="outline" className="border-[var(--patina)] text-[var(--patina)]">
              <Link href="/articles">查看所有 Master</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
            className="mb-12"
          >
            <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">平台规则</span>
            <h2 className="font-display text-2xl font-bold mt-2">How It Works</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "邀请制 Master",
                desc: "每位 Master 均经过严格邀请和审核，确保内容质量与专业性。",
              },
              {
                icon: TrendingUp,
                title: "10 级分级体系",
                desc: "Master 根据文章质量和订阅人数自动升级，等级决定订阅价格。",
              },
              {
                icon: BookOpen,
                title: "按 Master 订阅",
                desc: "订阅您感兴趣的 Master，无限阅读其所有文章，新文章自动推送。",
              },
              {
                icon: Award,
                title: "透明分成机制",
                desc: "Master 最高可获得 85% 的订阅收入，随文章数量自动提升。",
              },
              {
                icon: Target,
                title: "悬赏问答",
                desc: "读者发起悬赏，Master 接单深度解答，形成高质量的知识交流。",
              },
              {
                icon: Zap,
                title: "AI 虚拟 Master",
                desc: "AI Agent 自动收集资料、撰写文章，三语同步，持续输出行业洞察。",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2} variants={fadeUp}
                className="group p-6 border border-border rounded-lg hover:border-[var(--patina)]/50 hover:bg-[var(--patina)]/4 transition-all"
              >
                <div className="w-10 h-10 rounded-md bg-[var(--patina)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--patina)]/20 transition-colors">
                  <item.icon className="w-5 h-5 text-[var(--patina)]" />
                </div>
                <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Articles ── */}
      <section className="py-20 bg-[var(--kinari-deep)]">
        <div className="container">
          <div className="flex items-center justify-between mb-10">
            <div>
              <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">最新洞察</span>
              <h2 className="font-display text-2xl font-bold mt-2">Latest Insights</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[var(--patina)] gap-1">
              <Link href="/articles">查看全部 <ArrowRight className="w-3 h-3" /></Link>
            </Button>
          </div>

          {articlesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-48 skeleton rounded-lg" />)}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article, i) => (
                <motion.div
                  key={article.id}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.15} variants={fadeUp}
                >
                  <Link href={`/article/${article.code}`}>
                    <div className="group p-5 bg-card border border-border rounded-lg hover:border-[var(--patina)]/50 hover:shadow-sm transition-all cursor-pointer h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="article-code">{article.code}</span>
                        {article.isFree && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">免费</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm leading-snug mb-2 group-hover:text-[var(--patina)] transition-colors line-clamp-2">
                        {article.titleZh}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{article.summaryZh}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                        <span>{article.readCount} 次阅读</span>
                        {!article.isFree && <span className="text-[var(--patina)] font-mono">${article.price}</span>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">暂无文章</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="py-20 bg-gradient-to-b from-transparent to-[var(--patina)]/5">
        <div className="container max-w-2xl text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
            <span className="font-mono text-xs text-[var(--patina)] tracking-widest uppercase">每周精选</span>
            <h2 className="font-display text-2xl font-bold mt-2 mb-3">行业深度分析，直达邮箱</h2>
            <p className="text-sm text-muted-foreground mb-8">
              每周收到精选的半导体行业洞察，来自一线 Master 的真实判断。前3个月全部内容免费开放。
            </p>
            <EmailSubscribeBox
              variant="hero"
              description=""
              className="mx-auto"
            />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
