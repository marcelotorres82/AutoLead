"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDashed,
  Coins,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Progress } from "@/components/progress";
import { ResearchRunList } from "@/components/research-run-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { countsTowardGoal, dateInSaoPaulo, lushaMetrics } from "@/lib/domain";
export default function Dashboard() {
  const { companies, lushaUsed, generate, demoMode } = useDemoStore();
  const [isResearching, setIsResearching] = useState(false);
  const [referenceDate] = useState(() => new Date());
  const today = dateInSaoPaulo(referenceDate);
  const weekStart = dateInSaoPaulo(
    new Date(referenceDate.getTime() - 6 * 86_400_000),
  );
  const reviewedToday = companies.filter(
    (c) => countsTowardGoal(c.status) && c.reviewedAt === today,
  ).length;
  const reviewedWeek = companies.filter(
    (c) =>
      countsTowardGoal(c.status) && c.reviewedAt && c.reviewedAt >= weekStart,
  ).length;
  const approved = companies.filter(
    (c) => c.status === "Aprovada para pesquisar leads",
  ).length;
  const pending = companies.filter(
    (c) => c.status === "Nova" || c.status === "Pendente de validação",
  ).length;
  const discarded = companies.filter((c) =>
    ["Descartada", "Sem aderência", "Duplicada"].includes(c.status),
  ).length;
  const lusha = lushaMetrics(lushaUsed, 300);
  const metrics = [
    {
      label: "Aprovadas",
      value: approved,
      icon: CheckCircle2,
      style: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Pendentes",
      value: pending,
      icon: CircleDashed,
      style: "text-amber-600 bg-amber-50",
    },
    {
      label: "Descartadas",
      value: discarded,
      icon: XCircle,
      style: "text-red-600 bg-red-50",
    },
    {
      label: "Empresas",
      value: companies.length,
      icon: Building2,
      style: "text-cyan-600 bg-cyan-50",
    },
  ];
  return (
    <>
      <PageHeading
        title="Visão geral"
        description="Priorize as melhores contas e acompanhe seu ritmo semanal."
        action={
          <Button
            disabled={isResearching}
            onClick={async () => {
              setIsResearching(true);
              try {
                const result = await generate();
                toast.success(
                  `${result.created} empresas adicionadas pela pesquisa`,
                );
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Falha ao executar pesquisa",
                );
              } finally {
                setIsResearching(false);
              }
            }}
          >
            <Play className="size-4" />
            {isResearching ? "Pesquisando…" : "Iniciar pesquisa de hoje"}
          </Button>
        }
      />
      {demoMode ? (
        <div className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100">
          <strong>Modo demonstração.</strong> Todos os fatos, fontes e empresas
          desta sessão são fictícios. Configure as integrações para iniciar
          pesquisas públicas reais.
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <strong>Pesquisa pública ativa.</strong> Resultados são fundamentados
          em fontes Tavily, analisados pelo provedor de IA configurado e
          persistidos no Neon.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, style }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-3xl font-bold">{value}</p>
              </div>
              <span
                className={`grid size-11 place-items-center rounded-xl ${style}`}
              >
                <Icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Progresso de revisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Hoje</span>
                <strong>{Math.min(reviewedToday, 30)} de 30 revisadas</strong>
              </div>
              <Progress value={Math.min(reviewedToday, 30)} max={30} />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Semana</span>
                <strong>{Math.min(reviewedWeek, 150)} de 150 avaliadas</strong>
              </div>
              <Progress
                value={Math.min(reviewedWeek, 150)}
                max={150}
                color="bg-blue-600"
              />
            </div>
            {reviewedToday < 30 ? (
              <div className="flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="size-5 shrink-0" />A meta diária ainda
                não foi atingida. Revise {30 - Math.min(reviewedToday, 30)}{" "}
                empresas para concluir.
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-5 text-cyan-600" />
              Créditos Lusha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lusha.remaining}</p>
            <p className="mb-4 text-sm text-slate-500">
              restantes de {lusha.limit}
            </p>
            <Progress
              value={lusha.used}
              max={lusha.limit}
              color={lusha.alert ? "bg-amber-500" : "bg-cyan-500"}
            />
            <p className="mt-2 text-xs text-slate-500">
              {lusha.percent}% consumidos neste mês
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Empresas com maior score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {companies
              .slice()
              .sort((a, b) => b.score - a.score)
              .slice(0, 4)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.vertical} · {c.solution}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{c.score}/100</Badge>
                    <ArrowRight className="size-4" />
                  </div>
                </Link>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimas execuções</CardTitle>
          </CardHeader>
          <CardContent>
            <ResearchRunList limit={4} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
