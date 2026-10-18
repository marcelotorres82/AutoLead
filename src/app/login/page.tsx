"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Radar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const oauthErrorMessages: Record<string, string> = {
  google_unauthorized:
    "Acesso negado: esta conta Google não está autorizada. Apenas marcelotorres1982@gmail.com possui permissão de acesso.",
  google_not_configured:
    "O login com Google ainda não está configurado nas variáveis de ambiente (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).",
  google_access_denied: "A autenticação com o Google foi cancelada.",
  google_invalid_state:
    "Sessão de autenticação expirada ou inválida. Tente novamente.",
  google_unverified:
    "O endereço de e-mail da conta Google precisa ser verificado.",
  google_oauth_failed:
    "Não foi possível concluir a autenticação com o Google. Tente novamente.",
  rate_limit: "Muitas tentativas de autenticação. Aguarde 15 minutos.",
};

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
      />
    </svg>
  );
}

function OAuthErrorBanner() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  if (!errorKey) return null;
  const message =
    oauthErrorMessages[errorKey] ?? "Falha ao autenticar. Tente novamente.";
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
      <span>{message}</span>
    </div>
  );
}

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
          <Suspense fallback={null}>
            <OAuthErrorBanner />
          </Suspense>
          <Button
            asChild
            variant="outline"
            className="w-full gap-2.5 font-medium"
          >
            <a href="/api/auth/google">
              <GoogleIcon />
              Entrar com Google
            </a>
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span>ou com credenciais</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
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
              <strong>Modo demonstração:</strong> use as credenciais preenchidas
              ou o login Google configurado para{" "}
              <code>marcelotorres1982@gmail.com</code>.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
