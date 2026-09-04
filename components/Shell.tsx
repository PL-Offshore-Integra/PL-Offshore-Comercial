"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string };

// Una sola lista, sin titulos de grupo: con nueve pantallas los encabezados
// —Comercial, Maestros, Eventos, Resumen— ocupaban mas lugar que lo que
// ordenaban. El Dashboard primero, que es por donde se empieza a mirar.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/oportunidades", label: "Oportunidades" },
  { href: "/proyectos", label: "Proyectos" },
  { href: "/facturacion", label: "Facturacion" },
  { href: "/mapa", label: "Mapa de trabajos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/plantillas", label: "Plantillas de proyecto" },
  { href: "/zonas", label: "Zonas y puertos" },
  { href: "/calendario", label: "Calendario de Ferias" },
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
  "/facturacion": {
    grupo: "Comercial",
    titulo: "Facturacion",
    sub: "Que se facturo, que se cobro, que esta vencido y que falta facturar.",
  },
  "/clientes": {
    grupo: "Maestros",
    titulo: "Clientes",
    sub: "El maestro de clientes: empresas, contactos y su historia comercial.",
  },
  "/plantillas": {
    grupo: "Maestros",
    titulo: "Plantillas de proyecto",
    sub: "El punto de partida de los trabajos que se repiten: cliente, buque y tarifas.",
  },
  "/mapa": {
    grupo: "Comercial",
    titulo: "Mapa de trabajos",
    sub: "Donde se harian los posibles, donde se esta trabajando y donde se trabajo.",
  },
  "/zonas": {
    grupo: "Maestros",
    titulo: "Zonas y puertos",
    sub: "Cada lugar donde se trabaja, una vez, con sus coordenadas.",
  },
  "/calendario": {
    grupo: "Eventos",
    titulo: "Calendario de Ferias",
    sub: "Proximas ferias y conferencias del sector, y que empresa participa en cada una.",
  },
  "/dashboard": {
    grupo: "Resumen",
    titulo: "Dashboard",
    sub: "Oportunidades, proyectos y facturacion: en que anda cada cosa y cuanto.",
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
  if (pathname === "/plantillas/nueva") {
    return {
      grupo: "Maestros",
      titulo: "Nueva plantilla",
      sub: "Lo que se repite en cada proyecto de este tipo.",
    };
  }
  if (pathname.startsWith("/plantillas/")) {
    return { grupo: "Maestros", titulo: "Plantilla", sub: "" };
  }
  if (pathname === "/facturacion/nueva") {
    return {
      grupo: "Comercial",
      titulo: "Nueva factura",
      sub: "Cuelga de un proyecto, y puede facturar una salida puntual o un periodo.",
    };
  }
  if (pathname.startsWith("/facturacion/")) {
    return { grupo: "Comercial", titulo: "Factura", sub: "" };
  }
  if (pathname === "/zonas/nueva") {
    return {
      grupo: "Maestros",
      titulo: "Nueva zona",
      sub: "Un lugar del maestro: como se llama y donde queda.",
    };
  }
  if (pathname.startsWith("/zonas/")) {
    return { grupo: "Maestros", titulo: "Zona", sub: "" };
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
          {/* El logo lleva al Dashboard, que es la pantalla de inicio. Es lo
              que uno espera de un logo arriba a la izquierda. */}
          <Link href="/dashboard" className="sidebar-header">
            <img src="/PL.png" alt="PL Offshore" className="sidebar-logo-img" />
            <div>
              <div className="sidebar-logo-main">Comercial</div>
              <div className="sidebar-logo-sub">PL Offshore</div>
            </div>
          </Link>

          {/* Numeros en Saira 900 en lugar de iconos. El design system no
              define iconografia y la ausencia es deliberada: la marca
              sustituye iconos por numeracion, tipografia y color. La
              alternativa que contempla —Lucide con stroke 1.5— la tiene que
              aprobar Marketing Corporativo, asi que no se usa.

              La numeracion corre sobre todo el menu: es un indice de
              secciones. */}
          <div className="sidebar-nav">
            {NAV.map((item, i) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ni ${active ? "active" : ""}`}
                >
                  <span className="ni-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="ni-label">{item.label}</span>
                </Link>
              );
            })}
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
              {pathname === "/plantillas" && (
                <div className="pagehead-actions">
                  <Link href="/plantillas/nueva" className="btn btn-amarillo">
                    Nueva plantilla
                  </Link>
                </div>
              )}
              {pathname === "/facturacion" && (
                <div className="pagehead-actions">
                  <Link href="/facturacion/nueva" className="btn btn-amarillo">
                    Nueva factura
                  </Link>
                </div>
              )}
              {pathname === "/zonas" && (
                <div className="pagehead-actions">
                  <Link href="/zonas/nueva" className="btn btn-amarillo">
                    Nueva zona
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
