"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import GraficoCobranza from "@/components/GraficoCobranza";
import {
  cobranzaPorBuque,
  diasAlCobro,
  ESTADOS_DE_COBRANZA,
  pendienteDeFacturar,
  totalesDeCobranza,
  type EstadoDeCobranza,
} from "@/lib/facturas";
import { fechaConHoraSiTiene, fechaLegible } from "@/lib/fechas";
import {
  estadoDeFactura,
  netoDeFactura,
  type FacturaListada,
  type Moneda,
  type Operacion,
  type Oportunidad,
  type ProyectoConOperaciones,
} from "@/lib/types";

// El tablero, del lado del cliente porque se filtra sin ir al servidor.
//
// Tres filtros que valen para toda la pantalla —año, buque y estado de la
// plata— y un grafico que ademas de mostrar, filtra: tocar un segmento pone
// ese estado y las tablas de abajo quedan con esas filas. Es la forma mas
// corta de pasar de "hay 40.000 vencidos" a "son estas dos facturas".
//
// Las cuentas no viven aca: salen de lib/facturas.ts, las mismas que usa la
// pantalla de Facturacion. Dos cuentas distintas para el mismo numero es como
// se desincronizan.

const plata = (moneda: string, valor: number, exacto = false) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
    maximumFractionDigits: exacto ? 2 : 0,
  }).format(valor);

const anioDe = (iso: string | null | undefined) => iso?.slice(0, 4) ?? null;

function Montos({ totales }: { totales: [string, number][] }) {
  const conPlata = totales.filter(([, v]) => v !== 0);
  if (conPlata.length === 0) return <>{plata("USD", 0)}</>;
  return <>{conPlata.map(([m, v]) => plata(m, v)).join(" · ")}</>;
}

function porMoneda<T>(items: T[], monto: (t: T) => number, moneda: (t: T) => string) {
  const mapa = new Map<string, number>();
  for (const it of items) {
    const m = moneda(it) === "ARS" ? "ARS" : "USD";
    mapa.set(m, (mapa.get(m) ?? 0) + monto(it));
  }
  return [...mapa.entries()].filter(([, v]) => v !== 0) as [string, number][];
}

