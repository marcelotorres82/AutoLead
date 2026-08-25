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
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
const nav = [
  { href: "/dashboard", label: "Visão geral", icon: BarChart3 },
  { href: "/research", label: "Pesquisa diária", icon: CalendarSearch },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/personas", label: "Personas", icon: Users },
  { href: "/verticals", label: "Verticais", icon: Tags },
  { href: "/history", label: "Histórico", icon: Clock3 },
  { href: "/backups", label: "Backups", icon: DatabaseBackup },
  { href: "/settings", label: "Configurações", icon: Settings },
];
export function AppShell({
  children,
  demoMode,
}: {
  children: React.ReactNode;
  demoMode: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
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
            Pesquisa pública com Exa, OpenAI e Neon.
          </p>
        </div>
      )}
    </aside>
  );
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="fixed inset-y-0 left-0 hidden lg:block">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="relative z-10">{sidebar}</div>
          <button
            aria-label="Fechar menu"
            className="flex-1 bg-black/50"
            onClick={() => setOpen(false)}
          >
            <X className="absolute right-4 top-4 text-white" />
          </button>
        </div>
      ) : null}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:px-7">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </Button>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Pesquisar empresas, domínios ou tags…"
              aria-label="Pesquisa global"
            />
          </div>
          <div className="hidden text-right text-xs sm:block">
            <p className="font-semibold">Meta diária</p>
            <p className="text-slate-500">0 de 30 revisadas</p>
          </div>
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
        <main className="p-4 md:p-7">{children}</main>
      </div>
    </div>
  );
}
