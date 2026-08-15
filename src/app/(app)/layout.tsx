import { AppShell } from "@/components/app-shell";
import { DemoStoreProvider } from "@/components/demo-store";
import { listCompanies } from "@/lib/company-repository";
import { demoCompanies } from "@/lib/demo-data";
import { demoMode } from "@/lib/env";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialCompanies = demoMode ? demoCompanies : await listCompanies();
  return (
    <DemoStoreProvider initialCompanies={initialCompanies} demoMode={demoMode}>
      <AppShell demoMode={demoMode}>{children}</AppShell>
    </DemoStoreProvider>
  );
}
