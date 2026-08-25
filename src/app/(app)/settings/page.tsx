import { CheckCircle2, CircleAlert } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { integrationStatus } from "@/lib/env";
import { registerTelegramWebhookAction } from "@/app/(app)/settings/actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ telegram?: string }>;
}) {
  const status = integrationStatus();
  const telegramResult = (await searchParams).telegram;
  return (
    <>
      <PageHeading
        title="Configurações"
        description="Metas, limites de custo e estado das integrações de servidor."
      />
      {telegramResult === "connected" ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            Webhook registrado. O bot enviou uma confirmação no Telegram.
          </span>
        </div>
      ) : telegramResult === "error" ? (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Não foi possível registrar o webhook. Confira as variáveis do
            Telegram na Vercel e tente novamente.
          </span>
        </div>
      ) : null}
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
            <form action={registerTelegramWebhookAction} className="pt-2">
              <Button type="submit" disabled={!status.telegram}>
                Conectar webhook do Telegram
              </Button>
              <p className="mt-2 text-xs text-slate-500">
                Registra o endereço no Telegram usando as chaves diretamente no
                servidor, sem expô-las no navegador.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
