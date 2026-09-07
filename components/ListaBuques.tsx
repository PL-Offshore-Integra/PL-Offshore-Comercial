"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  estadoBuque,
  etiquetaTipoBuque,
  medida,
  precioBuque,
  RELACIONES_BUQUE,
  TIPOS_BUQUE,
  type Buque,
} from "@/lib/types";

// La lista de tonelaje.
//
// El uso real es una pregunta concreta: "necesito un remolcador de mas de 70
// toneladas de tiro en el Caribe, que hay". Por eso los filtros son los que
// son —tipo, tiro, bandera— y por eso el tiro es un numero y no un
// desplegable con rangos: el pedido del cliente viene con un numero.
//
// Se filtra del lado del cliente porque son veinte filas y ninguna cambia
// mientras se mira, igual que en el track record.
export default function ListaBuques({ buques }: { buques: Buque[] }) {
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [relacion, setRelacion] = useState("todas");
  const [bandera, setBandera] = useState("todas");
  const [tiroDesde, setTiroDesde] = useState("");
  const [conRetirados, setConRetirados] = useState(false);

  const banderas = useMemo(
    () =>
      [...new Set(buques.map((b) => b.bandera).filter((x): x is string => Boolean(x)))].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [buques]
  );

  const tiroMinimo = Number(tiroDesde.replace(",", "."));
  const hayTiro = tiroDesde.trim() !== "" && Number.isFinite(tiroMinimo);

  const visibles = buques.filter((b) => {
    if (!conRetirados && !b.activo) return false;
    if (tipo !== "todos" && b.tipo !== tipo) return false;
    if (relacion !== "todas" && b.relacion !== relacion) return false;
    if (bandera !== "todas" && b.bandera !== bandera) return false;
    // Un buque sin tiro cargado no puede afirmar que cumple el minimo, asi
    // que al filtrar por tiro queda afuera.
    if (hayTiro && (b.bollard_pull_t === null || Number(b.bollard_pull_t) < tiroMinimo))
      return false;
    if (texto.trim() !== "") {
      const q = texto.trim().toLowerCase();
      const donde = [
        b.nombre,
        b.propietario,
        b.operador,
        b.broker,
        b.astillero,
        b.diseno,
        b.bandera,
        b.puerto_registro,
        b.imo,
        b.motores,
        b.notas,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!donde.includes(q)) return false;
    }
    return true;
  });

  const hayFiltro =
    texto.trim() !== "" ||
    tipo !== "todos" ||
    relacion !== "todas" ||
    bandera !== "todas" ||
    hayTiro ||
    conRetirados;

  const limpiar = () => {
    setTexto("");
    setTipo("todos");
    setRelacion("todas");
    setBandera("todas");
    setTiroDesde("");
    setConRetirados(false);
  };

  // Agrupados por lo que tiene que ver PL con el buque, en el orden en que
  // estan declaradas las relaciones: primero la flota propia.
  const grupos = RELACIONES_BUQUE.map((r) => ({
    ...r,
    items: [...visibles]
      .filter((b) => b.relacion === r.id)
      .sort((a, b) => {
        const ta = a.bollard_pull_t === null ? -1 : Number(a.bollard_pull_t);
        const tb = b.bollard_pull_t === null ? -1 : Number(b.bollard_pull_t);
        if (ta !== tb) return tb - ta;
        return a.nombre.localeCompare(b.nombre, "es");
      }),
  })).filter((g) => g.items.length > 0);

  const conTiro = visibles.filter((b) => b.bollard_pull_t !== null);
  const tiroMayor = conTiro.reduce((a, b) => Math.max(a, Number(b.bollard_pull_t)), 0);
  const enVenta = visibles.filter((b) => b.estado_comercial === "en_venta");

  return (
    <div>
      <div className="filtros">
        <div className="fg-inline">
          <label>Buscar</label>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nombre, armador, astillero, IMO"
          />
        </div>
        <div className="fg-inline">
          <label>Tipo</label>
          <select
            className="filter-select"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="todos">Todos</option>
            {TIPOS_BUQUE.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Que tiene que ver PL</label>
          <select
            className="filter-select"
            value={relacion}
            onChange={(e) => setRelacion(e.target.value)}
          >
            <option value="todas">Todos</option>
            {RELACIONES_BUQUE.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Bandera</label>
          <select
            className="filter-select"
            value={bandera}
            onChange={(e) => setBandera(e.target.value)}
          >
            <option value="todas">Todas</option>
            {banderas.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Tiro desde (t)</label>
          <input
            value={tiroDesde}
            onChange={(e) => setTiroDesde(e.target.value)}
            placeholder="70"
            inputMode="decimal"
            style={{ width: 90 }}
          />
        </div>
        <div className="fg-inline">
          <label>Retirados</label>
          <label className="fila-check">
            <input
              type="checkbox"
              checked={conRetirados}
              onChange={(e) => setConRetirados(e.target.checked)}
            />
            <span>Mostrarlos</span>
          </label>
        </div>

        {hayFiltro && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpiar}>
            Limpiar
          </button>
        )}
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Buques</div>
          <div className="stat-value">{visibles.length}</div>
          <span className="hint">
            {hayFiltro ? `de ${buques.length} en el maestro` : "en el maestro"}
          </span>
        </div>
        <div className="stat">
          <div className="stat-label">Tiro maximo</div>
          <div className="stat-value">{tiroMayor > 0 ? medida(tiroMayor) : "—"}</div>
          <span className="hint">
            {conTiro.length} de {visibles.length} tienen el tiro cargado
          </span>
        </div>
        <div className="stat">
          <div className="stat-label">En venta</div>
          <div className="stat-value">{enVenta.length}</div>
          <span className="hint">Con precio pedido en la ficha</span>
        </div>
      </div>

      {visibles.length === 0 && (
        <div className="empty-state">
          Ningun buque cumple con eso.{" "}
          {hayFiltro && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={limpiar}>
              Limpiar los filtros
            </button>
          )}
        </div>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="card">
          <div className="card-title">
            <span>
              {grupo.label} ({grupo.items.length})
            </span>
            <span className="text-muted">{grupo.sub}</span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Buque</th>
                  <th>Tipo</th>
                  <th>Ano</th>
                  <th style={{ textAlign: "right" }}>Tiro (t)</th>
                  <th style={{ textAlign: "right" }}>Potencia (kW)</th>
                  <th>Casco</th>
                  <th>Bandera</th>
                  <th style={{ textAlign: "right" }}>Precio</th>
                  <th>Seca</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((b) => {
                  const est = estadoBuque(b.estado_comercial);
                  const precio = precioBuque(b);
                  return (
                    <tr key={b.id}>
                      <td>
                        {b.nombre}
                        {(b.propietario || !b.activo) && (
                          <div className="text-muted cel-sub">
                            {!b.activo ? "retirado" : b.propietario}
                          </div>
                        )}
                      </td>
                      <td className="text-muted">
                        {etiquetaTipoBuque(b.tipo)}
                        {est && (
                          <div className="cel-sub">
                            <span className={`badge ${est.badge}`}>{est.label}</span>
                          </div>
                        )}
                      </td>
                      <td className="text-mono">{b.anio ?? "—"}</td>
                      <td className="text-mono" style={{ textAlign: "right" }}>
                        {medida(b.bollard_pull_t)}
                      </td>
                      <td className="text-mono" style={{ textAlign: "right" }}>
                        {medida(b.potencia_kw)}
                      </td>
                      <td className="text-mono">
                        {b.loa_m === null && b.manga_m === null
                          ? "—"
                          : `${medida(b.loa_m)} × ${medida(b.manga_m)} m`}
                      </td>
                      <td className="text-muted">{b.bandera ?? "—"}</td>
                      <td className="text-mono" style={{ textAlign: "right" }}>
                        {precio ?? <span className="text-muted">—</span>}
                      </td>
                      <td className="text-muted">{b.proxima_seca ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/buques/${b.id}`} className="btn btn-ghost btn-sm">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
