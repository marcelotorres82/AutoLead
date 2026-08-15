import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoStoreProvider } from "@/components/demo-store";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
export const metadata: Metadata = {
  title: { default: "Prospect Radar", template: "%s | Prospect Radar" },
  description:
    "Pesquisa, triagem e priorização de empresas para prospecção comercial.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${mono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <DemoStoreProvider>{children}</DemoStoreProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
