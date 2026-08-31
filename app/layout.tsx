import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comercial | PL Offshore",
  description: "Pipeline de oportunidades y calendario de ferias",
};

const NAV = [
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/calendario", label: "Calendario de Ferias" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen">
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
              <span className="text-lg font-semibold">Comercial</span>
              <nav className="flex gap-4 text-sm text-gray-600">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="hover:text-gray-900">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
