"use client";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { CompanyTable } from "@/components/company-table";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
export default function ResearchPage() {
  const { generate, demoMode } = useDemoStore();
  const [isResearching, setIsResearching] = useState(false);
  const [query, setQuery] = useState(
    "Pesquise empresas de e-commerce com até 1.000 funcionários",
  );
  return (
    <>
      <PageHeading
        title="Pesquisa diária"
        description="Revise as candidatas encontradas hoje. A meta conta decisões humanas, não apenas registros criados."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/api/export/csv">
                <Download className="size-4" />
                Exportar CSV
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/export/json">Exportar JSON</a>
            </Button>
          </div>
        }
      />
      <form
        className="mb-5 rounded-xl border bg-white p-5 dark:bg-slate-900"
        onSubmit={async (event) => {
          event.preventDefault();
          const criteria = query.trim();
          if (criteria.length < 5) return;
          setIsResearching(true);
          try {
            const result = await generate(criteria);
            toast.success(
              demoMode
                ? "Pesquisa demo concluída com empresas fictícias"
                : `${result.created} empresas reais adicionadas`,
            );
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Falha ao executar pesquisa",
            );
          } finally {
            setIsResearching(false);
          }
        }}
      >
        <label htmlFor="ai-company-search" className="text-sm font-semibold">
          Pesquisar novas empresas com IA
        </label>
        <p id="ai-company-search-help" className="mt-1 text-sm text-slate-500">
          Descreva setor, região, porte ou outros critérios em linguagem
          natural.
        </p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
          <textarea
            id="ai-company-search"
            aria-describedby="ai-company-search-help"
            className="min-h-24 flex-1 resize-y rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            maxLength={300}
            minLength={5}
            required
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: Pesquise empresas de e-commerce com até 1.000 funcionários"
          />
          <Button
            type="submit"
            disabled={isResearching || query.trim().length < 5}
          >
            <Search className="size-4" />
            {isResearching ? "Pesquisando…" : "Pesquisar com IA"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Perfis do LinkedIn só são exibidos quando a URL pública da empresa é
          encontrada nas fontes. Nenhum login ou dado privado é acessado.
        </p>
      </form>
      <CompanyTable />
    </>
  );
}
