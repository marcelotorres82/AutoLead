"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Lightbulb,
  Linkedin,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { companyStatuses } from "@/lib/domain";
import { scoreLabel } from "@/lib/evidence-intelligence";
export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { companies, updateStatus } = useDemoStore();
  const [researching, setResearching] = useState(false);
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
            {c.domain} · {c.city}/{c.state} · {c.size} · {c.subsegment}
          </p>
          {c.linkedinUrl ? (
            <a
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-cyan-700 hover:underline dark:text-cyan-300"
              href={c.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="size-4" />
              Perfil da empresa no LinkedIn
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={researching}
            onClick={async () => {
              setResearching(true);
              try {
                const response = await fetch(
                  `/api/companies/${c.id}/research`,
                  {
                    method: "POST",
                  },
                );
                if (!response.ok)
                  throw new Error("Falha ao iniciar nova pesquisa");
                toast.success(
                  "Atualização incremental iniciada; o histórico anterior será preservado",
                );
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Falha ao pesquisar novamente",
                );
              } finally {
                setResearching(false);
              }
            }}
          >
            <RefreshCw
              className={`size-4 ${researching ? "animate-spin" : ""}`}
            />
            {researching ? "Pesquisando…" : "Research Again"}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const response = await fetch("/api/crm-outbox", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  companyId: c.id,
                  destination: "Salesloft",
                }),
              });
              if (response.ok)
                toast.success(
                  "Registro preparado para aprovação antes do envio ao CRM",
                );
              else
                toast.error("Não foi possível preparar o registro para o CRM");
            }}
          >
            Preparar CRM
          </Button>
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
              {c.coreBusiness ? (
                <div className="mt-4 rounded-lg border p-4 text-sm">
                  <p>
                    <strong>Core business:</strong> {c.coreBusiness}
                  </p>
                  {c.classificationReason ? (
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      <strong>Justificativa da classificação:</strong>{" "}
                      {c.classificationReason}
                    </p>
                  ) : null}
                  {c.classificationSourceUrl ? (
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-cyan-700 hover:underline dark:text-cyan-300"
                      href={c.classificationSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Fonte da classificação
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 rounded-lg bg-cyan-50 p-4 text-sm text-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-100">
                <strong>Motivo da recomendação:</strong> {c.recommendation}
              </div>
              {c.criteriaReason ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800">
                  <strong>Aderência ao critério pesquisado:</strong>{" "}
                  {c.criteriaReason}
                  {c.criteriaConfidence !== undefined
                    ? ` (${c.criteriaConfidence}% de confiança)`
                    : ""}
                </div>
              ) : null}
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
              <CardTitle>Evidências verificáveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(c.evidenceDetails?.length
                ? c.evidenceDetails
                : c.sources.map((source) => ({
                    id: source.id,
                    type: "other",
                    statementKind: "FACT" as const,
                    claim: source.summary,
                    sourceUrl: source.url,
                    sourceTitle: source.title,
                    publisher: source.domain,
                    collectedAt: source.accessedAt,
                    excerpt: source.summary,
                    confidence: 0,
                    sourceQuality: 0,
                    freshnessScore: 0,
                    verified: false,
                    relevantSolutions: [],
                  }))
              ).map((evidence) => (
                <div key={evidence.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge>{evidence.statementKind}</Badge>
                        <Badge>{evidence.type}</Badge>
                        <Badge>
                          {evidence.verified ? "Verificada" : "Revisar"}
                        </Badge>
                      </div>
                      <p className="font-semibold">{evidence.claim}</p>
                      <p className="text-xs text-slate-500">
                        {evidence.publisher ?? "Fonte pública"} · Coletada em{" "}
                        {evidence.collectedAt.slice(0, 10)}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={evidence.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                        <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  </div>
                  {evidence.excerpt ? (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {evidence.excerpt}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Confiança {evidence.confidence}/100 · Fonte{" "}
                    {evidence.sourceQuality}/100 · Frescor{" "}
                    {evidence.freshnessScore}/100
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Website Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(c.technicalSignals ?? []).length ? (
                  c.technicalSignals?.map((signal) => (
                    <Badge key={`${signal.value}-${signal.sourceUrl}`}>
                      {signal.value} · {signal.detectionMethod} ·{" "}
                      {signal.confidence}%
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    A inspeção determinística ainda não encontrou sinais
                    técnicos.
                  </p>
                )}
              </div>
              {(c.websiteSnapshots ?? []).length ? (
                <div className="space-y-2">
                  {c.websiteSnapshots?.slice(0, 6).map((snapshot) => (
                    <div
                      key={`${snapshot.url}-${snapshot.fetchedAt}`}
                      className="flex flex-col justify-between gap-2 rounded-lg border p-3 text-sm md:flex-row md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{snapshot.url}</p>
                        <p className="text-xs text-slate-500">
                          {snapshot.category} ·{" "}
                          {snapshot.fetchedAt.slice(0, 16).replace("T", " ")}
                        </p>
                      </div>
                      <Badge>{snapshot.change}</Badge>
                    </div>
                  ))}
                </div>
              ) : null}
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
                Opportunity{" "}
                <span className="text-3xl text-cyan-600">
                  {c.opportunityScore ?? c.score}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-3 text-xs">
                <p className="font-semibold">Perfil de scoring</p>
                <p className="text-slate-500">
                  {c.scoringProfileVersion ?? "default-v1"}
                </p>
                {c.evidenceAudit ? (
                  <div className="mt-2 border-t pt-2">
                    <p>
                      Auditoria: {c.evidenceAudit.status} ·{" "}
                      {c.evidenceAudit.score}/100
                    </p>
                    {c.evidenceAudit.issues.map((issue) => (
                      <p
                        key={issue}
                        className="mt-1 text-amber-700 dark:text-amber-300"
                      >
                        · {issue}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
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
              <div className="grid grid-cols-2 gap-2 border-t pt-4 text-center text-xs">
                <div>
                  <strong>{c.confidenceScore ?? 0}</strong>
                  <p>{scoreLabel(c.confidenceScore ?? 0)} confidence</p>
                </div>
                <div>
                  <strong>{c.digitalExposureScore ?? 0}</strong>
                  <p>{scoreLabel(c.digitalExposureScore ?? 0)} digital</p>
                </div>
              </div>
              <Badge>{c.qualificationStatus ?? "NEEDS_RESEARCH"}</Badge>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
