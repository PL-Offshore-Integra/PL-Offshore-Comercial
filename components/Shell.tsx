"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; icon: keyof typeof ICONS };
type NavGroup = { titulo: string; items: NavItem[] };

const Ico = ({ d, size = 18 }: { d: React.ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </>
  ),
  back: (
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
};

const NAV: NavGroup[] = [
  {
    titulo: "Pipeline",
    items: [{ href: "/oportunidades", label: "Oportunidades", icon: "chart" }],
  },
  {
    titulo: "Eventos",
    items: [{ href: "/calendario", label: "Calendario de Ferias", icon: "calendar" }],
  },
  {
    titulo: "Resumen",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
];

const SECCIONES: Record<string, { grupo: string; titulo: string; sub: string }> = {
  "/oportunidades": {
    grupo: "Pipeline",
    titulo: "Oportunidades",
    sub: "Pipeline comercial de Terra Mare, Clean Sea, Parana Logistica y HF Offshore.",
  },
  "/calendario": {
    grupo: "Eventos",
    titulo: "Calendario de Ferias",
    sub: "Proximas ferias y conferencias del sector, y que empresa participa en cada una.",
  },
  "/dashboard": {
    grupo: "Resumen",
    titulo: "Dashboard",
    sub: "Ganancia total, por empresa propia y por proyecto.",
  },
};

function seccionFor(pathname: string) {
  if (SECCIONES[pathname]) return SECCIONES[pathname];
  if (pathname === "/oportunidades/nueva") {
    return { grupo: "Pipeline", titulo: "Nueva oportunidad", sub: "Se agrega al pipeline con estadio inicial Investigando." };
  }
  if (pathname.startsWith("/oportunidades/")) {
    return { grupo: "Pipeline", titulo: "Editar oportunidad", sub: "" };
  }
  const base = "/" + pathname.split("/")[1];
  return SECCIONES[base] ?? { grupo: "Comercial", titulo: "Comercial", sub: "" };
}

export default function Shell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const seccion = seccionFor(pathname);
  const inicial = (userEmail || "C").replace(/@.*$/, "").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="appbar">
        <img src="/integra-isotipo-white.svg" alt="INTEGRA" className="appbar-iso" />
        <span className="appbar-div" />
        <span className="appbar-instance">PL Offshore</span>
        <div className="appbar-tools">
          <span className="appbar-avatar">{inicial}</span>
          <span className="appbar-user">{userEmail}</span>
          <button className="appbar-link" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <div className="shell">
        <nav className="sidebar">
          <div className="sidebar-header">
            <img src="/PL.png" alt="PL Offshore" className="sidebar-logo-img" />
            <div>
              <div className="sidebar-logo-main">Comercial</div>
              <div className="sidebar-logo-sub">PL Offshore</div>
            </div>
          </div>

          <div className="sidebar-nav">
            {NAV.map((grupo) => (
              <div key={grupo.titulo} style={{ marginBottom: 8 }}>
                <div className="nav-section">{grupo.titulo}</div>
                {grupo.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className={`ni ${active ? "active" : ""}`}>
                      <span className="ni-ico">
                        <Ico d={ICONS[item.icon]} />
                      </span>
                      <span className="ni-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="sidebar-foot">
            <div className="sidebar-foot-meta">
              <div>COMERCIAL v1.0</div>
              <div>POWERED BY INTEGRA</div>
            </div>
          </div>
        </nav>

        <div className="main">
          <div className="pagehead">
            <div className="crumb">
              <span>Comercial</span>
              <span>/</span>
              <span className="crumb-current">{seccion.titulo}</span>
            </div>
            <div className="pagehead-row">
              <div>
                <h1>{seccion.titulo}</h1>
                {seccion.sub && <p>{seccion.sub}</p>}
              </div>
              {pathname === "/oportunidades" && (
                <div className="pagehead-actions">
                  <Link href="/oportunidades/nueva" className="btn btn-primary">
                    Nueva oportunidad
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="content">{children}</div>
        </div>
      </div>
    </>
  );
}
