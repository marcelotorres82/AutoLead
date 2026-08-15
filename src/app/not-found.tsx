import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="font-mono text-cyan-600">404</p>
        <h1 className="mt-2 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          O conteúdo solicitado não existe ou foi removido.
        </p>
        <Button asChild className="mt-5">
          <Link href="/dashboard">Voltar ao painel</Link>
        </Button>
      </div>
    </main>
  );
}
