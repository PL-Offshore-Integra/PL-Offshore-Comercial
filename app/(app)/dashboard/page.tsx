import Link from "next/link";
import { totalesDeCobranza } from "@/lib/facturas";
import { fechaConHoraSiTiene, fechaLegible, hoyEnArgentina } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  estadoDeFactura,
  netoDeFactura,
  type FacturaListada,
  type Operacion,
  type Oportunidad,
  type ProyectoConOperaciones,
} from "@/lib/types";

// El tablero: las tres cosas que pasan en Comercial, en el orden en que pasan.
// Una oportunidad se cotiza y se adjudica; el proyecto se trabaja y se
// factura; la factura se cobra.
//
// Cada tarjeta lleva a su pantalla. Los numeros grandes son el titular: si
// algo esta mal, lo primero que se ve es cuanto.

const plata = (moneda: string, valor: number, exacto = false) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
    maximumFractionDigits: exacto ? 2 : 0,
  }).format(valor);

// Sumar pesos con dolares da un numero que no existe, asi que se suma por
// moneda y se muestran las dos. Con una sola moneda —el caso de siempre— se
// lee igual que un total comun.
function porMoneda<T>(items: T[], monto: (t: T) => number, moneda: (t: T) => string) {
  const mapa = new Map<string, number>();
  for (const it of items) {
    const m = moneda(it) === "ARS" ? "ARS" : "USD";
    mapa.set(m, (mapa.get(m) ?? 0) + monto(it));
  }
  return [...mapa.entries()].filter(([, v]) => v !== 0) as [string, number][];
}

