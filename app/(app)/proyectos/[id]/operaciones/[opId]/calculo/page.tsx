import Link from "next/link";
import { notFound } from "next/navigation";
import ImprimirCalculo from "@/components/ImprimirCalculo";
import { diasLegibles, fechaHoraSiLaTiene } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  calculoParaElCliente,
  CONTRATACIONES,
  diasDeOperacion,
  type Concepto,
  type Operacion,
  type OperacionTarifa,
  type Proyecto,
} from "@/lib/types";

// El calculo de la salida, como se le manda al cliente.
//
// Reproduce la planilla que Maximo arma en Excel y pasa a PDF —"CALCULO
// GOLONDRINA DE MAR - SEAWAYS BALBOA"— con los datos del modulo y el diseño
// del modulo: los siete casilleros arriba, los tramos con sus ventanas y sus
// fracciones de dia, y los renglones de cierre con los nombres de la planilla.
//
// Se saca en PDF con el dialogo del navegador. La hoja de estilos de impresion
// se lleva el menu, los botones y todo lo que no es el documento.

const plata = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 2,
  }).format(valor);

export default async function CalculoPage({
  params,
}: {
  params: Promise<{ id: string; opId: string }>;
}) {
  const { id, opId } = await params;
  const supabase = await createClient();

  const [{ data: p }, { data: o }] = await Promise.all([
    supabase.from("proyectos").select("*").eq("id", id).single(),
    supabase.from("operaciones").select("*").eq("id", opId).single(),
  ]);
  if (!p || !o) notFound();

  const proyecto = p as Proyecto;
  const operacion = o as Operacion;
  if (operacion.proyecto_id !== proyecto.id) notFound();

  const { data: filas } = await supabase
    .from("operacion_tarifas")
    .select("*")
    .eq("operacion_id", opId)
    .order("orden", { ascending: true });
  const tarifas = (filas ?? []) as OperacionTarifa[];

  const montos: Partial<Record<Concepto, number>> = {};
  for (const t of tarifas) montos[t.concepto] = Number(t.monto);

  const calculo = calculoParaElCliente(
    operacion.estructura_tarifaria,
    montos,
    operacion.fecha_inicio,
    operacion.fecha_fin
  );

  const dias = diasDeOperacion(operacion.fecha_inicio, operacion.fecha_fin);
  const tipo = CONTRATACIONES.find((c) => c.id === operacion.estructura_tarifaria);

  // Los siete casilleros de la planilla, en su orden.
  const cabecera: { label: string; valor: string }[] = [
    { label: "Zona", valor: operacion.zona ?? "—" },
    { label: "Buque madre", valor: operacion.buque_madre ?? "—" },
    { label: "Cliente", valor: operacion.cliente_final ?? proyecto.compania ?? "—" },
    { label: "Alijadores", valor: operacion.alijador ?? "—" },
    { label: "Supply", valor: operacion.buque ?? proyecto.buque ?? "—" },
    { label: "Fecha desde", valor: fechaHoraSiLaTiene(operacion.fecha_inicio) },
    { label: "Fecha hasta", valor: fechaHoraSiLaTiene(operacion.fecha_fin) },
  ];

  return (
    <div className="documento">
      {/* La barra queda afuera de la hoja: no es parte del documento. */}
      <div className="flex-between mb16 no-imprimir">
        <Link
          href={`/proyectos/${proyecto.id}/operaciones/${operacion.id}`}
          className="btn btn-ghost btn-sm"
        >
          Atras
        </Link>
        <ImprimirCalculo />
      </div>

      {/* De aca abajo es la hoja: lo que se ve es lo que sale impreso. */}
      <div className="hoja-marco">
        <div className="hoja">

      {/* El encabezado del documento. En pantalla se ve como una tarjeta; en el
          PDF es la cabecera de la hoja. */}
      <div className="card">
        <div className="doc-cabeza">
          <img src="/PL.png" alt="PL Offshore" className="doc-logo" />
          <div>
            <div className="doc-titulo">
              {operacion.estructura_tarifaria === "dia_garantizado"
                ? "Operacion STS"
                : "Calculo de la salida"}
            </div>
            <div className="doc-sub">
              {operacion.nombre}
              {operacion.nro_operacion && <> · {operacion.nro_operacion}</>}
            </div>
          </div>
          <div className="doc-meta">
            <div>{proyecto.compania ?? ""}</div>
            <div className="text-muted">
              {proyecto.nro_proyecto} · {tipo?.label ?? operacion.estructura_tarifaria}
            </div>
          </div>
        </div>

        <div className="doc-grid">
          {cabecera.map((c) => (
            <div key={c.label} className="doc-celda">
              <div className="doc-celda-label">{c.label}</div>
              <div className="doc-celda-valor">{c.valor}</div>
            </div>
          ))}
          <div className="doc-celda">
            <div className="doc-celda-label">Duracion</div>
            <div className="doc-celda-valor">
              {dias === null ? "—" : `${diasLegibles(dias)} dias`}
            </div>
          </div>
        </div>
      </div>

      {/* Los tramos: cada uno con su ventana, su fraccion de dia y su tarifa.
          Es la parte que el cliente controla contra su propio registro. */}
      <div className="card">
        <div className="table-wrap">
          <table className="tabla-doc">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th style={{ textAlign: "right" }}>Dias</th>
                <th style={{ textAlign: "right" }}>Tarifa</th>
                <th style={{ textAlign: "right" }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {calculo.tramos.map((t) => (
                <tr key={t.label}>
                  <td>{t.label}</td>
                  <td className="text-mono">
                    {t.desde ? fechaHoraSiLaTiene(t.desde) : "—"}
                  </td>
                  <td className="text-mono">{t.hasta ? fechaHoraSiLaTiene(t.hasta) : "—"}</td>
                  <td className="text-mono" style={{ textAlign: "right" }}>
                    {diasLegibles(t.dias)}
                  </td>
                  <td className="text-mono" style={{ textAlign: "right" }}>
                    {plata(operacion.moneda, t.tarifa)}
                  </td>
                  <td className="text-mono" style={{ textAlign: "right" }}>
                    {plata(operacion.moneda, t.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Los renglones de cierre, con los nombres de la planilla. */}
        <div className="table-wrap">
          <table className="tabla-calculo">
            <tbody>
              {calculo.totales.map((t) => (
                <tr key={t.label}>
                  <td>{t.label}</td>
                  <td className="text-mono text-muted">
                    {t.dias === undefined ? "" : `${diasLegibles(t.dias)} dias`}
                  </td>
                  <td className="text-mono cel-valor" style={{ textAlign: "right" }}>
                    {plata(operacion.moneda, t.monto)}
                  </td>
                </tr>
              ))}
              <tr className="fila-total">
                <td>Total</td>
                <td />
                <td className="text-mono cel-valor" style={{ textAlign: "right" }}>
                  {plata(operacion.moneda, calculo.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doc-pie">
          {proyecto.iva === "exento"
            ? "Exento de IVA. Se cotiza y se cobra en USD oficial."
            : "Los importes no incluyen IVA."}
          {operacion.comentarios && <> {operacion.comentarios}</>}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
