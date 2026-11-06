"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { QualificationPanel } from "@/components/qualification-panel";
import { Button } from "@/components/ui/button";
import type { QualificationReport } from "@/lib/high-precision";
type QueueItem = {
  id: string;
  companyId: string;
  companyName?: string;
  status: string;
  rank?: number;
  whyNow?: string;
  destination?: string;
  payload?: { name?: string; qualification?: QualificationReport };
};
export function OperationsQueue({
  kind,
}: {
  kind: "daily-queue" | "crm-outbox";
}) {
  const { companies, demoMode } = useDemoStore();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string>();
  const crm = kind === "crm-outbox";
  useEffect(() => {
    const controller = new AbortController();
    if (demoMode) return;
    fetch(`/api/${kind}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar a fila.");
        const data = await response.json();
        setItems(crm ? data.items : data.queue);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, crm, demoMode]);
  async function act(item: QueueItem, status: string) {
    setBusy(item.id);
    setError("");
    try {
      const response = await fetch(
        crm
          ? `/api/crm-outbox/${item.id}/approve`
          : `/api/daily-queue/${item.id}`,
        {
          method: crm ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: crm ? undefined : JSON.stringify({ status }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Falha ao atualizar item");
      }
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, status } : row)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar item");
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <>
      <PageHeading
        title={crm ? "Fila de CRM" : "Sua fila diária"}
        description={
          crm
            ? "Revise a qualificação antes de aprovar o encaminhamento."
            : "Contas com evidências atuais para priorizar sua abordagem."
        }
      />
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div
          role="status"
          aria-label="Carregando fila"
          className="grid gap-4 md:grid-cols-2"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => {
            const company = companies.find((c) => c.id === item.companyId);
            return (
              <article
                key={item.id}
                className="min-w-0 rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">
                    {item.rank ? `${item.rank}. ` : ""}
                    {company?.name ??
                      item.companyName ??
                      item.payload?.name ??
                      "Empresa"}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                    {item.status}
                  </span>
                </div>
                {item.whyNow && <p className="mb-4 text-sm">{item.whyNow}</p>}
                <QualificationPanel
                  report={company?.qualification ?? item.payload?.qualification}
                  compact
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/companies/${item.companyId}`}>
                      Abrir empresa
                    </Link>
                  </Button>
                  {crm && item.status === "PENDING_APPROVAL" && (
                    <Button
                      disabled={busy === item.id}
                      onClick={() => act(item, "APPROVED")}
                    >
                      {busy === item.id
                        ? "Aprovando…"
                        : "Aprovar encaminhamento"}
                    </Button>
                  )}
                  {!crm && item.status === "READY" && (
                    <Button
                      disabled={busy === item.id}
                      onClick={() => act(item, "CLAIMED")}
                    >
                      Assumir conta
                    </Button>
                  )}
                  {!crm && item.status === "CLAIMED" && (
                    <Button
                      disabled={busy === item.id}
                      onClick={() => act(item, "CONTACTED")}
                    >
                      Marcar contato
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <h2 className="text-lg font-semibold">Nenhuma conta na fila</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {demoMode
              ? "Demonstração: nenhum encaminhamento real é executado."
              : "As contas aparecerão aqui quando tiverem qualificação e evidências suficientes."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/research">Pesquisar empresas</Link>
          </Button>
        </div>
      )}
    </>
  );
}
