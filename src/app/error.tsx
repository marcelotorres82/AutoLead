"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="text-2xl font-bold">
          Não foi possível carregar esta tela
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tente novamente. Nenhuma credencial ou dado sensível foi registrado.
        </p>
        <Button className="mt-5" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
