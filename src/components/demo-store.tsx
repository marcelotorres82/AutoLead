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
  updateStatus(id: string, status: CompanyStatus): void;
  generate(): void;
  addPersona(persona: Omit<Persona, "id">): void;
  setLushaUsed(value: number): void;
};
const Context = createContext<Store | null>(null);
const key = "prospect-radar-demo-v1";
export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(demoCompanies);
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
  const [ready, setReady] = useState(false);
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    if (ready)
      localStorage.setItem(
        key,
        JSON.stringify({ companies, personas, lushaUsed }),
      );
  }, [companies, personas, lushaUsed, ready]);
  const value = useMemo<Store>(
    () => ({
      companies,
      personas,
      lushaUsed,
      updateStatus(id, status) {
        setCompanies((items) =>
          items.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status,
                  reviewedAt: new Date().toISOString().slice(0, 10),
                }
              : c,
          ),
        );
      },
      generate() {
        const now = Date.now();
        const generated = Array.from(
          {
            length: Math.max(
              0,
              30 -
                companies.filter(
                  (c) =>
                    c.discoveredAt === new Date().toISOString().slice(0, 10),
                ).length,
            ),
          },
          (_, i): Company => ({
            ...demoCompanies[i % demoCompanies.length],
            id: `generated-${now}-${i}`,
            name: `Candidata Fictícia ${String(i + 1).padStart(2, "0")} (Demonstração)`,
            domain: `candidata-${now}-${i}.example`,
            discoveredAt: new Date().toISOString().slice(0, 10),
            status: "Nova",
          }),
        );
        setCompanies((items) => [...generated, ...items]);
      },
      addPersona(persona) {
        setPersonas((items) => [
          { ...persona, id: crypto.randomUUID() },
          ...items,
        ]);
      },
      setLushaUsed,
    }),
    [companies, personas, lushaUsed],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDemoStore() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoStore ausente");
  return value;
}
