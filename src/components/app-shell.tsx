"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Building2,
  CalendarSearch,
  Clock3,
  DatabaseBackup,
  LogOut,
  Menu,
  Moon,
  Radar,
  Search,
  Settings,
  Sun,
  Tags,
  Users,
} from "lucide-react";
import { useState } from "react";
import { MobileSheet } from "@/components/mobile-sheet";
import { useDemoStore } from "@/components/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { countsTowardGoal, dateInSaoPaulo } from "@/lib/domain";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/daily-queue", label: "Fila diária", icon: Users },
  { href: "/crm-outbox", label: "Fila CRM", icon: Building2 },
  { href: "/validation", label: "Validação jurídica", icon: Search },
  { href: "/dashboard", label: "Visão geral", icon: BarChart3 },
  { href: "/research", label: "Pesquisa diária", icon: CalendarSearch },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/personas", label: "Personas", icon: Users },
  { href: "/verticals", label: "Verticais", icon: Tags },
  { href: "/history", label: "Histórico", icon: Clock3 },
  { href: "/backups", label: "Backups", icon: DatabaseBackup },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export type ShellUser = {
  email: string;
  name?: string;
  picture?: string;
  provider?: string;
};

export function AppShell({
  children,
  demoMode,
  user,
}: {
  children: React.ReactNode;
  demoMode: boolean;
  user?: ShellUser;
}) {
  const path = usePathname();
  const router = useRouter();
  const { companies } = useDemoStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const today = dateInSaoPaulo();
  const reviewedToday = Math.min(
    30,
    companies.filter(
      (company) =>
        countsTowardGoal(company.status) && company.reviewedAt === today,
    ).length,
  );
  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-[#071b33] text-slate-200">
      <div className="flex h-20 items-center gap-3 px-5">
        <span className="grid size-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
          <Radar />
        </span>
        <div>
          <p className="font-bold text-white">Prospect Radar</p>
          <p className="text-xs text-slate-400">Inteligência comercial</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
              path.startsWith(href)
                ? "bg-cyan-500/15 text-cyan-300"
                : "hover:bg-white/5",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      {demoMode ? (
        <div className="m-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs">
          <p className="font-semibold text-cyan-300">Modo demonstração</p>
          <p className="mt-1 text-slate-400">
            Dados fictícios. Integrações reais desativadas.
          </p>
        </div>
      ) : (
        <div className="m-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs">
          <p className="font-semibold text-emerald-300">Integrações ativas</p>
          <p className="mt-1 text-slate-400">
            Pesquisa pública com Exa, Gemini e Neon.
          </p>
        </div>
      )}
    </aside>
  );
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4 focus:text-slate-950"
      >
        Pular para o conteúdo
      </a>
      <div className="fixed inset-y-0 left-0 hidden lg:block">{sidebar}</div>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:px-7">
          <MobileSheet
            open={open}
            onOpenChange={setOpen}
            title="Navegação"
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu />
              </Button>
            }
          >
            <nav className="grid gap-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={path.startsWith(href) ? "page" : undefined}
                  className="flex min-h-11 items-center gap-3 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              ))}
            </nav>
          </MobileSheet>
          <form
            className="relative min-w-0 max-w-md flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = globalQuery.trim();
              router.push(
                trimmed
                  ? `/companies?q=${encodeURIComponent(trimmed)}`
                  : "/companies",
              );
            }}
          >
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Pesquisar empresas, domínios ou tags…"
              aria-label="Pesquisa global"
              value={globalQuery}
              onChange={(event) => setGlobalQuery(event.target.value)}
            />
          </form>
          <div className="hidden text-right text-xs sm:block">
            <p className="font-semibold">Meta diária</p>
            <p className="text-slate-500">{reviewedToday} de 30 revisadas</p>
          </div>
          {user ? (
            <div
              className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-800 md:flex"
              title={user.email}
            >
              <div className="max-w-[160px] truncate text-right">
                <p className="truncate font-medium">
                  {user.name || user.email}
                </p>
                {user.name ? (
                  <p className="truncate text-[11px] text-slate-500">
                    {user.email}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut />
          </Button>
        </header>
        <nav
          aria-label="Navegação rápida"
          className="mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-white/95 px-2 pt-2 backdrop-blur dark:bg-slate-950/95 lg:hidden"
        >
          {[
            { href: "/dashboard", label: "Início", icon: BarChart3 },
            { href: "/research", label: "Pesquisar", icon: Search },
            { href: "/companies", label: "Empresas", icon: Building2 },
            { href: "/daily-queue", label: "Fila", icon: Users },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold",
                path.startsWith(href)
                  ? "bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200"
                  : "text-slate-600 dark:text-slate-300",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <main id="main-content" className="min-w-0 p-4 pb-28 md:p-7 lg:pb-7">
          {children}
        </main>
      </div>
    </div>
  );
}
