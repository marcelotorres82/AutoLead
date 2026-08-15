"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoCompanies } from "@/lib/demo-data";
import type { Company, CompanyStatus } from "@/lib/domain";

export type Persona = {
  id: string;
  name: string;
  title: string;
  companyId: string;
  profileUrl?: string;
  seniority: string;
  area: string;
  solution: string;
  priority: number;
  role: string;
  lushaCreditUsed: boolean;
  sentToSalesloft: boolean;
  notes?: string;
};

type Store = {
  companies: Company[];
  personas: Persona[];
  lushaUsed: number;
  demoMode: boolean;
  updateStatus(id: string, status: CompanyStatus): Promise<void>;
  generate(): Promise<{ created: number; provider: string }>;
  addPersona(persona: Omit<Persona, "id">): void;
  setLushaUsed(value: number): void;
};

const Context = createContext<Store | null>(null);
const key = "prospect-radar-demo-v1";

export function DemoStoreProvider({
  children,
  initialCompanies = demoCompanies,
  demoMode = true,
}: {
  children: React.ReactNode;
  initialCompanies?: Company[];
  demoMode?: boolean;
}) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [personas, setPersonas] = useState<Persona[]>([
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
  ]);
  const [lushaUsed, setLushaUsed] = useState(84);
  const [ready, setReady] = useState(() => !demoMode);

  useEffect(() => {
    if (!demoMode) return;
    const saved = localStorage.getItem(key);
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCompanies(parsed.companies);
          setPersonas(parsed.personas);
          setLushaUsed(parsed.lushaUsed);
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

  const value = useMemo<Store>(
    () => ({
      companies,
      personas,
      lushaUsed,
      demoMode,
      async updateStatus(id, status) {
        const previous = companies.find((company) => company.id === id);
        setCompanies((items) =>
          items.map((company) =>
            company.id === id
              ? {
                  ...company,
                  status,
                  reviewedAt: new Date().toISOString().slice(0, 10),
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
      async generate() {
        if (demoMode) {
          const now = Date.now();
          const generated = Array.from(
            {
              length: Math.max(
                0,
                30 -
                  companies.filter(
                    (company) =>
                      company.discoveredAt ===
                      new Date().toISOString().slice(0, 10),
                  ).length,
              ),
            },
            (_, index): Company => ({
              ...demoCompanies[index % demoCompanies.length],
              id: `generated-${now}-${index}`,
              name: `Candidata Fictícia ${String(index + 1).padStart(2, "0")} (Demonstração)`,
              domain: `candidata-${now}-${index}.example`,
              discoveredAt: new Date().toISOString().slice(0, 10),
              status: "Nova",
            }),
          );
          setCompanies((items) => [...generated, ...items]);
          return { created: generated.length, provider: "demo" };
        }
        const response = await fetch("/api/research/manual", {
          method: "POST",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Falha ao executar pesquisa");
        if (Array.isArray(result.companies)) setCompanies(result.companies);
        return { created: result.created ?? 0, provider: result.provider };
      },
      addPersona(persona) {
        setPersonas((items) => [
          { ...persona, id: crypto.randomUUID() },
          ...items,
        ]);
      },
      setLushaUsed,
    }),
    [companies, personas, lushaUsed, demoMode],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDemoStore() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoStore ausente");
  return value;
}
