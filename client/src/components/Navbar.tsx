import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, ChevronDown, Globe, Search } from "lucide-react";
import { useI18n, type Language } from "@/contexts/I18nContext";

const langOptions: { code: Language; label: string; flag: string; short: string }[] = [
  { code: "zh", label: "中文", flag: "🇨🇳", short: "中文" },
  { code: "en", label: "English", flag: "🇬🇧", short: "EN" },
  { code: "ja", label: "日本語", flag: "🇯🇵", short: "JP" },
];

export default function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, t } = useI18n();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      logout();
      window.location.href = "/";
    },
  });

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/forum", label: lang === "en" ? "Agent Forum" : lang === "ja" ? "エージェント広場" : "Agent 论坛" },
    { href: "/insights", label: t.nav.insights },
    { href: "/subscribe", label: t.nav.subscribe },
    { href: "/bounties", label: t.nav.bounties },
  ];

  const currentLang = langOptions.find(l => l.code === lang)!;

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      {/* Circuit line decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--patina)] to-transparent opacity-30" />

      <nav className="container flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Master
              <span className="text-[var(--patina)]">.AI</span>
            </span>
            {/* Circuit dot */}
            <span className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-[var(--patina)] animate-circuit" />
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                location === link.href.split("?")[0]
                  ? "text-[var(--patina)] bg-[var(--patina)]/8"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs font-mono text-muted-foreground h-8 px-2">
                <Globe className="w-3.5 h-3.5" />
                <span>{currentLang.flag}</span>
                <span className="hidden sm:inline">{currentLang.short}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {langOptions.map(opt => (
                <DropdownMenuItem
                  key={opt.code}
                  onClick={() => setLang(opt.code)}
                  className={`cursor-pointer ${lang === opt.code ? "text-[var(--patina)] font-medium" : ""}`}
                >
                  <span className="mr-2 text-base">{opt.flag}</span>
                  {opt.label}
                  {lang === opt.code && <span className="ml-auto text-[var(--patina)]">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
            <Search className="w-4 h-4" />
          </Button>

          {/* Auth */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8">
                  <Avatar className="w-6 h-6">
                    {(user as any).avatarUrl && <AvatarImage src={(user as any).avatarUrl} alt={user.name ?? ""} />}
                    <AvatarFallback className="text-xs bg-[var(--patina)] text-white">
                      {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm hidden sm:block max-w-20 truncate">{user.name}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">{t.nav.dashboard}</Link>
                </DropdownMenuItem>
                {(user.role === "master" || user.role === "admin") && (
                  <DropdownMenuItem asChild>
                    <Link href="/master/dashboard">{t.nav.masterDashboard}</Link>
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">{t.nav.admin}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="text-destructive cursor-pointer"
                >
                  {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="h-8 bg-[var(--patina)] hover:bg-[var(--patina-dark)] text-white text-xs">
              <Link href="/login">{t.nav.login}</Link>
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden w-8 h-8"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border bg-background"
          >
            <div className="container py-3 flex flex-col gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
              {/* Language switcher in mobile */}
              <div className="pt-2 border-t border-border mt-1 flex gap-2">
                {langOptions.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => { setLang(opt.code); setMobileOpen(false); }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      lang === opt.code
                        ? "bg-[var(--patina)]/15 text-[var(--patina)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.flag} {opt.short}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
