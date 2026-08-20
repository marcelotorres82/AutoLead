"use client";

import { AlertCircle, CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { useDemoStore } from "@/components/demo-store";
import { Badge } from "@/components/ui/badge";

const stageLabels: Record<string, string> = {
  queued: "Na fila",
  searching: "Buscando fontes",
  searching_leads: "Buscando pessoas",
  analyzing: "Analisando com IA",
  analyzing_leads: "Analisando pessoas",
  persisting: "Salvando empresas",
  persisting_leads: "Salvando candidatos",
  completed: "Concluída",
  failed: "Falhou",
};

export function ResearchRunList({ limit = 10 }: { limit?: number }) {
  const { researchRuns } = useDemoStore();
  const visible = researchRuns.slice(0, limit);
  if (!visible.length)
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
        Nenhuma execução registrada ainda.
      </div>
    );
  return (
    <div className="space-y-3">
      {visible.map((run) => {
        const active = ["queued", "running"].includes(run.status);
        const failed = run.status === "failed";
        const Icon = failed
          ? AlertCircle
          : active
            ? LoaderCircle
            : CheckCircle2;
        return (
          <div key={run.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {run.researchType === "leads"
                    ? `Leads · ${run.companyName ?? "empresa"}`
                    : (run.criteria ??
                      (run.kind === "daily"
                        ? "Pesquisa diária"
                        : "Pesquisa manual"))}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Clock3 className="size-3" />
                  {new Date(run.createdAt).toLocaleString("pt-BR")}
                  {run.provider ? ` · ${run.provider}` : ""}
                </p>
              </div>
              <Badge>
                <Icon
                  className={`mr-1 size-3 ${active ? "animate-spin" : ""}`}
                />
                {stageLabels[run.stage] ?? run.status}
              </Badge>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded ${failed ? "bg-red-500" : "bg-cyan-500"}`}
                style={{
                  width: `${Math.min(100, Math.max(4, run.progress))}%`,
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                {run.foundCount}{" "}
                {run.researchType === "leads" ? "candidatos" : "novas"}
              </span>
              <span>{run.duplicateCount} repetidos</span>
              {run.durationMs ? (
                <span>{(run.durationMs / 1000).toFixed(1)}s</span>
              ) : null}
            </div>
            {failed && run.errors[0] ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                {run.errors[0]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
