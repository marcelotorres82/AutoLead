"use client";
import { useState } from "react";
import { Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { lushaMetrics } from "@/lib/domain";
export default function PersonasPage() {
  const { personas, companies, addPersona, lushaUsed, setLushaUsed } =
    useDemoStore();
  const [open, setOpen] = useState(false);
  const lusha = lushaMetrics(lushaUsed, 300);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    addPersona({
      name: String(data.get("name")),
      title: String(data.get("title")),
      companyId: String(data.get("companyId")),
      profileUrl: String(data.get("profileUrl") || ""),
      seniority: "Gerência",
      area: "Segurança",
      solution: "API Security",
      priority: 2,
      role: "Influenciador",
      lushaCreditUsed: false,
      sentToSalesloft: false,
    });
    setOpen(false);
    toast.success("Persona cadastrada manualmente");
  }
  return (
    <>
      <PageHeading
        title="Personas"
        description="Contatos encontrados manualmente, sem consultas automáticas ao LinkedIn ou Lusha."
        action={
          <Button onClick={() => setOpen(!open)}>
            <Plus className="size-4" />
            Cadastrar persona
          </Button>
        }
      />
      {open ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Nova persona manual</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
              <Input name="name" placeholder="Nome" required />
              <Input name="title" placeholder="Cargo" required />
              <select
                name="companyId"
                required
                className="h-10 rounded-lg border bg-transparent px-3 text-sm"
              >
                <option value="">Selecione a empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input
                name="profileUrl"
                type="url"
                placeholder="URL do perfil (opcional)"
              />
              <Button className="md:col-span-2">Salvar persona</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personas cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {personas.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <span className="grid size-10 place-items-center rounded-full bg-cyan-50 text-cyan-600">
                  <UserRound className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.title} ·{" "}
                    {companies.find((c) => c.id === p.companyId)?.name}
                  </p>
                </div>
                <Badge>{p.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Controle Lusha · mês atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{lusha.remaining}</p>
            <p className="text-sm text-slate-500">créditos restantes</p>
            <label className="mt-5 block text-sm">
              Créditos utilizados
              <Input
                className="mt-1"
                type="number"
                min="0"
                max="300"
                value={lushaUsed}
                onChange={(e) => setLushaUsed(Number(e.target.value))}
              />
            </label>
            {lusha.alert ? (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                Alerta: consumo atingiu {lusha.alert}% do limite mensal.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
