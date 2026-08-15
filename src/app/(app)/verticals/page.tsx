"use client";
import { useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { verticalNames } from "@/lib/demo-data";
export default function VerticalsPage() {
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(verticalNames.map((v) => [v, true])),
  );
  return (
    <>
      <PageHeading
        title="Verticais"
        description="Organize critérios de pesquisa e ative apenas os segmentos prioritários."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {verticalNames.map((v) => (
          <Card key={v}>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="font-semibold">{v}</p>
                <p className="text-xs text-slate-500">
                  Vertical inicial configurável
                </p>
              </div>
              <Button
                size="sm"
                variant={active[v] ? "default" : "outline"}
                onClick={() => setActive((x) => ({ ...x, [v]: !x[v] }))}
              >
                {active[v] ? "Ativa" : "Inativa"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
