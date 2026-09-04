import Link from "next/link";
import { diasAlCobro, totalesDeCobranza } from "@/lib/facturas";
import { fechaLegible, hoyEnArgentina } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  ESTADOS_FACTURA,
  estadoDeFactura,
  netoDeFactura,
  type FacturaListada,
  type Moneda,
  type Operacion,
} from "@/lib/types";

const plata = (moneda: Moneda | string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
    maximumFractionDigits: 0,
  }).format(valor);

const plataExacta = (moneda: Moneda | string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);

// El seguimiento de la facturacion: que se factura, que se cobro, que esta
// vencido y que falta facturar.
//
// Es la pantalla que reemplaza al tablero de "REMOLCADORES - RESUMEN 2026",
// con una diferencia importante: el estado de cada factura no se escribe ni se
// guarda, se deduce de si hay cobro y de la fecha de vencimiento. En la
// planilla era una formula que preguntaba si la columna "Cobrado" decia USD o
// ARS mientras ahi estaba escrito "Si", asi que informaba 0% cobrado con
// 451.400 USD ya cobrados.
export default async function FacturacionPage() {
  const supabase = await createClient();
  const hoy = hoyEnArgentina();

  const [{ data, error }, { data: sal }] = await Promise.all([
    supabase
      .from("facturas_listado")
      .select("*")
      .order("fecha_emision", { ascending: false }),
    // Las salidas que ya pasaron y todavia no se facturaron. Es el "Pendiente
    // de Facturar" del tablero.
    supabase
      .from("operaciones")
      .select("*")
      .neq("estado", "cancelada")
      .order("fecha_fin", { ascending: false, nullsFirst: false }),
  ]);

  const facturas = (data ?? []) as FacturaListada[];
  const operaciones = (sal ?? []) as Operacion[];

  const facturadas = new Set(
    facturas.map((f) => f.operacion_id).filter((id): id is string => id !== null)
  );
  const pendientesDeFacturar = operaciones.filter((o) => !facturadas.has(o.id));

  const totales = totalesDeCobranza(facturas, hoy);

  // Agrupadas por estado, en el orden en que importan: lo vencido primero.
  const orden = ["vencida", "en_plazo", "sin_vencimiento", "cobrada"] as const;
  const grupos = orden
    .map((id) => ({
      ...(ESTADOS_FACTURA.find((e) => e.id === id) ?? ESTADOS_FACTURA[0]),
      items: facturas.filter((f) => estadoDeFactura(f, hoy) === id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudieron leer las facturas: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0028_facturacion.sql</span>.
        </div>
      )}

      {totales.map((t) => (
        <div key={t.moneda} className="card">
          <div className="card-title">
            <span>
              Cobranza en {t.moneda} · {t.facturas}{" "}
              {t.facturas === 1 ? "factura" : "facturas"}
            </span>
            <span className="text-muted">
              {(t.porcentajeCobrado * 100).toFixed(1)}% cobrado
              {t.promedioDiasAlCobro !== null && (
                <> · {t.promedioDiasAlCobro} dias promedio al cobro</>
              )}
            </span>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Facturado</div>
              <div className="stat-value">{plata(t.moneda, t.facturado)}</div>
              {t.comisiones > 0 && (
                <span className="hint">
                  Neto de comisiones: {plata(t.moneda, t.neto)}
                </span>
              )}
            </div>
            <div className="stat">
              <div className="stat-label">Cobrado</div>
              <div className="stat-value">{plata(t.moneda, t.cobrado)}</div>
              <span className="hint">
                {plata(t.moneda, t.cobradoEnUSD)} en dolares ·{" "}
                {plata(t.moneda, t.cobradoEnARS)} en pesos
              </span>
            </div>
            <div className="stat">
              <div className="stat-label">Pendiente de cobro</div>
              <div className="stat-value">{plata(t.moneda, t.enPlazo)}</div>
              <span className="hint">Emitido y en plazo</span>
            </div>
            <div className="stat">
              <div className="stat-label">Vencido</div>
              <div className="stat-value">{plata(t.moneda, t.vencido)}</div>
              <span className="hint">Pasado de la fecha y sin cobrar</span>
            </div>
          </div>
        </div>
      ))}

      {!error && facturas.length === 0 && (
        <div className="empty-state">
          Todavia no hay facturas cargadas. Se cargan desde la ficha de un
          proyecto, con <strong>Nueva factura</strong>, o{" "}
          <Link href="/facturacion/nueva">
            <strong>desde aca eligiendo el proyecto</strong>
          </Link>
          .
        </div>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="card">
          <div className="card-title">
            <span className={`badge ${grupo.color}`}>
              {grupo.label} ({grupo.items.length})
            </span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Buque</th>
                  <th>Emision</th>
                  <th>Vencimiento</th>
                  <th>Neto</th>
                  <th>Cobro</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((f) => {
                  const dias = diasAlCobro(f);
                  return (
                    <tr key={f.id}>
                      <td className="text-mono cel-nro">
                        {f.nro_factura ?? <span className="text-muted">sin nro</span>}
                      </td>
                      <td className="cel-compania">
                        {f.proyecto}
                        {f.salida && (
                          <div className="text-muted cel-sub">
                            {[f.nro_operacion, f.salida].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td>
                        {f.compania ?? "-"}
                        {f.cliente_final && (
                          <div className="text-muted cel-sub">para {f.cliente_final}</div>
                        )}
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
                        {plataExacta(f.moneda, netoDeFactura(f))}
                        {Number(f.comision) > 0 && (
                          <div className="text-muted cel-sub">
                            {plataExacta(f.moneda, Number(f.importe))} bruto
                          </div>
                        )}
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
        </div>
      ))}

      {pendientesDeFacturar.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span className="badge b-amber">
              Pendiente de facturar ({pendientesDeFacturar.length})
            </span>
            <span className="text-muted">
              {plata(
                pendientesDeFacturar[0]?.moneda ?? "USD",
                pendientesDeFacturar.reduce((a, o) => a + Number(o.valor ?? 0), 0)
              )}
            </span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Salida</th>
                  <th>Buque</th>
                  <th>Cliente final</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendientesDeFacturar.map((o) => (
                  <tr key={o.id}>
                    <td className="text-mono cel-nro">{o.nro_operacion ?? "-"}</td>
                    <td className="cel-compania">{o.nombre}</td>
                    <td className="text-muted">{o.buque ?? "—"}</td>
                    <td className="text-muted">{o.cliente_final ?? "—"}</td>
                    <td className="text-mono cel-valor">
                      {plataExacta(o.moneda, Number(o.valor ?? 0))}
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
          <span className="hint">
            Salidas cargadas que todavia no tienen factura. Las canceladas no
            cuentan.
          </span>
        </div>
      )}
    </div>
  );
}
