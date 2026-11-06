import {
  criteriaKeys,
  isCurrentQualification,
  type QualificationReport,
} from "@/lib/high-precision";
import { safeExternalHref } from "@/lib/utils";
const labels = {
  headcount: "Porte comprovado",
  technology: "Maturidade tech",
  growth: "Crescimento recente",
  roadmap: "Projetos 2027",
};
export function QualificationPanel({
  report,
  compact = false,
}: {
  report?: QualificationReport;
  compact?: boolean;
}) {
  if (!report)
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        Qualificação pendente. Esta conta ainda não possui auditoria de alta
        precisão.
      </p>
    );
  const current = isCurrentQualification(report);
  return (
    <section
      aria-label="Qualificação por evidências"
      className="min-w-0 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Evidências verificáveis
          </p>
          <p className="mt-1 text-sm">
            {current
              ? "Todos os critérios comprovados"
              : "Pesquisa adicional necessária"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${current ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"}`}
        >
          {report.score}/100 ·{" "}
          {current ? "Comprovado" : "Incompleto ou vencido"}
        </span>
      </div>
      <div className={`grid min-w-0 gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {criteriaKeys.map((key) => (
          <details key={key} className="min-w-0 rounded-xl border p-3">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
              <span>{labels[key]}</span>
              <span className="tabular-nums">
                {report.breakdown[key].score}/{report.breakdown[key].max}
              </span>
            </summary>
            {report.breakdown[key].evidence.length ? (
              report.breakdown[key].evidence.map((e, i) => (
                <div
                  key={`${e.sourceUrl}:${i}`}
                  className="mt-3 border-t pt-3 text-sm"
                >
                  <blockquote className="break-words border-l-2 border-cyan-600 pl-3">
                    “{e.quote}”
                  </blockquote>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    Publicação: {e.publishedAt.slice(0, 10)} · Coleta:{" "}
                    {e.collectedAt.slice(0, 10)}
                  </p>
                  {safeExternalHref(e.sourceUrl) && (
                    <a
                      className="inline-flex min-h-11 max-w-full items-center break-all font-medium text-cyan-800 underline dark:text-cyan-300"
                      href={safeExternalHref(e.sourceUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {e.sourceTitle || "Abrir fonte original"} ↗
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="py-2 text-sm text-slate-600 dark:text-slate-300">
                Não comprovado nas fontes coletadas.
              </p>
            )}
          </details>
        ))}
      </div>
      {!compact && (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          Regra {report.version} · Porte &gt;{" "}
          {report.policy.minEmployeesExclusive} · Crescimento em até{" "}
          {report.policy.recentDays} dias · Avaliação:{" "}
          {report.evaluatedAt.slice(0, 10)}
        </p>
      )}
    </section>
  );
}
