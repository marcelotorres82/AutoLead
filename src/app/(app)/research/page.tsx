"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { CompanyTable } from "@/components/company-table";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
export default function ResearchPage() {
  const { generate, demoMode } = useDemoStore();
  const [isResearching, setIsResearching] = useState(false);
  return (
    <>
      <PageHeading
        title="Pesquisa diária"
        description="Revise as candidatas encontradas hoje. A meta conta decisões humanas, não apenas registros criados."
        action={
          <Button
            disabled={isResearching}
            onClick={async () => {
              setIsResearching(true);
              try {
                const result = await generate();
                toast.success(
                  demoMode
                    ? "Lista demo completada com candidatas fictícias"
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
            <Play className="size-4" />
            {isResearching ? "Pesquisando…" : "Completar lista"}
          </Button>
        }
      />
      <CompanyTable />
    </>
  );
}
