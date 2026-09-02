"use client";

import { useMemo, useState } from "react";
import { EditarContacto, NuevaEmpresa, NuevoContacto } from "@/components/ContactoDialogo";
import type { Cliente, ClienteEmpresa } from "@/lib/types";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fecha(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

type Situacion = "todas" | "abiertas" | "ganadas" | "perdidas" | "sin-datos";

// Etiquetas cortas a proposito: con las largas ("Con oportunidades
// abiertas") el select se estira y la barra de filtros se parte en dos
// lineas en una pantalla de 1080.
const SITUACIONES: { id: Situacion; label: string }[] = [
  { id: "todas", label: "Todas las situaciones" },
  { id: "abiertas", label: "Con abiertas" },
  { id: "ganadas", label: "Con ganadas" },
  { id: "perdidas", label: "Con perdidas" },
  { id: "sin-datos", label: "Sin datos" },
];

// Una fila por contacto, plana, con los filtros arriba.
//
// El filtrado es del lado del cliente y no por la URL: la vista trae todas las
// filas en una consulta y son pocas —una por contacto—, asi que filtrar en el
// navegador es instantaneo y no vuelve al servidor por cada tecla. Si algun dia
// esto crece a miles de contactos, el corte pasa a la consulta.
export default function ClientesTabla({
  filas,
  empresas,
}: {
  filas: Cliente[];
  // Para el desplegable del alta de contacto. Viene del maestro y no de las
  // filas: una empresa recien creada todavia no tiene ninguna.
  empresas: ClienteEmpresa[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [compania, setCompania] = useState("");
  const [situacion, setSituacion] = useState<Situacion>("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const companias = useMemo(
    () => [...new Set(filas.map((f) => f.compania))].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return filas
      .filter((f) => {
        if (compania && f.compania !== compania) return false;

        if (texto) {
          const donde = [f.compania, f.contacto, f.contacto_email, f.contacto_telefono]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!donde.includes(texto)) return false;
        }

        if (situacion === "abiertas" && Number(f.abiertas) === 0) return false;
        if (situacion === "ganadas" && Number(f.ganadas) === 0) return false;
        if (situacion === "perdidas" && Number(f.perdidas) === 0) return false;
        if (
          situacion === "sin-datos" &&
          (f.contacto || f.contacto_email || f.contacto_telefono)
        ) {
          return false;
        }

        // El rango es sobre el ultimo contacto. Una fila sin fecha queda afuera
        // en cuanto se pone cualquiera de los dos extremos: no se puede afirmar
        // que este dentro de un rango si no se sabe cuando fue.
        const f10 = f.ultimo_contacto?.slice(0, 10);
        if (desde && (!f10 || f10 < desde)) return false;
        if (hasta && (!f10 || f10 > hasta)) return false;

        return true;
      })
      .sort(
        (a, b) =>
          a.compania.localeCompare(b.compania, "es") ||
          (a.contacto ?? "").localeCompare(b.contacto ?? "", "es")
      );
  }, [filas, busqueda, compania, situacion, desde, hasta]);

  const hayFiltros = Boolean(busqueda || compania || desde || hasta || situacion !== "todas");

  // Las tres cifras de arriba miran lo que esta en pantalla, no la base
  // completa: con un filtro puesto, un total que no coincide con la tabla que
  // esta debajo confunde mas de lo que informa. Sin filtros son lo mismo.
  const resumen = useMemo(() => {
    const conDatos = visibles.filter(
      (f) => f.contacto || f.contacto_email || f.contacto_telefono
    ).length;
    return {
      companias: new Set(visibles.map((f) => f.compania)).size,
      conDatos,
      sinDatos: visibles.length - conDatos,
    };
  }, [visibles]);

  const limpiar = () => {
    setBusqueda("");
    setCompania("");
    setSituacion("todas");
    setDesde("");
    setHasta("");
  };

  return (
    <>
      <div className="stats mb16">
        <div className="stat">
          <div className="stat-label">Companias</div>
          <div className="stat-value">{resumen.companias}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Contactos con datos</div>
          <div className="stat-value">{resumen.conDatos}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Sin contacto cargado</div>
          <div className="stat-value">{resumen.sinDatos}</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-row" style={{ marginBottom: 8 }}>
          <NuevaEmpresa />
          <NuevoContacto empresas={empresas} />
        </div>

        <div className="filter-row">
        {/* La busqueda absorbe el espacio que sobra: los demas controles tienen
            ancho fijo para que la barra entre en una sola linea. */}
        <input
          className="filter-input filter-buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar compania, contacto, mail o telefono"
        />

        <select
          className="filter-select"
          value={compania}
          onChange={(e) => setCompania(e.target.value)}
        >
          <option value="">Todas las companias</option>
          {companias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={situacion}
          onChange={(e) => setSituacion(e.target.value as Situacion)}
        >
          {SITUACIONES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        {/* El rango viaja junto: si la barra tiene que cortar en dos lineas,
            corta entre grupos y no en medio de un desde-hasta. */}
        <div className="filter-fechas">
          <span className="filter-label">Ult. contacto</span>
          <input
            type="date"
            className="filter-input filter-fecha"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
          <span className="filter-guion">—</span>
          <input
            type="date"
            className="filter-input filter-fecha"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={limpiar}
          disabled={!hayFiltros}
        >
          Limpiar
        </button>

      </div>

      {/* El contador va afuera de la barra: adentro empujaba a los controles a
          una segunda linea en 1080 de ancho. */}
      <div className="filter-cuenta text-mono">
        {visibles.length === filas.length
          ? `${filas.length} contactos`
          : `${visibles.length} de ${filas.length} contactos`}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Compania</th>
              <th>Contacto</th>
              <th>Mail</th>
              <th>Telefono</th>
              <th>LinkedIn</th>
              <th>Abiertas</th>
              <th>Ganadas</th>
              <th>Perdidas</th>
              <th>Cotizado</th>
              <th>Ultimo contacto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.map((c, i) => (
              <tr key={`${c.compania}-${c.contacto ?? ""}-${c.contacto_email ?? ""}-${i}`}>
                <td className="cel-compania">{c.compania}</td>
                <td>{c.contacto ?? <span className="text-muted">sin nombre</span>}</td>
                <td>
                  {c.contacto_email ? (
                    <a href={`mailto:${c.contacto_email}`}>{c.contacto_email}</a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {c.contacto_telefono ? (
                    <a href={`tel:${c.contacto_telefono}`}>{c.contacto_telefono}</a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {c.contacto_linkedin ? (
                    <a
                      href={
                        c.contacto_linkedin.startsWith("http")
                          ? c.contacto_linkedin
                          : `https://${c.contacto_linkedin}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      perfil
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="text-mono">{c.abiertas}</td>
                <td className="text-mono">{c.ganadas}</td>
                <td className="text-mono">{c.perdidas}</td>
                <td className="text-mono">{currency.format(Number(c.valor_total ?? 0))}</td>
                <td className="text-mono">{fecha(c.ultimo_contacto)}</td>
                <td style={{ textAlign: "right" }}>
                  <EditarContacto fila={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {visibles.length === 0 && (
          <div className="empty-state">
            Ningun contacto coincide con los filtros.
            <div className="mt16">
              <button type="button" className="btn btn-ghost btn-sm" onClick={limpiar}>
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
