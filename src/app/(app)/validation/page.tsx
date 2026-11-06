import { PageHeading } from "@/components/page-heading";
import { QualificationPanel } from "@/components/qualification-panel";
import report from "@/data/legal-validation-result.json";
import type { QualificationReport } from "@/lib/high-precision";
export default function ValidationPage() {
  return (
    <>
      <PageHeading
        title="Validação jurídica"
        description="Porte acima de 1.000 integrantes, tecnologia, crescimento recente e projetos explícitos para 2027."
      />
      <section className="mb-6 rounded-2xl border border-cyan-300 bg-cyan-50 p-5 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-100">
        <p className="text-2xl font-bold">
          {report.qualified} qualificadas / {report.assessed} avaliadas
        </p>
        <p className="mt-2 text-sm">{report.method}</p>
        <p className="mt-2 text-sm">
          Execução: {report.executedAt.slice(0, 10)} · Coleta:{" "}
          {report.collectedAt}. Exa/Gemini: execução local bloqueada por
          configuração indisponível.
        </p>
        <p className="mt-2 text-sm font-semibold">
          Zero resultados não significa ausência de empresas elegíveis no
          mercado. Nenhuma conta da amostra comprovou todos os requisitos.
        </p>
      </section>
      <div className="grid gap-6">
        {report.results.map((result) => (
          <article key={result.domain} className="min-w-0">
            <h2 className="mb-2 text-xl font-bold">{result.name}</h2>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {result.notes}
            </p>
            <QualificationPanel
              report={result.qualification as QualificationReport}
            />
            <details className="mt-3 rounded-xl border p-4">
              <summary className="min-h-11 cursor-pointer font-semibold">
                Fontes consultadas e motivos de rejeição
              </summary>
              <ul className="space-y-3">
                {result.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center break-words text-sm font-semibold text-cyan-800 underline dark:text-cyan-300"
                    >
                      {source.title} ↗
                    </a>
                    <p className="text-sm">
                      Publicação:{" "}
                      {"publishedAt" in source
                        ? source.publishedAt
                        : "não confirmada"}
                    </p>
                  </li>
                ))}
              </ul>
              <ul className="mt-4 list-inside list-disc text-sm">
                {result.qualification.rejectedEvidence.map((item, i) => (
                  <li key={i}>{item.reason}</li>
                ))}
              </ul>
            </details>
          </article>
        ))}
      </div>
    </>
  );
}
