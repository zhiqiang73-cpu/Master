import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Unsubscribe() {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("email") ?? "";
  });
  const [done, setDone] = useState(false);

  const unsubscribe = trpc.newsletter.unsubscribe.useMutation({
    onSuccess: () => setDone(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    unsubscribe.mutate({ email: email.trim() });
  };

  return (
    <div className="min-h-screen bg-[var(--kinari)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center"
      >
        {done ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">已成功退订</h1>
            <p className="text-[var(--ink-light)] mb-6">
              您已从 Master.AI 邮件列表中移除。感谢您曾经的关注。
            </p>
            <Link href="/">
              <a className="inline-block px-6 py-3 bg-[var(--patina)] text-white font-semibold rounded-lg hover:bg-[var(--patina-dark)] transition-all">
                返回首页
              </a>
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-[var(--patina)]/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-[var(--patina)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">退订邮件通知</h1>
            <p className="text-[var(--ink-light)] mb-6">
              输入您的邮箱地址以退订 Master.AI 的行业洞察周报。
            </p>
            {unsubscribe.isError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>退订失败，请检查邮箱地址是否正确。</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-[var(--ink)] placeholder-gray-400 focus:outline-none focus:border-[var(--patina)] transition-all"
              />
              <button
                type="submit"
                disabled={unsubscribe.isPending}
                className="w-full py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-all"
              >
                {unsubscribe.isPending ? "处理中..." : "确认退订"}
              </button>
            </form>
            <p className="text-xs text-[var(--ink-light)] mt-4">
              退订后您仍可随时重新订阅。
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
