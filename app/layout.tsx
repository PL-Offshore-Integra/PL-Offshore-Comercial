import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comercial | PL Offshore",
  description: "Oportunidades comerciales y calendario de ferias de PL Offshore",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-instance="pl-offshore">
      <body>{children}</body>
    </html>
  );
}
