import { notFound } from "next/navigation";
import OperacionForm from "@/components/OperacionForm";
import { crearOperacion } from "@/app/(app)/operaciones/actions";
import { createClient } from "@/lib/supabase/server";
import { leerZonas } from "@/lib/zonas";
import type { Proyecto, ProyectoTarifa } from "@/lib/types";

// Alta de una salida. Siempre cuelga de un proyecto: una operacion sin
// proyecto no existe, es una salida DE algo.
export default async function NuevaOperacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("proyectos").select("*").eq("id", id).single();
  if (!data) notFound();
  const proyecto = data as Proyecto;

  // Las tarifas del proyecto son el punto de partida de cada salida: en un
  // trabajo repetido —Service Management todos los meses— los numeros son
  // siempre los mismos y lo unico que cambia son las fechas. Se precargan y se
  // pueden pisar, porque una salida puntual puede tener otra tarifa.
  const { data: tar } = await supabase
    .from("proyecto_tarifas")
    .select("*")
    .eq("proyecto_id", id)
    .order("orden", { ascending: true });
  const tarifas = (tar ?? []) as ProyectoTarifa[];

  const anio = new Date().getFullYear();
  const { data: contador } = await supabase
    .from("operacion_contador")
    .select("ultimo")
    .eq("anio", anio)
    .maybeSingle();
  const nroQueSigue = `OP-${(contador?.ultimo ?? 0) + 1}-${anio}`;

  // La zona no se hereda del proyecto: es justo lo que cambia entre una salida
  // y otra. Arranca vacia y se elige, como en la planilla.
  const zonas = await leerZonas();

  return (
    <div>
      <div className="info-box accent mb16">
        Una salida del proyecto <strong>{proyecto.nombre}</strong>. Lo que no
        cambies se hereda del proyecto —buque, cliente final, moneda, IVA y tipo
        de contratacion— porque es lo habitual, pero entre una salida y otra
        puede cambiar cualquiera de esas cosas.
      </div>

      <OperacionForm
        action={crearOperacion}
        proyecto={proyecto}
        tarifas={tarifas}
        nroQueSigue={nroQueSigue}
        zonas={zonas}
      />
    </div>
  );
}