export default function Tablero({
  oportunidades,
  proyectos,
  facturas,
  salidas,
  hoy,
}: {
  oportunidades: Oportunidad[];
  proyectos: ProyectoConOperaciones[];
  facturas: FacturaListada[];
  // Las salidas no canceladas, con o sin factura.
  salidas: Operacion[];
  // El dia de hoy en hora argentina, calculado en el servidor para que el
  // reloj de la maquina no cambie que esta vencido.
  hoy: string;
}) {
  const [anio, setAnio] = useState("todos");
  const [buque, setBuque] = useState("todos");
  const [estado, setEstado] = useState<EstadoDeCobranza | null>(null);

  // Lo que se ofrece filtrar sale de los datos: no tiene sentido ofrecer 2025
  // si no hay nada de 2025.
  const anios = useMemo(() => {
    const todos = [
      ...oportunidades.map((o) => anioDe(o.fecha_creacion)),
      ...proyectos.map((p) => anioDe(p.arranco ?? p.fecha_inicio_estimada)),
      ...facturas.map((f) => anioDe(f.fecha_emision)),
      ...salidas.map((s) => anioDe(s.fecha_inicio)),
    ].filter((a): a is string => a !== null);
    return [...new Set(todos)].sort().reverse();
  }, [oportunidades, proyectos, facturas, salidas]);

  const buques = useMemo(() => {
    const todos = [
      ...oportunidades.map((o) => o.buque),
      ...proyectos.map((p) => p.buque),
      ...facturas.map((f) => f.buque),
      ...salidas.map((s) => s.buque),
    ].filter((b): b is string => Boolean(b));
    return [...new Set(todos)].sort((a, b) => a.localeCompare(b, "es"));
  }, [oportunidades, proyectos, facturas, salidas]);

  const pasaAnio = (iso: string | null | undefined) =>
    anio === "todos" || anioDe(iso) === anio;
  const pasaBuque = (b: string | null) => buque === "todos" || b === buque;

  const opp = oportunidades.filter(
    (o) => pasaAnio(o.fecha_creacion) && pasaBuque(o.buque)
  );
  const proy = proyectos.filter(
    (p) => pasaAnio(p.arranco ?? p.fecha_inicio_estimada) && pasaBuque(p.buque)
  );
  const fact = facturas.filter(
    (f) => pasaAnio(f.fecha_emision) && pasaBuque(f.buque)
  );
  const sal = salidas.filter((s) => pasaAnio(s.fecha_inicio) && pasaBuque(s.buque));

  // ── Oportunidades ──
  const enCurso = opp.filter((o) => o.estado === "en_curso");
  const adjudicadas = opp.filter((o) => o.estado === "adjudicado");
  const canceladas = opp.filter((o) => o.estado === "cancelado");
  const cotizado = porMoneda(enCurso, (o) => Number(o.valor ?? 0), (o) => o.moneda);

  // ── Proyectos ──
  const activos = proy.filter(
    (p) => p.estado === "en_curso" || p.estado === "por_arrancar"
  );
  const finalizados = proy.filter((p) => p.estado === "finalizado");
  const acordado = porMoneda(activos, (p) => Number(p.valor ?? 0), (p) => p.moneda);

  // ── Facturacion ──
  const totales = totalesDeCobranza(fact, hoy);
  // Lo que falta facturar es valor menos facturado, salida por salida: una
  // salida puede tener facturas y faltarle plata igual.
  const pendientes = pendienteDeFacturar(sal, fact);
  const sinFacturar = pendientes.map((p) => p.salida);

  const deTotales = (campo: "facturado" | "cobrado" | "enPlazo" | "vencido") =>
    totales.map((t) => [t.moneda, t[campo]] as [string, number]);

  // Al grafico va el pendiente, no el valor entero de la salida: de la
  // Atlantic Dama con HOC faltan 247.140 sobre un trabajo de 1.035.770.
  const sinFacturarParaGrafico = pendientes.map((p) => ({
    buque: p.salida.buque,
    moneda: p.salida.moneda,
    valor: p.pendiente,
  }));

  const monedas = [
    ...new Set([...fact.map((f) => f.moneda), ...sinFacturar.map((o) => o.moneda)]),
  ];

  const graficos = monedas
    .map((moneda) => {
      const t = totales.find((x) => x.moneda === moneda);
      return {
        moneda,
        barras: cobranzaPorBuque(fact, sinFacturarParaGrafico, hoy, moneda),
        totalesPorEstado: [
          { estado: "cobrado" as const, monto: t?.cobrado ?? 0 },
          { estado: "en_plazo" as const, monto: t?.enPlazo ?? 0 },
          {
            estado: "sin_facturar" as const,
            monto: sinFacturarParaGrafico
              .filter((s) => s.moneda === moneda)
              .reduce((a, s) => a + s.valor, 0),
          },
          { estado: "vencido" as const, monto: t?.vencido ?? 0 },
        ],
      };
    })
    .filter((g) => g.barras.some((b) => b.total > 0));

  // El estado elegido en el grafico filtra las facturas de abajo. "Sin
  // facturar" no es un estado de factura: no hay factura todavia, asi que la
  // tabla de facturas queda vacia y la que importa es la de pendientes.
  const facturasVisibles = fact.filter((f) => {
    if (estado === null) return true;
    if (estado === "sin_facturar") return false;
    const e = estadoDeFactura(f, hoy);
    return (
      (estado === "cobrado" && e === "cobrada") ||
      (estado === "en_plazo" && e === "en_plazo") ||
      (estado === "vencido" && e === "vencida")
    );
  });

  const pendientesVisibles =
    estado === null || estado === "sin_facturar" ? pendientes : [];

  const hayFiltro = anio !== "todos" || buque !== "todos" || estado !== null;
  const etiquetaEstado = estado
    ? (ESTADOS_DE_COBRANZA.find((e) => e.id === estado)?.label ?? estado)
    : null;

  return (
    <div>
      {/* Los filtros en una fila, arriba de todo. */}
      <div className="filtros">
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

        {estado !== null && (
          <button type="button" className="chip-filtro" onClick={() => setEstado(null)}>
            <i
              style={{
                background: ESTADOS_DE_COBRANZA.find((e) => e.id === estado)?.color,
              }}
            />
            {etiquetaEstado}
            <span aria-hidden="true">✕</span>
          </button>
        )}

        {hayFiltro && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setAnio("todos");
              setBuque("todos");
              setEstado(null);
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Los tres titulares. */}
      <div className="stats">
        <Link href="/oportunidades" className="stat stat-link">
          <div className="stat-label">Oportunidades en curso</div>
          <div className="stat-value">{enCurso.length}</div>
          <span className="hint">
            <Montos totales={cotizado} /> cotizados
          </span>
        </Link>
        <Link href="/proyectos" className="stat stat-link">
          <div className="stat-label">Proyectos activos</div>
          <div className="stat-value">{activos.length}</div>
          <span className="hint">
            <Montos totales={acordado} /> acordados
          </span>
        </Link>
        <Link href="/facturacion" className="stat stat-link">
          <div className="stat-label">Por cobrar</div>
          <div className="stat-value">
            <Montos totales={totales.map((t) => [t.moneda, t.enPlazo + t.vencido])} />
          </div>
          <span className="hint">
            {totales.some((t) => t.vencido > 0) ? (
              <>
                <Montos totales={deTotales("vencido")} /> vencidos
              </>
            ) : (
              "nada vencido"
            )}
          </span>
        </Link>
      </div>

      {/* ── EL GRAFICO ── */}
      {graficos.map((g) => (
        <div key={g.moneda} className="card">
          <div className="card-title">
            <span>Estado de la plata por buque · {g.moneda}</span>
            <Link href="/facturacion" className="btn btn-ghost btn-sm">
              Ver el detalle
            </Link>
          </div>
          <GraficoCobranza
            barras={g.barras}
            moneda={g.moneda}
            totalesPorEstado={g.totalesPorEstado}
            elegido={estado}
            alElegir={(e) => setEstado(estado === e ? null : e)}
          />
          <span className="hint">
            Toca un color para ver esas filas abajo. Cobrado y en plazo salen de
            las facturas; sin facturar son las salidas cargadas que todavia no
            tienen ninguna. Todas las barras estan en la misma escala.
          </span>
        </div>
      ))}

      {/* ── OPORTUNIDADES ── */}
      {estado === null && (
        <div className="card">
          <div className="card-title">
            <span>
              Oportunidades · {enCurso.length} en curso · {adjudicadas.length} adjudicadas
              {canceladas.length > 0 && <> · {canceladas.length} canceladas</>}
            </span>
            <Link href="/oportunidades" className="btn btn-ghost btn-sm">
              Ver todas
            </Link>
          </div>

          {enCurso.length === 0 ? (
            <div className="empty-state">No hay oportunidades en curso.</div>
          ) : (
            <div className="table-wrap">
              <table className="tabla-lista">
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>Cliente</th>
                    <th>Tarea</th>
                    <th>Buque</th>
                    <th>Valor</th>
                    <th>Ultimo contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {enCurso.map((o) => (
                    <tr key={o.id}>
                      <td className="text-mono cel-nro">{o.nro_oportunidad ?? "-"}</td>
                      <td className="cel-compania">{o.compania}</td>
                      <td>
                        <span className="cel-texto">{o.descripcion_alcance ?? "—"}</span>
                      </td>
                      <td className="text-muted">{o.buque ?? "—"}</td>
                      <td className="text-mono cel-valor">
                        {plata(o.moneda, Number(o.valor ?? 0), true)}
                      </td>
                      <td className="text-mono">{fechaLegible(o.last_interacted_on)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PROYECTOS ── */}
      {estado === null && (
        <div className="card">
          <div className="card-title">
            <span>
              Proyectos · {activos.length} activos
              {finalizados.length > 0 && <> · {finalizados.length} finalizados</>}
            </span>
            <Link href="/proyectos" className="btn btn-ghost btn-sm">
              Ver todos
            </Link>
          </div>

          {activos.length === 0 ? (
            <div className="empty-state">No hay proyectos activos.</div>
          ) : (
            <div className="table-wrap">
              <table className="tabla-lista">
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>Proyecto</th>
                    <th>Cliente</th>
                    <th>Buque</th>
                    <th>Salidas</th>
                    <th>Acordado</th>
                    <th>Ejecutado</th>
                    <th>Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((p) => (
                    <tr key={p.id}>
                      <td className="text-mono cel-nro">{p.nro_proyecto ?? "-"}</td>
                      <td className="cel-compania">{p.nombre}</td>
                      <td>
                        {p.compania ?? "-"}
                        {p.cliente_final && (
                          <div className="text-muted cel-sub">para {p.cliente_final}</div>
                        )}
                      </td>
                      <td className="text-muted">{p.buque ?? "—"}</td>
                      <td className="text-mono">{Number(p.operaciones ?? 0) || "—"}</td>
                      <td className="text-mono cel-valor">
                        {plata(p.moneda, Number(p.valor ?? 0), true)}
                      </td>
                      <td className="text-mono cel-valor">
                        {plata(p.moneda, Number(p.valor_ejecutado ?? 0), true)}
                      </td>
                      <td className="text-mono">
                        {fechaConHoraSiTiene(p.arranco ?? p.fecha_inicio_estimada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── FACTURAS ── */}
      <div className="card">
        <div className="card-title">
          <span>
            {estado === null ? (
              <>
                Facturacion · {fact.length} {fact.length === 1 ? "factura" : "facturas"}
                {totales.length === 1 && (
                  <span className="text-muted">
                    {" "}
                    · {(totales[0].porcentajeCobrado * 100).toFixed(1)}% cobrado
                  </span>
                )}
              </>
            ) : (
              <>
                {etiquetaEstado} · {facturasVisibles.length + pendientesVisibles.length}{" "}
                {facturasVisibles.length + pendientesVisibles.length === 1
                  ? "fila"
                  : "filas"}
              </>
            )}
          </span>
          <Link href="/facturacion" className="btn btn-ghost btn-sm">
            Ver seguimiento
          </Link>
        </div>

        {fact.length === 0 && sinFacturar.length === 0 ? (
          <div className="empty-state">
            Todavia no hay facturas cargadas.{" "}
            <Link href="/facturacion">
              <strong>Empezar a facturar</strong>
            </Link>
            .
          </div>
        ) : (
          <>
            {facturasVisibles.length > 0 && (
              <div className="table-wrap">
                <table className="tabla-lista">
                  <thead>
                    <tr>
                      <th>Nro</th>
                      <th>Cliente</th>
                      <th>Proyecto</th>
                      <th>Buque</th>
                      <th>Emision</th>
                      <th>Vencimiento</th>
                      <th>Neto</th>
                      <th>Cobro</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {facturasVisibles.map((f) => {
                      const dias = diasAlCobro(f);
                      return (
                        <tr key={f.id}>
                          <td className="text-mono cel-nro">
                            {f.nro_factura ?? <span className="text-muted">sin nro</span>}
                          </td>
                          <td className="cel-compania">{f.compania ?? "-"}</td>
                          <td className="text-muted">
                            <span className="cel-texto">{f.proyecto}</span>
                          </td>
                          <td className="text-muted">{f.buque ?? "—"}</td>
                          <td className="text-mono">{fechaLegible(f.fecha_emision)}</td>
                          <td className="text-mono">
                            {f.vencimiento ? (
                              fechaLegible(f.vencimiento)
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-mono cel-valor">
                            {plata(f.moneda, netoDeFactura(f), true)}
                          </td>
                          <td className="text-mono">
                            {f.cobro_fecha ? (
                              <>
                                {fechaLegible(f.cobro_fecha)}
                                <div className="text-muted cel-sub">
                                  en {f.cobro_moneda}
                                  {dias !== null && ` · ${dias} dias`}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link
                              href={`/facturacion/${f.id}`}
                              className="btn btn-ghost btn-sm"
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pendientesVisibles.length > 0 && (
              <>
                <div className="form-section mt16">Sin facturar</div>
                <div className="table-wrap">
                  <table className="tabla-lista">
                    <thead>
                      <tr>
                        <th>Nro</th>
                        <th>Salida</th>
                        <th>Buque</th>
                        <th>Valor</th>
                        <th>Facturado</th>
                        <th>Falta facturar</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pendientesVisibles.map(({ salida: o, valor, facturado, pendiente }) => (
                        <tr key={o.id}>
                          <td className="text-mono cel-nro">{o.nro_operacion ?? "-"}</td>
                          <td className="cel-compania">
                            <span className="cel-texto">{o.nombre}</span>
                          </td>
                          <td className="text-muted">{o.buque ?? "—"}</td>
                          <td className="text-mono cel-valor">
                            {plata(o.moneda, valor, true)}
                          </td>
                          <td className="text-mono cel-valor">
                            {facturado > 0 ? (
                              plata(o.moneda, facturado, true)
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-mono cel-valor">
                            <strong>{plata(o.moneda, pendiente, true)}</strong>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link
                              href={`/facturacion/nueva?proyecto=${o.proyecto_id}&operacion=${o.id}`}
                              className="btn btn-amarillo btn-sm"
                            >
                              Facturar
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {facturasVisibles.length === 0 && pendientesVisibles.length === 0 && (
              <div className="empty-state">
                No hay nada en {etiquetaEstado?.toLowerCase()} con estos filtros.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
