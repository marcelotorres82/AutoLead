"use client";
import { Download, DatabaseBackup } from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function BackupsPage() {
  const { companies, personas } = useDemoStore();
  function download() {
    const data = {
      schemaVersion: "1.0",
      exportedAt: new Date().toISOString(),
      filters: { mode: "demo" },
      companies,
      evidence: companies.flatMap((c) => c.sources),
      personas,
      history: [],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospect-radar-demo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup JSON demo criado");
  }
  return (
    <>
      <PageHeading
        title="Backups"
        description="Backups relacionais em JSON; arquivos reais são privados no Vercel Blob."
        action={
          <Button onClick={download}>
            <DatabaseBackup className="size-4" />
            Criar backup manual
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Backups disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">Snapshot de demonstração atual</p>
              <p className="text-xs text-slate-500">
                {companies.length + personas.length} registros · gerado sob
                demanda · acesso local
              </p>
            </div>
            <Button variant="outline" onClick={download}>
              <Download className="size-4" />
              Baixar JSON
            </Button>
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            Restauração real exige <code>DATABASE_URL</code> e{" "}
            <code>BLOB_READ_WRITE_TOKEN</code>. A operação oferece simulação
            antes da confirmação e impede duplicidades.
          </div>
        </CardContent>
      </Card>
    </>
  );
}
