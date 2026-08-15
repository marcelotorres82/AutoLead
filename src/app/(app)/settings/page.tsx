import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { integrationStatus } from "@/lib/env";
export default function SettingsPage() {
  const status = integrationStatus();
  return (
    <>
      <PageHeading
        title="Configurações"
        description="Metas, limites de custo e estado das integrações de servidor."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metas e limites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-3">
              <span>Meta diária</span>
              <strong>30 revisadas</strong>
            </div>
            <div className="flex justify-between border-b pb-3">
              <span>Meta semanal</span>
              <strong>150 avaliadas</strong>
            </div>
            <div className="flex justify-between">
              <span>Período de exclusão</span>
              <strong>90 dias</strong>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(status).map(([name, ok]) => (
              <div
                key={name}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize">{name}</span>
                <Badge
                  className={
                    ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }
                >
                  {ok ? "Configurada" : "Pendente"}
                </Badge>
              </div>
            ))}
            <p className="pt-3 text-xs text-slate-500">
              Chaves nunca são enviadas ao cliente. Consulte o README para
              configurar o ambiente.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
