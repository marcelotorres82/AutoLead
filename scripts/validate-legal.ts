import "./load-next-env";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  qualifyCompany,
  legalValidationPolicy,
  type Criterion,
} from "../src/lib/high-precision";
const live = process.argv.includes("--live");
await mkdir("reports", { recursive: true });
if (live) {
  const missing = ["DATABASE_URL", "EXA_API_KEY", "GEMINI_API_KEY"].filter(
    (key) => !process.env[key],
  );
  if (missing.length) {
    await writeFile(
      "reports/legal-live-status.json",
      JSON.stringify(
        {
          status: "BLOCKED",
          missing,
          executedAt: new Date().toISOString(),
          reason:
            "Configuração existente não disponível para execução local; nenhum resultado simulado.",
        },
        null,
        2,
      ) + "\n",
    );
    console.error(`Validação live bloqueada: ${missing.join(", ")}`);
    process.exitCode = 1;
  } else {
    const { runDailyResearch } = await import("../src/lib/research");
    const result = await runDailyResearch(
      new Date().toISOString().slice(0, 10),
      false,
      `legal-validation-${Date.now()}`,
      "Escritórios de advocacia e serviços jurídicos no Brasil com mais de 1.000 funcionários, maturidade tecnológica, crescimento recente e projetos explícitos para 2027",
      undefined,
      true,
    );
    await writeFile(
      "reports/legal-live-result.json",
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(
      `Validação live concluída: ${result.created} empresas persistidas`,
    );
  }
} else {
  const raw = await readFile("src/data/legal-validation-sources.json", "utf8");
  const data = JSON.parse(raw) as {
    collectedAt: string;
    method: string;
    candidates: Array<{
      name: string;
      domain: string;
      notes: string;
      sources: Array<{
        url: string;
        title: string;
        content: string;
        publishedAt?: string;
        criterion: Criterion;
        headcount?: number;
      }>;
    }>;
  };
  const results = data.candidates.map((candidate) => ({
    name: candidate.name,
    domain: candidate.domain,
    notes: candidate.notes,
    sources: candidate.sources,
    qualification: qualifyCompany({
      name: candidate.name,
      domain: candidate.domain,
      sources: candidate.sources,
      claims: candidate.sources.map((s) => ({
        sourceUrl: s.url,
        quote: s.content,
        criterion: s.criterion,
        headcount: s.headcount,
      })),
      policy: legalValidationPolicy,
    }),
  }));
  const report = {
    executedAt: new Date().toISOString(),
    collectedAt: data.collectedAt,
    mode: "PUBLIC_SOURCE_REPLAY",
    method: data.method,
    sourceSha256: createHash("sha256").update(raw).digest("hex"),
    policy: legalValidationPolicy,
    assessed: results.length,
    qualified: results.filter((r) => r.qualification.qualified).length,
    results,
  };
  await writeFile(
    "src/data/legal-validation-result.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await writeFile(
    "reports/legal-validation.md",
    `# Validação jurídica > 1000 integrantes\n\nExecução: ${report.executedAt}\n\n${report.method}\n\nAvaliadas: ${report.assessed}. Qualificadas: ${report.qualified}. Resultado vazio significa ausência de comprovação simultânea na amostra, não ausência de empresas no mercado.\n\n` +
      results
        .map(
          (r) =>
            `## ${r.name}\n\n${r.notes}\n\nScore auditável: ${r.qualification.score}/100. ${r.qualification.reasons.join("; ")}.\n\n` +
            r.sources
              .map(
                (s) =>
                  `- [${s.title}](${s.url}) — publicação: ${s.publishedAt ?? "não confirmada"}; coleta: ${data.collectedAt}.\n`,
              )
              .join(""),
        )
        .join("\n"),
  );
  console.log(
    JSON.stringify({
      assessed: report.assessed,
      qualified: report.qualified,
      mode: report.mode,
    }),
  );
}