function Montos({ totales }: { totales: [string, number][] }) {
  const conPlata = totales.filter(([, v]) => v !== 0);
  if (conPlata.length === 0) return <>{plata("USD", 0)}</>;
  return <>{conPlata.map(([m, v]) => plata(m, v)).join(" · ")}</>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const hoy = hoyEnArgentina();

  const [{ data: opp, error }, { data: proy }, { data: fact }, { data: sal }] =
    await Promise.all([
      supabase.from("oportunidades").select("*").order("valor", { ascending: false }),
      supabase.from("proyectos_con_operaciones").select("*"),
      supabase
        .from("facturas_listado")
        .select("*")
        .order("vencimiento", { ascending: true, nullsFirst: false }),
      supabase.from("operaciones").select("*").neq("estado", "cancelada"),
    ]);

  const oportunidades = (opp ?? []) as Oportunidad[];
  const proyectos = (proy ?? []) as ProyectoConOperaciones[];
  const facturas = (fact ?? []) as FacturaListada[];
  const operaciones = (sal ?? []) as Operacion[];

  // ── Oportunidades ──
  const enCurso = oportunidades.filter((o) => o.estado === "en_curso");
  const adjudicadas = oportunidades.filter((o) => o.estado === "adjudicado");
  const canceladas = oportunidades.filter((o) => o.estado === "cancelado");
  const cotizado = porMoneda(enCurso, (o) => Number(o.valor ?? 0), (o) => o.moneda);

  // ── Proyectos ──
  const activos = proyectos.filter(
    (p) => p.estado === "en_curso" || p.estado === "por_arrancar"
  );
  const finalizados = proyectos.filter((p) => p.estado === "finalizado");
  const acordado = porMoneda(activos, (p) => Number(p.valor ?? 0), (p) => p.moneda);
  const ejecutado = porMoneda(
    activos,
    (p) => Number(p.valor_ejecutado ?? 0),
    (p) => p.moneda
  );

  // ── Facturacion ──
  const totales = totalesDeCobranza(facturas, hoy);
  const vencidas = facturas.filter((f) => estadoDeFactura(f, hoy) === "vencida");
  const facturadas = new Set(
    facturas.map((f) => f.operacion_id).filter((id): id is string => id !== null)
  );
  const sinFacturar = operaciones.filter((o) => !facturadas.has(o.id));

  const deTotales = (campo: "facturado" | "cobrado" | "enPlazo" | "vencido") =>
    totales.map((t) => [t.moneda, t[campo]] as [string, number]);

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo cargar Supabase todavia: {error.message}.
        </div>
      )}

      {/* Los tres titulares. Es lo que se mira desde la puerta. */}
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
            <Montos
              totales={totales.map((t) => [t.moneda, t.enPlazo + t.vencido])}
            />
          </div>
          <span className="hint">
            {vencidas.length > 0 ? (
              <>
                <Montos totales={deTotales("vencido")} /> vencidos
              </>
            ) : (
              "nada vencido"
            )}
          </span>
        </Link>
      </div>

      {/* ── OPORTUNIDADES ── */}
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

      {/* ── PROYECTOS ── */}
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
          <>
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
            <span className="hint">
              Acordado es el precio del trato; ejecutado es lo que suman las
              salidas cargadas.
            </span>
          </>
        )}
      </div>

      {/* ── FACTURACION ── */}
      <div className="card">
        <div className="card-title">
          <span>
            Facturacion · {facturas.length}{" "}
            {facturas.length === 1 ? "factura" : "facturas"}
            {totales.length === 1 && (
              <span className="text-muted">
                {" "}
                · {(totales[0].porcentajeCobrado * 100).toFixed(1)}% cobrado
              </span>
            )}
          </span>
          <Link href="/facturacion" className="btn btn-ghost btn-sm">
            Ver seguimiento
          </Link>
        </div>

        {facturas.length === 0 ? (
          <div className="empty-state">
            Todavia no hay facturas cargadas.{" "}
            <Link href="/facturacion">
              <strong>Empezar a facturar</strong>
            </Link>
            .
          </div>
        ) : (
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Facturado</div>
              <div className="stat-value">
                <Montos totales={deTotales("facturado")} />
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Cobrado</div>
              <div className="stat-value">
                <Montos totales={deTotales("cobrado")} />
              </div>
              {totales.some((t) => t.promedioDiasAlCobro !== null) && (
                <span className="hint">
                  {totales.find((t) => t.promedioDiasAlCobro !== null)?.promedioDiasAlCobro}{" "}
                  dias promedio al cobro
                </span>
              )}
            </div>
            <div className="stat">
              <div className="stat-label">En plazo</div>
              <div className="stat-value">
                <Montos totales={deTotales("enPlazo")} />
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Vencido</div>
              <div className="stat-value">
                <Montos totales={deTotales("vencido")} />
              </div>
              <span className="hint">
                {vencidas.length === 0
                  ? "nada vencido"
                  : `${vencidas.length} ${vencidas.length === 1 ? "factura" : "facturas"}`}
              </span>
            </div>
          </div>
        )}

        {vencidas.length > 0 && (
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Cliente</th>
                  <th>Proyecto</th>
                  <th>Vencio</th>
                  <th>Neto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {vencidas.map((f) => (
                  <tr key={f.id}>
                    <td className="text-mono cel-nro">
                      {f.nro_factura ?? <span className="text-muted">sin nro</span>}
                    </td>
                    <td className="cel-compania">{f.compania ?? "-"}</td>
                    <td className="text-muted">{f.proyecto}</td>
                    <td className="text-mono">{fechaLegible(f.vencimiento)}</td>
                    <td className="text-mono cel-valor">
                      {plata(f.moneda, netoDeFactura(f), true)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/facturacion/${f.id}`} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sinFacturar.length > 0 && (
          <div className="info-box warn mt16">
            Hay{" "}
            <strong>
              {sinFacturar.length} {sinFacturar.length === 1 ? "salida" : "salidas"} sin
              facturar
            </strong>{" "}
            por{" "}
            <Montos
              totales={porMoneda(sinFacturar, (o) => Number(o.valor ?? 0), (o) => o.moneda)}
            />
            .{" "}
            <Link href="/facturacion">
              <strong>Ver cuales</strong>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
