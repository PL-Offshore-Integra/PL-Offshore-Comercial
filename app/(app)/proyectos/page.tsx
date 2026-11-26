import Link from "next/link";
import ProyectosTabla, { type PlataDeFacturas } from "@/components/ProyectosTabla";
import { createClient } from "@/lib/supabase/server";
import { netoDeFactura, type FacturaListada, type ProyectoConOperaciones } from "@/lib/types";

export default async function ProyectosPage() {
  const supabase = await createClient();
  // Se lee la vista y no la tabla: trae de una lo que dicen las operaciones de
  // cada proyecto —cuantas, cuando arranco la primera, cuando termino la
  // ultima y cuanto suma lo ejecutado— sin una consulta por fila.
  const { data, error } = await supabase
    .from("proyectos_con_operaciones")
    .select("*")
    .order("created_at", { ascending: false });

  const proyectos = (data ?? []) as ProyectoConOperaciones[];

  // Las facturas de todos los proyectos en una sola consulta, para poder
  // mostrar en el listado lo facturado y lo cobrado. Son pocas —una por
  // factura emitida— asi que se traen enteras y se suman aca, con las mismas
  // reglas que usa la ficha: facturado es el importe, cobrado es el neto de
  // las que tienen moneda de cobro.
  const { data: fact } = await supabase
    .from("facturas_listado")
    .select("proyecto_id, importe, comision, cobro_moneda");
  const facturas = (fact ?? []) as Pick<
    FacturaListada,
    "proyecto_id" | "importe" | "comision" | "cobro_moneda"
  >[];

  const plataPorProyecto: Record<string, PlataDeFacturas> = {};
  for (const f of facturas) {
    if (!f.proyecto_id) continue;
    const acum = (plataPorProyecto[f.proyecto_id] ??= { facturado: 0, cobrado: 0 });
    acum.facturado += Number(f.importe ?? 0);
    if (f.cobro_moneda) acum.cobrado += netoDeFactura(f);
  }

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudieron leer los proyectos: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0018_operaciones.sql</span>.
        </div>
      )}

      {!error && proyectos.length === 0 && (
        <div className="empty-state">
          Todavia no hay proyectos. Un proyecto puede llegar por dos caminos:
          marcando una oportunidad como <strong>adjudicada</strong> en{" "}
          <Link href="/oportunidades">Oportunidades</Link>, o{" "}
          <Link href="/proyectos/nuevo">
            <strong>cargandolo desde cero</strong>
          </Link>{" "}
          cuando el trabajo no paso por una cotizacion.
        </div>
      )}

      {proyectos.length > 0 && (
        <ProyectosTabla proyectos={proyectos} facturas={plataPorProyecto} />
      )}
    </div>
  );
}
