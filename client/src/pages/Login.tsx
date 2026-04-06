import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ email: "", password: "", name: "", inviteCode: "" });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => { toast.success("登录成功！"); window.location.href = "/"; },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("注册成功！正在自动登录...");
      // Auto-login after registration
      loginMutation.mutate({ email: variables.email, password: variables.password });
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: inviteValid } = trpc.auth.validateInviteCode.useQuery(
    { code: registerForm.inviteCode },
    { enabled: registerForm.inviteCode.length >= 6 }
  );

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-1 bg-[var(--kinari-deep)] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 blueprint-grid opacity-40" />
        <div className="relative z-10 text-center px-12">
          <div className="font-display text-4xl font-bold mb-4">Master<span className="text-[var(--patina)]">.AI</span></div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">半导体行业知识资产平台<br />一线从业者的深度洞察</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" as const }} className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <span className="font-display text-2xl font-bold">Master<span className="text-[var(--patina)]">.AI</span></span>
          </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-xs font-medium">邮箱</Label>
                  <Input id="login-email" type="email" placeholder="your@email.com" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="login-password" className="text-xs font-medium">密码</Label>
                  <div className="relative mt-1">
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && loginMutation.mutate(loginForm)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white" onClick={() => loginMutation.mutate(loginForm)} disabled={loginMutation.isPending || !loginForm.email || !loginForm.password}>
                  {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "登录"}
                </Button>
                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">或</span></div></div>
                <Button variant="outline" className="w-full" onClick={() => window.location.href = getLoginUrl()}>使用 Manus 账号登录</Button>
              </div>
            </TabsContent>
            <TabsContent value="register">
              <div className="space-y-4">
                <div><Label htmlFor="reg-name" className="text-xs font-medium">姓名</Label><Input id="reg-name" placeholder="您的姓名" value={registerForm.name} onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
                <div><Label htmlFor="reg-email" className="text-xs font-medium">邮箱</Label><Input id="reg-email" type="email" placeholder="your@email.com" value={registerForm.email} onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
                <div><Label htmlFor="reg-password" className="text-xs font-medium">密码</Label><Input id="reg-password" type="password" placeholder="至少 8 位" value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} className="mt-1" /></div>
                <div>
                  <Label htmlFor="reg-invite" className="text-xs font-medium">邀请码 <span className="text-muted-foreground">(可选)</span></Label>
                  <div className="relative mt-1">
                    <Input id="reg-invite" placeholder="MASTER-XXXXXXXX" value={registerForm.inviteCode} onChange={e => setRegisterForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() }))} className={registerForm.inviteCode.length >= 6 ? (inviteValid?.valid ? "border-green-400" : "border-red-400") : ""} />
                    {registerForm.inviteCode.length >= 6 && <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${inviteValid?.valid ? "text-green-600" : "text-red-500"}`}>{inviteValid?.valid ? "✓ 有效" : "✗ 无效"}</span>}
                  </div>
                </div>
                <Button className="w-full bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white" onClick={() => registerMutation.mutate(registerForm)} disabled={registerMutation.isPending || !registerForm.email || !registerForm.password || !registerForm.name}>
                  {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "创建账号"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <p className="text-center text-xs text-muted-foreground mt-6"><Link href="/" className="hover:text-[var(--patina)] transition-colors">← 返回首页</Link></p>
        </motion.div>
      </div>
    </div>
  );
}
