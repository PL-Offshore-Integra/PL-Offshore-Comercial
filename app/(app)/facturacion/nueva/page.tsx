import Link from "next/link";
import FacturaForm, { type SalidaFacturable } from "@/components/FacturaForm";
import { crearFactura } from "@/app/(app)/facturacion/actions";
import { fechaConHoraSiTiene } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import type { Operacion, Proyecto } from "@/lib/types";

const plata = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
    maximumFractionDigits: 0,
  }).format(valor);

// Alta de factura. Siempre cuelga de un proyecto, asi que si no viene elegido
// la pantalla lo hace elegir primero: una factura sin proyecto no se sabe a
// quien se le cobra.
//
//   ?proyecto=<id>              el formulario, en blanco
//   ?proyecto=<id>&operacion=   el formulario con la salida ya elegida, que es
//                               como se llega desde "Pendiente de facturar"
export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string; operacion?: string; volver?: string }>;
}) {
  const { proyecto: proyectoId, operacion: operacionId, volver } = await searchParams;
  const supabase = await createClient();

  if (!proyectoId) {
    const { data } = await supabase
      .from("proyectos")
      .select("id, nro_proyecto, nombre, compania, buque, estado")
      .neq("estado", "cancelado")
      .order("created_at", { ascending: false });
    const proyectos = (data ?? []) as Pick<
      Proyecto,
      "id" | "nro_proyecto" | "nombre" | "compania" | "buque" | "estado"
    >[];

    return (
      <div>
        <div className="info-box accent mb16">
          Una factura cuelga de un proyecto: de ahi sale a quien se le cobra y
          con que condiciones. Elegi cual.
        </div>

        {proyectos.length === 0 ? (
          <div className="empty-state">
            Todavia no hay proyectos.{" "}
            <Link href="/proyectos/nuevo">
              <strong>Cargar uno</strong>
            </Link>
            .
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="tabla-lista">
                <thead>
                  <tr>
                    <th>Nro</th>
                    <th>Proyecto</th>
                    <th>Cliente</th>
                    <th>Buque</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {proyectos.map((p) => (
                    <tr key={p.id}>
                      <td className="text-mono cel-nro">{p.nro_proyecto ?? "-"}</td>
                      <td className="cel-compania">{p.nombre}</td>
                      <td>{p.compania ?? "-"}</td>
                      <td className="text-muted">{p.buque ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/facturacion/nueva?proyecto=${p.id}`}
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
          </div>
        )}
      </div>
    );
  }

  const { data } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", proyectoId)
    .maybeSingle();
  const proyecto = data as Proyecto | null;

  if (!proyecto) {
    return (
      <div className="info-box danger">
        No se encontro ningun proyecto con ese id.{" "}
        <Link href="/facturacion/nueva">
          <strong>Elegir uno de la lista</strong>
        </Link>
        .
      </div>
    );
  }

  // Las salidas del proyecto y cuales ya tienen factura, para no facturar dos
  // veces la misma sin darse cuenta.
  const [{ data: sal }, { data: fact }, { data: cliente }] = await Promise.all([
    supabase
      .from("operaciones")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .neq("estado", "cancelada")
      .order("fecha_inicio", { ascending: false, nullsFirst: false }),
    supabase.from("facturas").select("operacion_id").eq("proyecto_id", proyectoId),
    proyecto.cliente_empresa_id
      ? supabase
          .from("cliente_empresas")
          .select("dias_de_pago")
          .eq("id", proyecto.cliente_empresa_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const yaFacturadas = new Set(
    (fact ?? []).map((f) => f.operacion_id).filter((id): id is string => id !== null)
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

  const elegida = operacionId ? salidas.find((s) => s.id === operacionId) : undefined;
  const diasDePago = (cliente as { dias_de_pago: number | null } | null)?.dias_de_pago ?? null;

  return (
    <div>
      <div className="info-box accent mb16">
        Factura del proyecto <strong>{proyecto.nombre}</strong>
        {proyecto.compania && <> para {proyecto.compania}</>}.{" "}
        {elegida ? (
          <>
            Facturando la salida <strong>{elegida.nombre}</strong> —{" "}
            {fechaConHoraSiTiene(elegida.fecha_inicio)} a{" "}
            {fechaConHoraSiTiene(elegida.fecha_fin)}, {plata(elegida.moneda, elegida.valor)}.
          </>
        ) : (
          <>
            Si factura una salida puntual, elegila y los importes vienen solos.
            Si es una factura por periodo, dejala vacia.
          </>
        )}
      </div>

      <FacturaForm
        action={crearFactura}
        proyecto={proyecto}
        salidas={salidas}
        diasDePago={diasDePago}
        volverA={volver === "proyecto" ? "proyecto" : "facturacion"}
        operacionInicial={elegida?.id ?? null}
      />
    </div>
  );
}
