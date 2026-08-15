import { connection } from "next/server";
import { AppShell } from "@/components/app-shell";
import { DemoStoreProvider } from "@/components/demo-store";
import { listCompanies } from "@/lib/company-repository";
import { demoCompanies } from "@/lib/demo-data";
import { demoMode } from "@/lib/env";
import { getLushaUsage, listPersonas } from "@/lib/operations-repository";
import type { Persona } from "@/lib/operations-types";
import { listResearchRuns } from "@/lib/research-run-repository";
import type { ResearchRunView } from "@/lib/research-run-repository";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  let initialCompanies = demoCompanies;
  let initialResearchRuns: ResearchRunView[] = [];
  let initialPersonas: Persona[] | undefined;
  let initialLushaUsed: number | undefined;
  if (!demoMode) {
    const [companies, runs, personas, lusha] = await Promise.all([
      listCompanies(),
      listResearchRuns(30),
      listPersonas(),
      getLushaUsage(),
    ]);
    initialCompanies = companies;
    initialResearchRuns = runs;
    initialPersonas = personas;
    initialLushaUsed = lusha.used;
  }
  return (
    <DemoStoreProvider
      initialCompanies={initialCompanies}
      initialResearchRuns={initialResearchRuns}
      initialPersonas={initialPersonas}
      initialLushaUsed={initialLushaUsed}
      demoMode={demoMode}
    >
      <AppShell demoMode={demoMode}>{children}</AppShell>
    </DemoStoreProvider>
  );
}
