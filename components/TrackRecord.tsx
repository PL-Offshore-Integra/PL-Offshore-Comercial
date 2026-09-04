"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SECCIONES_TR, type FilaMostrable, type SeccionTR } from "@/lib/trackRecord";

// El track record en pantalla: filtros arriba, una tabla por seccion.
//
// Se filtra del lado del cliente porque son cien filas y ninguna cambia
// mientras se mira. El boton de imprimir usa el dialogo del navegador con una
// hoja de estilos de impresion: es la forma de "sacarlo" en PDF sin sumar una
// libreria ni mandar los datos a ningun lado.

const plata = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valor);

export default function TrackRecord({ filas }: { filas: FilaMostrable[] }) {
  const [seccion, setSeccion] = useState<"todas" | SeccionTR>("todas");
  const [buque, setBuque] = useState("todos");
  const [cliente, setCliente] = useState("todos");
  const [anio, setAnio] = useState("todos");

  const buques = useMemo(
    () =>
      [...new Set(filas.map((f) => f.buque).filter((b): b is string => Boolean(b)))].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [filas]
  );

  const clientes = useMemo(
    () =>
      [
        ...new Set(filas.map((f) => f.cliente).filter((c): c is string => Boolean(c))),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );

  const anios = useMemo(() => {
    const todos = new Set<number>();
    for (const f of filas) {
      const a = f.anio_desde ?? f.anio_hasta;
      const b = f.anio_hasta ?? f.anio_desde;
      if (a === null || b === null) continue;
      for (let x = Math.min(a, b); x <= Math.max(a, b); x++) todos.add(x);
    }
    return [...todos].sort((a, b) => b - a);
  }, [filas]);

  const visibles = filas.filter((f) => {
    if (seccion !== "todas" && f.seccion !== seccion) return false;
    if (buque !== "todos" && f.buque !== buque) return false;
    if (cliente !== "todos" && f.cliente !== cliente) return false;
    if (anio !== "todos") {
      const a = f.anio_desde ?? f.anio_hasta;
      const b = f.anio_hasta ?? f.anio_desde;
      if (a === null || b === null) return false;
      const n = Number(anio);
      if (n < Math.min(a, b) || n > Math.max(a, b)) return false;
    }
    return true;
  });

  const valorDeclarado = visibles.reduce((a, f) => a + (f.valor_usd ?? 0), 0);
  const conValor = visibles.filter((f) => f.valor_usd !== null).length;
  const hayFiltro =
    seccion !== "todas" || buque !== "todos" || cliente !== "todos" || anio !== "todos";

  const grupos = SECCIONES_TR.map((s) => ({
    ...s,
    items: visibles.filter((f) => f.seccion === s.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="filtros no-imprimir">
        <div className="fg-inline">
          <label>Linea</label>
          <select
            className="filter-select"
            value={seccion}
            onChange={(e) => setSeccion(e.target.value as "todas" | SeccionTR)}
          >
            <option value="todas">Todas</option>
            {SECCIONES_TR.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Buque</label>
          <select
            className="filter-select"
            value={buque}
            onChange={(e) => setBuque(e.target.value)}
          >
            <option value="todos">Todos</option>
            {buques.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Cliente</label>
          <select
            className="filter-select"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          >
            <option value="todos">Todos</option>
            {clientes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Año</label>
          <select
            className="filter-select"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          >
            <option value="todos">Todos</option>
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {hayFiltro && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSeccion("todas");
              setBuque("todos");
              setCliente("todos");
              setAnio("todos");
            }}
          >
            Limpiar
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => window.print()}
        >
          Imprimir / PDF
        </button>
      </div>

      <div className="stats no-imprimir">
        <div className="stat">
          <div className="stat-label">Trabajos</div>
          <div className="stat-value">{visibles.length}</div>
          <span className="hint">
            {buques.length} buques · {clientes.length} clientes
          </span>
        </div>
        <div className="stat">
          <div className="stat-label">Periodo</div>
          <div className="stat-value">
            {anios.length ? `${anios[anios.length - 1]}–${anios[0]}` : "—"}
          </div>
          <span className="hint">Del track record completo</span>
        </div>
        <div className="stat">
          <div className="stat-label">Valor declarado</div>
          <div className="stat-value">{plata(valorDeclarado)}</div>
          <span className="hint">
            {conValor} de {visibles.length} trabajos tienen valor cargado
          </span>
        </div>
      </div>

      {visibles.length === 0 && (
        <div className="empty-state">No hay trabajos con estos filtros.</div>
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
                  <th>Vessel</th>
                  <th>Type</th>
                  {grupo.id !== "chartering" && <th>Owner</th>}
                  <th>Client</th>
                  <th>Region</th>
                  <th>Period</th>
                  <th>Scope of work</th>
                  <th>Years</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((f) => (
                  <tr key={f.id}>
                    <td className="cel-compania">
                      {f.href ? <Link href={f.href}>{f.buque ?? "—"}</Link> : (f.buque ?? "—")}
                      {f.origen === "proyecto" && (
                        <div className="text-muted cel-sub no-imprimir">del modulo</div>
                      )}
                    </td>
                    <td className="text-muted">{f.tipo_de_buque ?? "—"}</td>
                    {grupo.id !== "chartering" && (
                      <td className="text-muted">{f.armador ?? "—"}</td>
                    )}
                    <td>{f.cliente ?? "—"}</td>
                    <td className="text-muted">{f.region ?? "—"}</td>
                    <td className="text-mono">{f.periodo ?? "—"}</td>
                    <td>
                      <span className="cel-texto">{f.alcance ?? "—"}</span>
                    </td>
                    <td className="text-mono">
                      {f.anio_desde === null
                        ? "—"
                        : f.anio_hasta && f.anio_hasta !== f.anio_desde
                          ? `${f.anio_desde}–${f.anio_hasta}`
                          : f.anio_desde}
                    </td>
                    <td className="text-mono cel-valor">{f.valor_texto ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <span className="hint no-imprimir">
        Las filas historicas vienen del track record en Excel. Los proyectos que
        se terminan en el modulo aparecen solos, con el valor redondeado como lo
        escribe el documento; los marcados <strong>del modulo</strong> son esos.
      </span>
    </div>
  );
}
