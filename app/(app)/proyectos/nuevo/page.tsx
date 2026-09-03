import Link from "next/link";
import ProyectoForm from "@/components/ProyectoForm";
import { crearProyecto } from "@/app/(app)/proyectos/actions";
import { createClient } from "@/lib/supabase/server";
import type { Oportunidad, Tarifa } from "@/lib/types";

// Convertir una oportunidad ganada en proyecto. Llega desde el boton Ganado de
// la lista, o desde la ficha de una oportunidad ganada que todavia no tiene
// proyecto.
export default async function NuevoProyectoPage({
  searchParams,
}: {
  searchParams: Promise<{ oportunidad?: string }>;
}) {
  const { oportunidad: oportunidadId } = await searchParams;
  const supabase = await createClient();

  let oportunidad: Oportunidad | undefined;
  let tarifas: Tarifa[] = [];
  let yaConvertida = false;

  if (oportunidadId) {
    const { data } = await supabase
      .from("oportunidades")
      .select("*")
      .eq("id", oportunidadId)
      .single();
    oportunidad = (data ?? undefined) as Oportunidad | undefined;

    if (oportunidad) {
      const { data: filas } = await supabase
        .from("oportunidad_tarifas")
        .select("*")
        .eq("oportunidad_id", oportunidadId)
        .order("orden", { ascending: true });
      tarifas = (filas ?? []) as Tarifa[];

      const { data: existente } = await supabase
        .from("proyectos")
        .select("id")
        .eq("oportunidad_id", oportunidadId)
        .maybeSingle();
      yaConvertida = Boolean(existente);
    }
  }

  // El numero que sigue, igual que en oportunidades: lo que se ve es el
  // proximo y el definitivo lo pone la base al insertar.
  const { data: contador } = await supabase
    .from("proyecto_contador")
    .select("ultimo")
    .eq("anio", new Date().getFullYear())
    .maybeSingle();
  const nroQueSigue = `PRY-${(contador?.ultimo ?? 0) + 1}-${new Date().getFullYear()}`;

  if (!oportunidad) {
    return (
      <div className="info-box danger">
        Un proyecto nace de una oportunidad ganada, y no se encontro ninguna con
        ese id. Volve a{" "}
        <Link href="/oportunidades">
          <strong>Oportunidades</strong>
        </Link>{" "}
        y marca una como Ganado.
      </div>
    );
  }

  if (oportunidad.estadio !== "Ganado") {
    return (
      <div className="info-box warn">
        La oportunidad <strong>{oportunidad.nro_oportunidad}</strong> esta en{" "}
        {oportunidad.estadio}. Para convertirla en proyecto hay que marcarla{" "}
        <strong>Ganado</strong> desde la lista.
      </div>
    );
  }

  if (yaConvertida) {
    return (
      <div className="info-box accent">
        La oportunidad <strong>{oportunidad.nro_oportunidad}</strong> ya tiene un
        proyecto. Esta en{" "}
        <Link href="/proyectos">
          <strong>Proyectos</strong>
        </Link>
        .
      </div>
    );
  }

  return (
    <div>
      <div className="info-box accent mb16">
        Todo lo que sigue viene de la oportunidad{" "}
        <strong>{oportunidad.nro_oportunidad}</strong> y se puede corregir: lo
        cotizado casi nunca es exactamente lo que se firma. La oportunidad queda
        como estaba, con lo que se ofrecio.
      </div>

      <ProyectoForm
        action={crearProyecto}
        oportunidad={oportunidad}
        tarifas={tarifas}
        nroQueSigue={nroQueSigue}
      />
    </div>
  );
}
