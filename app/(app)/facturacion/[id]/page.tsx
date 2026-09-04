import Link from "next/link";
import { notFound } from "next/navigation";
import FacturaForm, { type SalidaFacturable } from "@/components/FacturaForm";
import { actualizarFactura, borrarFactura } from "@/app/(app)/facturacion/actions";
import { diasAlCobro } from "@/lib/facturas";
import { fechaLegible, hoyEnArgentina } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  difDeCambio,
  estadoDeFactura,
  etiquetaFactura,
  netoDeFactura,
  totalEnPesos,
  type Factura,
  type FacturaListada,
  type Operacion,
  type Proyecto,
} from "@/lib/types";

const plata = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);

export default async function FacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("facturas_listado")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const factura = data as FacturaListada;

  const { data: proy } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", factura.proyecto_id)
    .single();
  const proyecto = proy as Proyecto;

  const [{ data: sal }, { data: otras }, { data: cliente }] = await Promise.all([
    supabase
      .from("operaciones")
      .select("*")
      .eq("proyecto_id", factura.proyecto_id)
      .neq("estado", "cancelada")
      .order("fecha_inicio", { ascending: false, nullsFirst: false }),
    supabase
      .from("facturas")
      .select("operacion_id")
      .eq("proyecto_id", factura.proyecto_id)
      .neq("id", id),
    proyecto.cliente_empresa_id
      ? supabase
          .from("cliente_empresas")
          .select("dias_de_pago")
          .eq("id", proyecto.cliente_empresa_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const yaFacturadas = new Set(
    (otras ?? []).map((f) => f.operacion_id).filter((x): x is string => x !== null)
  );

  const salidas: SalidaFacturable[] = ((sal ?? []) as Operacion[]).map((o) => ({
    id: o.id,
    nro_operacion: o.nro_operacion,
    nombre: o.nombre,
    fecha_inicio: o.fecha_inicio,
    fecha_fin: o.fecha_fin,
    valor: Number(o.valor ?? 0),
    comision_total: Number(o.comision_total ?? 0),
    moneda: o.moneda,
    facturada: yaFacturadas.has(o.id),
  }));

  const hoy = hoyEnArgentina();
  const etiqueta = etiquetaFactura(estadoDeFactura(factura, hoy));
  const dias = diasAlCobro(factura);
  const pesos = totalEnPesos(factura as Factura);
  const dif = difDeCambio(factura as Factura);

  const guardar = actualizarFactura.bind(null, factura.id);
  const eliminar = borrarFactura.bind(null, factura.id);
  const diasDePago = (cliente as { dias_de_pago: number | null } | null)?.dias_de_pago ?? null;

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">
          {factura.nro_factura ?? "sin nro"} &middot;{" "}
          {plata(factura.moneda, netoDeFactura(factura))}
        </span>
        <div className="fila-acciones">
          <span className={`badge ${etiqueta.color}`}>{etiqueta.label}</span>
          <form action={eliminar}>
            <button type="submit" className="btn btn-danger btn-sm">
              Eliminar
            </button>
          </form>
        </div>
      </div>

      {/* Lo que la factura dice sin tener que abrir los casilleros. */}
      <div className="card">
        <div className="card-title">
          <span>
            {factura.nro_proyecto ?? "sin nro"} · {factura.proyecto}
          </span>
          <Link href={`/proyectos/${factura.proyecto_id}`} className="btn btn-ghost btn-sm">
            Ver el proyecto
          </Link>
        </div>
        <div className="form-grid">
          <div className="fg">
            <label>Emitida</label>
            <div className="dato">{fechaLegible(factura.fecha_emision)}</div>
          </div>
          <div className="fg">
            <label>Vence</label>
            <div className="dato">
              {factura.vencimiento ? fechaLegible(factura.vencimiento) : "—"}
            </div>
          </div>
          <div className="fg">
            <label>Cobrada</label>
            <div className="dato">
              {factura.cobro_fecha
                ? `${fechaLegible(factura.cobro_fecha)} en ${factura.cobro_moneda}`
                : "Todavia no"}
            </div>
            {dias !== null && (
              <span className="hint">
                {dias} dias desde que termino el trabajo
              </span>
            )}
          </div>
          {pesos !== null && (
            <div className="fg">
              <label>Entraron</label>
              <div className="dato">{plata("ARS", pesos)}</div>
              {dif !== null && (
                <span className="hint">
                  Diferencia de cambio: {dif > 0 ? "+" : ""}
                  {dif.toLocaleString("es-AR", { maximumFractionDigits: 4 })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <FacturaForm
        action={guardar}
        proyecto={proyecto}
        factura={factura}
        salidas={salidas}
        diasDePago={diasDePago}
      />
    </div>
  );
}
