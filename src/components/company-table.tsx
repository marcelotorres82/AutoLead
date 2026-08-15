"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ExternalLink, Linkedin, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/components/demo-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CompanyStatus } from "@/lib/domain";
export function CompanyTable() {
  const { companies, updateStatus } = useDemoStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [min, setMin] = useState(0);
  const filtered = useMemo(
    () =>
      companies.filter(
        (c) =>
          (c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.domain.includes(query.toLowerCase())) &&
          (status === "Todos" || c.status === status) &&
          c.score >= min,
      ),
    [companies, query, status, min],
  );
  const change = async (id: string, value: CompanyStatus) => {
    try {
      await updateStatus(id, value);
      toast.success(`Status alterado para ${value}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao atualizar status",
      );
    }
  };
  return (
    <>
      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 dark:bg-slate-900 md:grid-cols-3">
        <Input
          placeholder="Filtrar por nome ou domínio"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filtrar status"
          className="h-10 rounded-lg border bg-transparent px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Todos</option>
          <option>Nova</option>
          <option>Pendente de validação</option>
          <option>Aprovada para pesquisar leads</option>
          <option>Pausada</option>
          <option>Descartada</option>
        </select>
        <label className="flex items-center gap-3 text-sm">
          Score mínimo{" "}
          <input
            className="flex-1 accent-cyan-600"
            type="range"
            min="0"
            max="100"
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
          />
          <strong>{min}</strong>
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="p-4">Empresa</th>
              <th className="p-4">Vertical</th>
              <th className="p-4">LinkedIn</th>
              <th className="p-4">Solução</th>
              <th className="p-4">Score</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações rápidas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="p-4">
                  <Link
                    href={`/companies/${c.id}`}
                    className="font-semibold hover:text-cyan-600"
                  >
                    {c.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {c.domain} · {c.city}/{c.state}
                  </p>
                </td>
                <td className="p-4">{c.vertical}</td>
                <td className="p-4">
                  {c.linkedinUrl ? (
                    <a
                      className="inline-flex items-center gap-1 font-medium text-cyan-700 hover:underline dark:text-cyan-300"
                      href={c.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="size-4" />
                      Perfil
                    </a>
                  ) : (
                    <span className="text-slate-400">Não encontrado</span>
                  )}
                </td>
                <td className="p-4">
                  <Badge>{c.solution}</Badge>
                </td>
                <td className="p-4">
                  <strong>{c.score}</strong>
                  <span className="text-slate-400">/100</span>
                </td>
                <td className="p-4">
                  <Badge>{c.status}</Badge>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <Button
                      title="Aprovar"
                      aria-label={`Aprovar ${c.name}`}
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        change(c.id, "Aprovada para pesquisar leads")
                      }
                    >
                      <Check className="size-4 text-emerald-600" />
                    </Button>
                    <Button
                      title="Pausar"
                      aria-label={`Pausar ${c.name}`}
                      size="icon"
                      variant="ghost"
                      onClick={() => change(c.id, "Pausada")}
                    >
                      <Pause className="size-4 text-amber-600" />
                    </Button>
                    <Button
                      title="Descartar"
                      aria-label={`Descartar ${c.name}`}
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        confirm("Confirmar descarte desta empresa?") &&
                        change(c.id, "Descartada")
                      }
                    >
                      <Trash2 className="size-4 text-red-600" />
                    </Button>
                    <Button asChild size="icon" variant="ghost">
                      <Link
                        href={`/companies/${c.id}`}
                        aria-label={`Abrir ${c.name}`}
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma empresa corresponde aos filtros. Reduza os critérios para
            ver resultados.
          </div>
        ) : null}
      </div>
    </>
  );
}
