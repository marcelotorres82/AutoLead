"use client";
import { useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  LoaderCircle,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lushaMetrics } from "@/lib/domain";
export default function PersonasPage() {
  const {
    personas,
    companies,
    researchRuns,
    addPersona,
    updatePersonaReview,
    lushaUsed,
    setLushaUsed,
  } = useDemoStore();
  const [open, setOpen] = useState(false);
  const [reviewingId, setReviewingId] = useState<string>();
  const lusha = lushaMetrics(lushaUsed, 300);
  const companiesById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const leadRuns = researchRuns
    .filter((run) => run.researchType === "leads")
    .slice(0, 8);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await addPersona({
        name: String(data.get("name")),
        title: String(data.get("title")),
        companyId: String(data.get("companyId")),
        profileUrl: String(data.get("profileUrl") || ""),
        seniority: "Gerência",
        area: "Segurança",
        solution: "API Security",
        priority: 2,
        role: "Influenciador",
        lushaCreditUsed: false,
        sentToSalesloft: false,
        reviewStatus: "Pendente de validação",
      });
      setOpen(false);
      toast.success("Persona cadastrada manualmente");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao salvar persona",
      );
    }
  }
  return (
    <>
      <PageHeading
        title="Personas"
        description="Contatos encontrados manualmente, sem consultas automáticas ao LinkedIn ou Lusha."
        action={
          <Button onClick={() => setOpen(!open)}>
            <Plus className="size-4" />
            Cadastrar persona
          </Button>
        }
      />
      {open ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Nova persona manual</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
              <Input name="name" placeholder="Nome" required />
              <Input name="title" placeholder="Cargo" required />
              <select
                name="companyId"
                required
                className="h-10 rounded-lg border bg-transparent px-3 text-sm"
              >
                <option value="">Selecione a empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input
                name="profileUrl"
                type="url"
                placeholder="URL do perfil (opcional)"
              />
              <Button className="md:col-span-2">Salvar persona</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {leadRuns.length ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Pesquisas de leads</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {leadRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {run.companyName ?? "Empresa não identificada"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {run.status === "completed"
                      ? `${run.foundCount} candidato${run.foundCount === 1 ? "" : "s"} · ${run.duplicateCount} repetido${run.duplicateCount === 1 ? "" : "s"}`
                      : run.status === "failed"
                        ? (run.errors[0] ?? "Pesquisa falhou")
                        : `Em andamento · ${run.progress}%`}
                  </p>
                </div>
                <Badge>
                  {run.status === "completed"
                    ? "Concluída"
                    : run.status === "failed"
                      ? "Falhou"
                      : "Processando"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personas cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {personas.map((p) => (
              <article key={p.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-600">
                    <UserRound className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.title} · {companiesById.get(p.companyId)?.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{p.role}</Badge>
                      <Badge>{p.reviewStatus}</Badge>
                      {p.employmentStatus ? (
                        <Badge>Vínculo {p.employmentStatus}</Badge>
                      ) : null}
                      {p.confidence !== undefined ? (
                        <Badge>{p.confidence}% confiança</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                {p.evidence ? (
                  <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {p.evidence}
                  </p>
                ) : null}
                {p.researchedAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Pesquisado em{" "}
                    {new Date(p.researchedAt).toLocaleDateString("pt-BR")}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {p.sourceUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Fonte <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  ) : null}
                  {p.profileUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={p.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    disabled={
                      reviewingId === p.id || p.reviewStatus === "Aprovado"
                    }
                    onClick={async () => {
                      setReviewingId(p.id);
                      try {
                        await updatePersonaReview(p.id, "Aprovado");
                        toast.success("Persona aprovada");
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Falha ao aprovar persona",
                        );
                      } finally {
                        setReviewingId(undefined);
                      }
                    }}
                  >
                    {reviewingId === p.id ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                      <Check className="size-3" />
                    )}
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      reviewingId === p.id || p.reviewStatus === "Descartado"
                    }
                    onClick={async () => {
                      setReviewingId(p.id);
                      try {
                        await updatePersonaReview(p.id, "Descartado");
                        toast.success("Persona descartada");
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Falha ao descartar persona",
                        );
                      } finally {
                        setReviewingId(undefined);
                      }
                    }}
                  >
                    <X className="size-3" /> Descartar
                  </Button>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Controle Lusha · mês atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lusha.remaining}</p>
            <p className="text-sm text-slate-500">créditos restantes</p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Use créditos somente depois de validar a pessoa no Sales Navigator
              e aprová-la nesta tela. A integração continua manual.
            </p>
            <label className="mt-5 block text-sm">
              Créditos utilizados
              <Input
                className="mt-1"
                type="number"
                min="0"
                max="300"
                defaultValue={lushaUsed}
                onBlur={async (e) => {
                  try {
                    await setLushaUsed(Number(e.target.value));
                    toast.success("Consumo da Lusha atualizado");
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Falha ao atualizar consumo",
                    );
                  }
                }}
              />
            </label>
            {lusha.alert ? (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                Alerta: consumo atingiu {lusha.alert}% do limite mensal.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
