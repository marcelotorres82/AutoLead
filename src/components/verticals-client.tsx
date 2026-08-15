"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VerticalView } from "@/lib/operations-types";

export function VerticalsClient({
  initialVerticals,
  demoMode,
}: {
  initialVerticals: VerticalView[];
  demoMode: boolean;
}) {
  const [verticals, setVerticals] = useState(initialVerticals);

  async function toggle(id: string) {
    const current = verticals.find((item) => item.id === id);
    if (!current) return;
    const active = !current.active;
    setVerticals((items) =>
      items.map((item) => (item.id === id ? { ...item, active } : item)),
    );
    if (demoMode) return;
    try {
      const response = await fetch(`/api/verticals/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar vertical");
    } catch {
      setVerticals((items) =>
        items.map((item) =>
          item.id === id ? { ...item, active: current.active } : item,
        ),
      );
      toast.error("Falha ao atualizar vertical");
    }
  }

  return (
    <>
      <PageHeading
        title="Verticais"
        description="Organize critérios de pesquisa e ative apenas os segmentos prioritários."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {verticals.map((vertical) => (
          <Card key={vertical.id}>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="font-semibold">{vertical.name}</p>
                <p className="text-xs text-slate-500">
                  {vertical.description ?? "Vertical configurável"}
                </p>
              </div>
              <Button
                size="sm"
                variant={vertical.active ? "default" : "outline"}
                onClick={() => toggle(vertical.id)}
              >
                {vertical.active ? "Ativa" : "Inativa"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
