"use client";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Lightbulb,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { companyStatuses } from "@/lib/domain";
export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { companies, updateStatus } = useDemoStore();
  const c = companies.find((item) => item.id === id);
  if (!c)
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        Empresa não encontrada.
      </div>
    );
  const breakdown = [
    { label: "Aderência à vertical", value: c.breakdown.verticalFit, max: 20 },
    {
      label: "Porte e complexidade",
      value: c.breakdown.sizeComplexity,
      max: 15,
    },
    { label: "Presença digital", value: c.breakdown.digitalPresence, max: 20 },
    {
      label: "Canais transacionais",
      value: c.breakdown.transactionalChannels,
      max: 15,
    },
    { label: "Sinais recentes", value: c.breakdown.recentSignals, max: 15 },
    { label: "Aderência à solução", value: c.breakdown.solutionFit, max: 10 },
    {
      label: "Qualidade das evidências",
      value: c.breakdown.evidenceQuality,
      max: 5,
    },
  ];
  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{c.demo ? "Demonstração" : "Real"}</Badge>
            <Badge>{c.vertical}</Badge>
            <Badge>{c.solution}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold md:text-3xl">{c.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {c.domain} · {c.city}/{c.state} · {c.size}
          </p>
        </div>
        <select
          aria-label="Alterar status"
          className="h-10 rounded-lg border bg-white px-3 text-sm dark:bg-slate-900"
          value={c.status}
          onChange={async (e) => {
            try {
              await updateStatus(c.id, e.target.value as typeof c.status);
              toast.success("Status atualizado");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Falha ao atualizar status",
              );
            }
          }}
        >
          {companyStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Visão geral</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {c.description}
              </p>
              <div className="mt-4 rounded-lg bg-cyan-50 p-4 text-sm text-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-100">
                <strong>Motivo da recomendação:</strong> {c.recommendation}
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Fatos confirmados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.confirmedFacts.map((x) => (
                  <p key={x}>• {x}</p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Radio className="size-4 text-cyan-600" />
                  Sinais comerciais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.commercialSignals.length ? (
                  c.commercialSignals.map((x) => <p key={x}>• {x}</p>)
                ) : (
                  <p className="text-slate-500">Nenhum sinal recente.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lightbulb className="size-4 text-amber-600" />
                  Hipóteses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {c.hypotheses.map((x) => (
                  <p key={x}>• {x}</p>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Fontes e evidências</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {c.sources.map((s) => (
                <div key={s.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-xs text-slate-500">
                        {s.domain} · Acesso em {s.accessedAt}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={s.url} target="_blank" rel="noreferrer">
                        Abrir
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {s.summary}
                  </p>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Resumo editorial — não é citação literal da fonte.
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Preparar pesquisa no Sales Navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    Cargos recomendados
                  </p>
                  {c.titles.map((t) => (
                    <Badge key={t} className="mr-2 mb-2">
                      {t}
                    </Badge>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    String booleana
                  </p>
                  <div className="rounded-lg bg-slate-100 p-3 font-mono text-xs dark:bg-slate-800">
                    {c.navigatorQuery}
                  </div>
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(c.navigatorQuery);
                      toast.success("Filtros copiados");
                    }}
                  >
                    <Clipboard className="size-3" />
                    Copiar filtros
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                A aplicação não abre sessão nem extrai dados do LinkedIn. Use
                estes filtros manualmente.
              </p>
            </CardContent>
          </Card>
        </div>
        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Score geral{" "}
                <span className="text-3xl text-cyan-600">{c.score}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {breakdown.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{b.label}</span>
                    <strong>
                      {b.value}/{b.max}
                    </strong>
                  </div>
                  <div className="h-1.5 rounded bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded bg-cyan-500"
                      style={{ width: `${(b.value / b.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 border-t pt-4 text-center text-xs">
                <div>
                  <ShieldCheck className="mx-auto mb-1 size-4" />
                  <strong>{c.apiScore}</strong>
                  <p>API</p>
                </div>
                <div>
                  <ShieldCheck className="mx-auto mb-1 size-4" />
                  <strong>{c.waapScore}</strong>
                  <p>WAAP</p>
                </div>
                <div>
                  <ShieldCheck className="mx-auto mb-1 size-4" />
                  <strong>{c.guardicoreScore}</strong>
                  <p>GC</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
