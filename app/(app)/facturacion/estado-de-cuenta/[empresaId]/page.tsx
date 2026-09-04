import Link from "next/link";
import { notFound } from "next/navigation";
import ImprimirCalculo from "@/components/ImprimirCalculo";
import { esperaParaFacturar, pendienteDeFacturar } from "@/lib/facturas";
import { diasLegibles, fechaHoraSiLaTiene, fechaLegible, hoyEnArgentina } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  diasDeOperacion,
  estadoDeFactura,
  type FacturaListada,
  type Operacion,
} from "@/lib/types";

// El estado de cuenta que se le manda al cliente.
//
// En Service Management el trabajo no se factura al terminar: se esperan 90
// dias y ahi se le pregunta al cliente si autoriza facturar. Este es el
// documento de esa pregunta: los trabajos terminados que ya cumplieron la
// espera, con sus fechas y sus importes, para que el cliente de novedades.
//
// Incluye tambien lo facturado y sin cobrar, que es la otra mitad de la
// conversacion: si hay una factura vencida, va en el mismo papel.
const plata = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 2,
  }).format(valor);

export default async function EstadoDeCuentaPage({
  params,
}: {
  params: Promise<{ empresaId: string }>;
}) {
  const { empresaId } = await params;
  const supabase = await createClient();
  const hoy = hoyEnArgentina();

  const { data: e } = await supabase
    .from("cliente_empresas")
    .select("id, nombre, dias_para_facturar, dias_de_pago")
    .eq("id", empresaId)
    .maybeSingle();
  if (!e) notFound();
  const empresa = e as {
    id: string;
    nombre: string;
    dias_para_facturar: number | null;
    dias_de_pago: number | null;
  };

  // Los proyectos de este cliente, y de ahi sus salidas y sus facturas.
  const { data: proy } = await supabase
    .from("proyectos")
    .select("id, nombre, nro_proyecto, moneda")
    .eq("cliente_empresa_id", empresaId);
  const proyectos = (proy ?? []) as {
    id: string;
    nombre: string;
    nro_proyecto: string | null;
    moneda: string;
  }[];
  const ids = proyectos.map((p) => p.id);

  const [{ data: sal }, { data: fact }] = await Promise.all([
    ids.length
      ? supabase
          .from("operaciones")
          .select("*")
          .in("proyecto_id", ids)
          .neq("estado", "cancelada")
          .order("fecha_fin", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from("facturas_listado")
          .select("*")
          .in("proyecto_id", ids)
          .order("fecha_emision", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const operaciones = (sal ?? []) as Operacion[];
  const facturas = (fact ?? []) as FacturaListada[];

  const esperas = esperaParaFacturar(
    pendienteDeFacturar(operaciones, facturas),
    () => empresa.dias_para_facturar,
    hoy
  );
  const listas = esperas.filter((x) => x.habilitado);
  const sinCobrar = facturas.filter((f) => f.cobro_moneda === null);

  const moneda = proyectos[0]?.moneda ?? "USD";
  const totalListo = listas.reduce((a, x) => a + x.pendiente.pendiente, 0);
  const totalSinCobrar = sinCobrar.reduce((a, f) => a + Number(f.importe ?? 0), 0);

  return (
    <div className="documento">
      {/* La barra queda afuera de la hoja: no es parte del documento. */}
      <div className="flex-between mb16 no-imprimir">
        <Link href="/facturacion" className="btn btn-ghost btn-sm">
          Atras
        </Link>
        <ImprimirCalculo />
      </div>

      {/* De aca abajo es la hoja: lo que se ve es lo que sale impreso. */}
      <div className="hoja-marco">
        <div className="hoja">

      <div className="card">
        <div className="doc-cabeza">
          <img src="/PL.png" alt="PL Offshore" className="doc-logo" />
          <div>
            <div className="doc-titulo">Estado de cuenta</div>
            <div className="doc-sub">{empresa.nombre}</div>
          </div>
          <div className="doc-meta">
            <div>{fechaLegible(hoy)}</div>
            <div className="text-muted">PL Offshore</div>
          </div>
        </div>

        <p className="doc-parrafo">
          Detalle de los trabajos ejecutados que se encuentran en condiciones de
          ser facturados
          {empresa.dias_para_facturar
            ? `, habiendo transcurrido los ${empresa.dias_para_facturar} dias desde su finalizacion`
            : ""}
          . Agradecemos su confirmacion para proceder con la facturacion.
        </p>

        {listas.length === 0 ? (
          <div className="empty-state">
            No hay trabajos en condiciones de facturar para este cliente.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tabla-doc">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Trabajo</th>
                  <th>Buque</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th style={{ textAlign: "right" }}>Dias</th>
                  <th style={{ textAlign: "right" }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {listas.map(({ pendiente }) => {
                  const o = pendiente.salida;
                  const dias = diasDeOperacion(o.fecha_inicio, o.fecha_fin);
                  return (
                    <tr key={o.id}>
                      <td className="text-mono">{o.nro_operacion ?? "—"}</td>
                      <td>{o.nombre}</td>
                      <td className="text-muted">{o.buque ?? "—"}</td>
                      <td className="text-mono">{fechaHoraSiLaTiene(o.fecha_inicio)}</td>
                      <td className="text-mono">{fechaHoraSiLaTiene(o.fecha_fin)}</td>
                      <td className="text-mono" style={{ textAlign: "right" }}>
                        {dias === null ? "—" : diasLegibles(dias)}
                      </td>
                      <td className="text-mono" style={{ textAlign: "right" }}>
                        {plata(o.moneda, pendiente.pendiente)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="fila-total">
                  <td colSpan={6}>Total a facturar</td>
                  <td className="text-mono" style={{ textAlign: "right" }}>
                    {plata(moneda, totalListo)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* La otra mitad de la conversacion: si hay facturas emitidas sin cobrar,
          van en el mismo papel. */}
      {sinCobrar.length > 0 && (
        <div className="card">
          <div className="form-section">Facturas emitidas pendientes de cobro</div>
          <div className="table-wrap">
            <table className="tabla-doc">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Trabajo</th>
                  <th>Emision</th>
                  <th>Vencimiento</th>
                  <th style={{ textAlign: "right" }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {sinCobrar.map((f) => (
                  <tr key={f.id}>
                    <td className="text-mono">{f.nro_factura ?? "sin nro"}</td>
                    <td>{f.salida ?? f.proyecto}</td>
                    <td className="text-mono">{fechaLegible(f.fecha_emision)}</td>
                    <td className="text-mono">
                      {f.vencimiento ? fechaLegible(f.vencimiento) : "—"}
                      {estadoDeFactura(f, hoy) === "vencida" && (
                        <span className="text-muted"> (vencida)</span>
                      )}
                    </td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {plata(f.moneda, Number(f.importe))}
                    </td>
                  </tr>
                ))}
                <tr className="fila-total">
                  <td colSpan={4}>Total pendiente de cobro</td>
                  <td className="text-mono" style={{ textAlign: "right" }}>
                    {plata(moneda, totalSinCobrar)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="doc-pie">
        Documento generado el {fechaLegible(hoy)}. Los importes no incluyen IVA.
        {empresa.dias_de_pago
          ? ` Condicion de pago: ${empresa.dias_de_pago} dias desde la emision de la factura.`
          : ""}
      </div>
        </div>
      </div>
    </div>
  );
}
