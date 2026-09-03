import Link from "next/link";
import ProyectoForm from "@/components/ProyectoForm";
import { crearProyecto } from "@/app/(app)/proyectos/actions";
import { leerMaestroClientes } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";
import { etiquetaEstado, type Oportunidad, type Tarifa } from "@/lib/types";

// Alta de proyecto, por los dos caminos:
//
//   con ?oportunidad=<id>   convertir una oportunidad adjudicada. Llega del
//                           desplegable de la lista, o de la ficha de una
//                           adjudicada sin proyecto. Todo viene
//                           precargado de la oportunidad.
//   sin parametro           un proyecto desde cero, con el cliente elegido
//                           del maestro. No todo trabajo pasa por el embudo
//                           comercial: hay clientes de anios, sin contrato
//                           firmado, donde el trabajo llega y arranca.
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

  // Se pidio convertir una oportunidad que no existe. Distinto de no pedir
  // ninguna, que es un proyecto desde cero y es un alta valida.
  if (oportunidadId && !oportunidad) {
    return (
      <div className="info-box danger">
        No se encontro ninguna oportunidad con ese id. Podes volver a{" "}
        <Link href="/oportunidades">
          <strong>Oportunidades</strong>
        </Link>{" "}
        y marcar una como adjudicada, o{" "}
        <Link href="/proyectos/nuevo">
          <strong>cargar el proyecto desde cero</strong>
        </Link>
        .
      </div>
    );
  }

  if (oportunidad && oportunidad.estado !== "adjudicado") {
    return (
      <div className="info-box warn">
        La oportunidad <strong>{oportunidad.nro_oportunidad}</strong> esta en{" "}
        {etiquetaEstado(oportunidad.estado).label.toLowerCase()}. Para
        convertirla en proyecto hay que marcarla{" "}
        <strong>Adjudicado</strong> desde la lista.
      </div>
    );
  }

  if (yaConvertida) {
    return (
      <div className="info-box accent">
        La oportunidad <strong>{oportunidad?.nro_oportunidad}</strong> ya tiene
        un proyecto. Esta en{" "}
        <Link href="/proyectos">
          <strong>Proyectos</strong>
        </Link>
        .
      </div>
    );
  }

  // El maestro de clientes solo se lee cuando el cliente se elige aca: en una
  // conversion viene de la oportunidad y no hay nada que elegir.
  const { empresas, contactos } = oportunidad
    ? { empresas: [], contactos: [] }
    : await leerMaestroClientes();

  return (
    <div>
      <div className="info-box accent mb16">
        {oportunidad ? (
          <>
            Todo lo que sigue viene de la oportunidad{" "}
            <strong>{oportunidad.nro_oportunidad}</strong> y se puede corregir:
            lo cotizado casi nunca es exactamente lo que se firma. La
            oportunidad queda como estaba, con lo que se ofrecio.
          </>
        ) : (
          <>
            Proyecto sin oportunidad de origen: se carga entero aca, con el
            cliente elegido del maestro. Es el caso del cliente de siempre,
            donde el trabajo llega sin pasar por una cotizacion. Si en cambio
            este trabajo salio de una propuesta, conviene{" "}
            <Link href="/oportunidades">
              <strong>marcar esa oportunidad como adjudicada</strong>
            </Link>{" "}
            y convertirla: asi queda registrado lo que se cotizo.
          </>
        )}
      </div>

      <ProyectoForm
        action={crearProyecto}
        oportunidad={oportunidad}
        tarifas={tarifas}
        nroQueSigue={nroQueSigue}
        empresas={empresas}
        contactos={contactos}
      />
    </div>
  );
}
