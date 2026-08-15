"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoCompanies } from "@/lib/demo-data";
import { dateInSaoPaulo, type Company, type CompanyStatus } from "@/lib/domain";
import type { Persona } from "@/lib/operations-types";
import type { ResearchRunView } from "@/lib/research-run-repository";

export type { Persona } from "@/lib/operations-types";

type Store = {
  companies: Company[];
  personas: Persona[];
  lushaUsed: number;
  demoMode: boolean;
  researchRuns: ResearchRunView[];
  updateStatus(id: string, status: CompanyStatus): Promise<void>;
  generate(query?: string): Promise<{ created: number; provider: string }>;
  addPersona(persona: Omit<Persona, "id">): Promise<void>;
  setLushaUsed(value: number): Promise<void>;
};

const Context = createContext<Store | null>(null);
const key = "prospect-radar-demo-v1";
const demoPersonas: Persona[] = [
  {
    id: "p-demo",
    name: "Marina Exemplo",
    title: "Head de Segurança (Demonstração)",
    companyId: "demo-horizonte",
    seniority: "Diretoria",
    area: "Segurança",
    solution: "WAAP",
    priority: 1,
    role: "Decisor",
    lushaCreditUsed: true,
    sentToSalesloft: false,
  },
];

export function DemoStoreProvider({
  children,
  initialCompanies = demoCompanies,
  initialResearchRuns = [],
  initialPersonas = demoPersonas,
  initialLushaUsed = 84,
  demoMode = true,
}: {
  children: React.ReactNode;
  initialCompanies?: Company[];
  initialResearchRuns?: ResearchRunView[];
  initialPersonas?: Persona[];
  initialLushaUsed?: number;
  demoMode?: boolean;
}) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [researchRuns, setResearchRuns] =
    useState<ResearchRunView[]>(initialResearchRuns);
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
  const [lushaUsed, setLushaUsedState] = useState(initialLushaUsed);
  const [ready, setReady] = useState(() => !demoMode);

  useEffect(() => {
    if (!demoMode) return;
    const saved = localStorage.getItem(key);
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.companies)) setCompanies(parsed.companies);
          if (Array.isArray(parsed.personas)) setPersonas(parsed.personas);
          if (typeof parsed.lushaUsed === "number")
            setLushaUsedState(parsed.lushaUsed);
        } catch {}
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [demoMode]);

  useEffect(() => {
    if (ready && demoMode)
      localStorage.setItem(
        key,
        JSON.stringify({ companies, personas, lushaUsed }),
      );
  }, [companies, personas, lushaUsed, ready, demoMode]);

  useEffect(() => {
    if (demoMode) return;
    const activeIds = researchRuns
      .filter((run) => ["queued", "running"].includes(run.status))
      .map((run) => run.id);
    if (!activeIds.length) return;
    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const results = await Promise.all(
          activeIds.map(async (id) => {
            const response = await fetch(`/api/research/runs/${id}`, {
              cache: "no-store",
            });
            if (!response.ok) return null;
            const result = await response.json();
            return result.run as ResearchRunView;
          }),
        );
        const updates = results.filter(
          (run): run is ResearchRunView => run !== null,
        );
        if (!updates.length) return;
        setResearchRuns((items) => {
          const changed = updates.some((run) => {
            const current = items.find((item) => item.id === run.id);
            return (
              !current ||
              current.status !== run.status ||
              current.stage !== run.stage ||
              current.progress !== run.progress ||
              current.foundCount !== run.foundCount ||
              current.duplicateCount !== run.duplicateCount
            );
          });
          return changed
            ? items.map(
                (item) => updates.find((run) => run.id === item.id) ?? item,
              )
            : items;
        });
        if (updates.some((run) => run.status === "completed")) {
          const response = await fetch("/api/companies", {
            cache: "no-store",
          });
          if (response.ok) {
            const result = await response.json();
            if (Array.isArray(result.companies)) setCompanies(result.companies);
          }
        }
      } finally {
        polling = false;
      }
    };
    void poll();
    const interval = window.setInterval(poll, 3_000);
    return () => window.clearInterval(interval);
  }, [demoMode, researchRuns]);

  const value = useMemo<Store>(
    () => ({
      companies,
      personas,
      lushaUsed,
      demoMode,
      researchRuns,
      async updateStatus(id, status) {
        const previous = companies.find((company) => company.id === id);
        setCompanies((items) =>
          items.map((company) =>
            company.id === id
              ? {
                  ...company,
                  status,
                  reviewedAt: dateInSaoPaulo(),
                }
              : company,
          ),
        );
        if (demoMode) return;
        const response = await fetch(`/api/companies/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) {
          if (previous)
            setCompanies((items) =>
              items.map((company) => (company.id === id ? previous : company)),
            );
          throw new Error("Não foi possível persistir o status");
        }
      },
      async generate(
        query = "Pesquise empresas brasileiras com forte operação digital",
      ) {
        if (demoMode) {
          const now = Date.now();
          const generated = Array.from(
            {
              length: Math.max(
                0,
                30 -
                  companies.filter(
                    (company) => company.discoveredAt === dateInSaoPaulo(),
                  ).length,
              ),
            },
            (_, index): Company => ({
              ...demoCompanies[index % demoCompanies.length],
              id: `generated-${now}-${index}`,
              name: `Candidata Fictícia ${String(index + 1).padStart(2, "0")} (Demonstração)`,
              domain: `candidata-${now}-${index}.example`,
              discoveredAt: dateInSaoPaulo(),
              status: "Nova",
            }),
          );
          setCompanies((items) => [...generated, ...items]);
          return { created: generated.length, provider: "demo" };
        }
        const response = await fetch("/api/research/manual", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Falha ao executar pesquisa");
        if (!result.run)
          throw new Error("A pesquisa não retornou uma execução");
        let run = result.run as ResearchRunView;
        setResearchRuns((items) => [
          run,
          ...items.filter((item) => item.id !== run.id),
        ]);
        const deadline = Date.now() + 4 * 60_000;
        while (["queued", "running"].includes(run.status)) {
          if (Date.now() >= deadline)
            throw new Error(
              "A pesquisa continua em segundo plano. Consulte o histórico em alguns instantes.",
            );
          await new Promise((resolve) => window.setTimeout(resolve, 2_000));
          const statusResponse = await fetch(`/api/research/runs/${run.id}`, {
            cache: "no-store",
          });
          const statusResult = await statusResponse.json();
          if (!statusResponse.ok)
            throw new Error(
              statusResult.error ?? "Falha ao consultar pesquisa",
            );
          run = statusResult.run;
          setResearchRuns((items) => [
            run,
            ...items.filter((item) => item.id !== run.id),
          ]);
        }
        if (run.status === "failed")
          throw new Error(run.errors[0] ?? "A pesquisa falhou");
        const companiesResponse = await fetch("/api/companies", {
          cache: "no-store",
        });
        const companiesResult = await companiesResponse.json();
        if (companiesResponse.ok && Array.isArray(companiesResult.companies))
          setCompanies(companiesResult.companies);
        return {
          created: run.foundCount,
          provider: run.provider ?? "workflow",
        };
      },
      async addPersona(persona) {
        if (!demoMode) {
          const response = await fetch("/api/personas", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(persona),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error ?? "Falha ao salvar persona");
          setPersonas((items) => [result.persona, ...items]);
          return;
        }
        setPersonas((items) => [
          { ...persona, id: crypto.randomUUID() },
          ...items,
        ]);
      },
      async setLushaUsed(value) {
        const previous = lushaUsed;
        setLushaUsedState(value);
        if (demoMode) return;
        const response = await fetch("/api/lusha", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ used: value }),
        });
        if (!response.ok) {
          setLushaUsedState(previous);
          throw new Error("Falha ao salvar consumo da Lusha");
        }
      },
    }),
    [companies, personas, lushaUsed, demoMode, researchRuns],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemoStore() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoStore ausente");
  return value;
}
