"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string };
type NavGroup = { titulo: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    titulo: "Comercial",
    items: [
      { href: "/oportunidades", label: "Oportunidades" },
      { href: "/proyectos", label: "Proyectos" },
    ],
  },
  {
    titulo: "Maestros",
    items: [{ href: "/clientes", label: "Base de datos clientes"  }],
  },
  {
    titulo: "Eventos",
    items: [{ href: "/calendario", label: "Calendario de Ferias"  }],
  },
  {
    titulo: "Resumen",
    items: [{ href: "/dashboard", label: "Dashboard"  }],
  },
];

const SECCIONES: Record<string, { grupo: string; titulo: string; sub: string }> = {
  "/oportunidades": {
    grupo: "Comercial",
    titulo: "Oportunidades",
    sub: "Oportunidades comerciales de PL Offshore.",
  },
  "/proyectos": {
    grupo: "Comercial",
    titulo: "Proyectos",
    sub: "Los trabajos ganados, con sus salidas: lo firmado, lo ejecutado y el contrato.",
  },
  "/clientes": {
    grupo: "Maestros",
    titulo: "Base de datos clientes",
    sub: "El maestro de clientes: empresas, contactos y su historia comercial.",
  },
  "/calendario": {
    grupo: "Eventos",
    titulo: "Calendario de Ferias",
    sub: "Proximas ferias y conferencias del sector, y que empresa participa en cada una.",
  },
  "/dashboard": {
    grupo: "Resumen",
    titulo: "Dashboard",
    sub: "Valor cotizado por empresa propia y por cliente.",
  },
};

function seccionFor(pathname: string) {
  if (SECCIONES[pathname]) return SECCIONES[pathname];
  if (pathname === "/proyectos/nuevo") {
    // El titulo no distingue los dos caminos —convertir una oportunidad o
    // cargar de cero— porque eso lo define el query string y este encabezado
    // se dibuja del lado del cliente. Lo aclara la propia pantalla.
    return {
      grupo: "Comercial",
      titulo: "Nuevo proyecto",
      sub: "Desde una oportunidad ganada, o desde cero si el trabajo no paso por una cotizacion.",
    };
  }
  // Las salidas viven dentro del proyecto:
  // /proyectos/<id>/operaciones/nueva y /proyectos/<id>/operaciones/<opId>.
  if (pathname.endsWith("/operaciones/nueva")) {
    return {
      grupo: "Comercial",
      titulo: "Nueva salida",
      sub: "El trabajo concreto, con sus fechas, su buque y su tarifa.",
    };
  }
  if (pathname.includes("/operaciones/")) {
    return { grupo: "Comercial", titulo: "Salida", sub: "" };
  }
  if (pathname.startsWith("/proyectos/")) {
    return { grupo: "Comercial", titulo: "Proyecto", sub: "" };
  }
  if (pathname === "/oportunidades/nueva") {
    return {
      grupo: "Comercial",
      titulo: "Nueva oportunidad",
      sub: "Nace en curso; se marca adjudicada o cancelada desde el listado.",
    };
  }
  if (pathname.startsWith("/oportunidades/")) {
    return { grupo: "Comercial", titulo: "Editar oportunidad", sub: "" };
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

          {/* Numeros en Saira 900 en lugar de iconos. El design system no
              define iconografia y la ausencia es deliberada: la marca
              sustituye iconos por numeracion, tipografia y color. La
              alternativa que contempla —Lucide con stroke 1.5— la tiene que
              aprobar Marketing Corporativo, asi que no se usa.

              La numeracion corre sobre todo el menu y no por grupo: es un
              indice de secciones, y reiniciar en 01 en cada grupo daria
              cuatro "01" distintos. */}
          <div className="sidebar-nav">
            {NAV.map((grupo, iGrupo) => (
              <div key={grupo.titulo} style={{ marginBottom: 8 }}>
                <div className="nav-section">{grupo.titulo}</div>
                {grupo.items.map((item, iItem) => {
                  const active = pathname.startsWith(item.href);
                  const nro =
                    NAV.slice(0, iGrupo).reduce((a, g) => a + g.items.length, 0) + iItem + 1;
                  return (
                    <Link key={item.href} href={item.href} className={`ni ${active ? "active" : ""}`}>
                      <span className="ni-num">{String(nro).padStart(2, "0")}</span>
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
                  {/* Amarillo sobre navy, como el CTA principal del sitio. */}
                  <Link href="/oportunidades/nueva" className="btn btn-amarillo">
                    Nueva oportunidad
                  </Link>
                </div>
              )}
              {pathname === "/proyectos" && (
                <div className="pagehead-actions">
                  <Link href="/proyectos/nuevo" className="btn btn-amarillo">
                    Nuevo proyecto
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
