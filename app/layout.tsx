import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PNCP Buscador",
  description: "Busca de licitações no Portal Nacional de Contratações Públicas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
