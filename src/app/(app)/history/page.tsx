import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default function HistoryPage() {
  return (
    <>
      <PageHeading
        title="Histórico"
        description="Execuções, decisões e auditoria em uma linha do tempo única."
      />
      <Card>
        <CardHeader>
          <CardTitle>Agosto de 2026</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border p-4">
            <div className="flex justify-between">
              <strong className="text-sm">13 de agosto</strong>
              <Badge>Demonstração</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Seed demo carregado · 4 empresas · 1 persona · custo R$ 0,00
            </p>
          </div>
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
            Alterações de status e pesquisas futuras serão registradas aqui.
          </div>
        </CardContent>
      </Card>
    </>
  );
}
