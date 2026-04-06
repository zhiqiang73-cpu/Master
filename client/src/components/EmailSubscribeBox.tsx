import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface EmailSubscribeBoxProps {
  variant?: "hero" | "inline" | "minimal";
  masterId?: number;
  title?: string;
  description?: string;
  placeholder?: string;
  className?: string;
}

export default function EmailSubscribeBox({
  variant = "inline",
  masterId,
  title,
  description,
  placeholder = "your@email.com",
  className = "",
}: EmailSubscribeBoxProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setSubscribed(true);
      setEmail("");
      toast.success("订阅成功！感谢您的关注。");
    },
    onError: (err) => {
      toast.error(err.message || "订阅失败，请稍后重试");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe.mutate({ email: email.trim(), masterId });
  };

  if (subscribed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-3 text-[var(--patina)] ${className}`}
      >
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium">已订阅！每周精选行业洞察将发送至您的邮箱。</span>
      </motion.div>
    );
  }

  if (variant === "hero") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`w-full max-w-xl ${className}`}
      >
        {title && (
          <h3 className="text-xl font-bold text-[var(--ink)] mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-[var(--ink-light)] text-sm mb-4">{description}</p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-light)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--patina)]/30 rounded-lg text-[var(--ink)] placeholder-[var(--ink-light)] focus:outline-none focus:border-[var(--patina)] focus:ring-2 focus:ring-[var(--patina)]/20 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={subscribe.isPending}
            className="px-6 py-3 bg-[var(--patina)] text-white font-semibold rounded-lg hover:bg-[var(--patina-dark)] disabled:opacity-60 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            {subscribe.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            免费订阅
          </button>
        </form>
        <p className="text-xs text-[var(--ink-light)] mt-2">
          免费 · 每周一期 · 随时退订 · 不发垃圾邮件
        </p>
      </motion.div>
    );
  }

  if (variant === "minimal") {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          className="flex-1 px-3 py-2 text-sm bg-white border border-[var(--patina)]/30 rounded text-[var(--ink)] placeholder-[var(--ink-light)] focus:outline-none focus:border-[var(--patina)] transition-all"
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="px-4 py-2 text-sm bg-[var(--patina)] text-white font-medium rounded hover:bg-[var(--patina-dark)] disabled:opacity-60 transition-all"
        >
          {subscribe.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "订阅"}
        </button>
      </form>
    );
  }

  // Default: inline variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-gradient-to-br from-[var(--patina)]/5 to-[var(--patina)]/10 border border-[var(--patina)]/20 rounded-xl p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[var(--patina)]/15 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-[var(--patina)]" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-[var(--ink)] mb-1">
            {title ?? "订阅行业洞察周报"}
          </h4>
          <p className="text-sm text-[var(--ink-light)] mb-4">
            {description ?? "每周精选半导体行业深度分析，免费发送至您的邮箱。前3个月全部内容免费开放。"}
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className="flex-1 px-3 py-2 text-sm bg-white border border-[var(--patina)]/30 rounded-lg text-[var(--ink)] placeholder-[var(--ink-light)] focus:outline-none focus:border-[var(--patina)] transition-all"
            />
            <button
              type="submit"
              disabled={subscribe.isPending}
              className="px-5 py-2 text-sm bg-[var(--patina)] text-white font-semibold rounded-lg hover:bg-[var(--patina-dark)] disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {subscribe.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              免费订阅
            </button>
          </form>
          <p className="text-xs text-[var(--ink-light)] mt-2">
            不发垃圾邮件 · 随时退订
          </p>
        </div>
      </div>
    </motion.div>
  );
}
