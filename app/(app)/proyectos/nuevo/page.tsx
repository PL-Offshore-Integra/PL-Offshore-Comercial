import Link from "next/link";
import ProyectoForm from "@/components/ProyectoForm";
import { crearProyecto } from "@/app/(app)/proyectos/actions";
import { leerMaestroClientes } from "@/lib/clientes";
import { leerZonasPara } from "@/lib/zonas";
import { createClient } from "@/lib/supabase/server";
import {
  etiquetaEstado,
  type Oportunidad,
  type Plantilla,
  type PlantillaListada,
  type PlantillaTarifa,
  type Tarifa,
} from "@/lib/types";

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
  searchParams: Promise<{ oportunidad?: string; plantilla?: string }>;
}) {
  const { oportunidad: oportunidadId, plantilla: plantillaId } = await searchParams;
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

  // La plantilla: el punto de partida cuando el trabajo se repite. No aplica
  // en una conversion, donde todo viene de la oportunidad.
  let plantilla: Plantilla | undefined;
  let tarifasPlantilla: PlantillaTarifa[] = [];
  if (!oportunidad && plantillaId) {
    const { data } = await supabase
      .from("plantillas")
      .select("*")
      .eq("id", plantillaId)
      .single();
    plantilla = (data ?? undefined) as Plantilla | undefined;

    if (plantilla) {
      const { data: tp } = await supabase
        .from("plantilla_tarifas")
        .select("*")
        .eq("plantilla_id", plantillaId)
        .order("orden", { ascending: true });
      tarifasPlantilla = (tp ?? []) as PlantillaTarifa[];
    }
  }

  // Las que se pueden ofrecer, solo cuando todavia no se eligio ninguna.
  let disponibles: PlantillaListada[] = [];
  if (!oportunidad && !plantilla) {
    const { data } = await supabase
      .from("plantillas_listado")
      .select("*")
      .eq("activa", true)
      .order("nombre", { ascending: true });
    disponibles = (data ?? []) as PlantillaListada[];
  }

  // El maestro de clientes solo se lee cuando el cliente se elige aca: en una
  // conversion viene de la oportunidad y no hay nada que elegir.
  const { empresas, contactos } = oportunidad
    ? { empresas: [], contactos: [] }
    : await leerMaestroClientes();

  // El maestro de zonas si se lee siempre: el lugar se elige aca en los dos
  // caminos. En una conversion viene propuesto de la oportunidad, y se incluye
  // esa zona aunque este retirada.
  const zonas = await leerZonasPara(oportunidad?.zona_id);

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
        ) : plantilla ? (
          <>
            Arrancando desde la plantilla{" "}
            <strong>{plantilla.nombre}</strong>: el cliente, el buque, el tipo
            de contratacion y las tarifas vienen cargados y se pueden corregir.
            Lo que quede guardado vive en el proyecto, asi que despues cambiar
            la plantilla no lo toca.{" "}
            <Link href="/proyectos/nuevo">
              <strong>Cargar en blanco</strong>
            </Link>
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

      {/* Las plantillas de trabajos que se repiten. Se ofrecen antes del
          formulario porque elegir una cambia lo que el formulario muestra. */}
      {disponibles.length > 0 && (
        <div className="card">
          <div className="card-title">
            <span>Arrancar desde una plantilla</span>
            <Link href="/plantillas" className="btn btn-ghost btn-sm">
              Administrar
            </Link>
          </div>
          <div className="fila-plantillas">
            {disponibles.map((pl) => (
              <Link
                key={pl.id}
                href={`/proyectos/nuevo?plantilla=${pl.id}`}
                className="plantilla-chip"
              >
                <strong>{pl.nombre}</strong>
                <span className="text-muted">
                  {[pl.compania, pl.buque].filter(Boolean).join(" · ") ||
                    "sin cliente ni buque fijo"}
                </span>
              </Link>
            ))}
          </div>
          <span className="hint">
            O segui abajo y carga el proyecto en blanco.
          </span>
        </div>
      )}

      {/* La key fuerza a React a rehacer el formulario cuando cambia la
          plantilla elegida. Elegir una navega a esta misma ruta con otro query
          string, asi que sin la key React reusa el componente y los `useState`
          —el tipo de contratacion y la empresa del cliente— se quedan con los
          valores del render anterior. Eso daba un sintoma confuso: el buque y
          el cliente final llegaban, porque se calculan en cada render, y el
          tipo de contratacion no. */}
      <ProyectoForm
        key={plantilla?.id ?? "en-blanco"}
        action={crearProyecto}
        oportunidad={oportunidad}
        tarifas={oportunidad ? tarifas : tarifasPlantilla}
        plantilla={plantilla}
        nroQueSigue={nroQueSigue}
        empresas={empresas}
        contactos={contactos}
        zonas={zonas}
      />
    </div>
  );
}
