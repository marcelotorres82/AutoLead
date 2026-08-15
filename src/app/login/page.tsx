"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
export default function LoginPage() {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV !== "production";
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(
    isDevelopment ? "demo@prospectradar.local" : "",
  );
  const [password, setPassword] = useState(isDevelopment ? "demo1234" : "");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) return toast.error(body.error);
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#071b33] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
            <Radar className="size-7" />
          </span>
          <CardTitle className="text-2xl">Prospect Radar</CardTitle>
          <p className="mt-2 text-sm text-slate-500">
            Acesse sua central de inteligência comercial
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium">
              E-mail
              <Input
                className="mt-1.5"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Senha
              <Input
                className="mt-1.5"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          {isDevelopment ? (
            <div className="mt-5 rounded-lg bg-cyan-50 p-3 text-xs text-cyan-900">
              <strong>Modo demonstração:</strong> use as credenciais
              preenchidas. Em produção, configure o e-mail e o hash bcrypt nas
              variáveis de ambiente.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
