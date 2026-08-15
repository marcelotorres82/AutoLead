"use client";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { CompanyTable } from "@/components/company-table";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
export default function ResearchPage() {
  const { generate } = useDemoStore();
  return (
    <>
      <PageHeading
        title="Pesquisa diária"
        description="Revise as candidatas encontradas hoje. A meta conta decisões humanas, não apenas registros criados."
        action={
          <Button
            onClick={() => {
              generate();
              toast.success("Lista demo completada com candidatas fictícias");
            }}
          >
            <Play className="size-4" />
            Completar lista
          </Button>
        }
      />
      <CompanyTable />
    </>
  );
}
