"use client";
import { useEffect, useState } from "react";
import { Download, DatabaseBackup } from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function BackupsPage() {
  const { companies, personas, demoMode } = useDemoStore();
  const [items, setItems] = useState<
    Array<{
      id: string;
      blobPath: string;
      recordCount: number;
      size: number;
      createdAt: string;
    }>
  >([]);

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    fetch("/api/backups", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setItems(result.backups ?? []);
      })
      .catch(() => {
        if (active) toast.error("Falha ao carregar backups");
      });
    return () => {
      active = false;
    };
  }, [demoMode]);
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
  async function create() {
    if (demoMode) return download();
    try {
      const response = await fetch("/api/backups", { method: "POST" });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Falha ao criar backup");
      setItems((current) => [result.backup, ...current]);
      toast.success("Backup privado criado no Vercel Blob");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao criar backup",
      );
    }
  }
  return (
    <>
      <PageHeading
        title="Backups"
        description="Backups relacionais em JSON; arquivos reais são privados no Vercel Blob."
        action={
          <Button onClick={create}>
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
          {demoMode ? (
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
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {item.blobPath.split("/").at(-1)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.recordCount} registros ·{" "}
                      {(item.size / 1024).toFixed(1)} KB ·{" "}
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <a href="/api/export/json">
                      <Download className="size-4" /> Exportar dados atuais
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
              Nenhum backup real criado ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
