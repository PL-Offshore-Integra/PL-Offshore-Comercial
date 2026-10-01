import { createClient } from "@/lib/supabase/server";
import { TIPOS_ZONA, type Zona } from "@/lib/types";

// El maestro de zonas para los desplegables. Son veinte filas, asi que se
// leen todas de una y se ordenan por nombre.
//
// `soloActivas` es el default: una zona retirada no se ofrece al cargar un
// trabajo nuevo. El mapa, en cambio, las pide todas — un trabajo viejo puede
// estar en una zona que hoy no se usa mas, y ese punto tiene que seguir
// apareciendo.
export async function leerZonas(soloActivas = true): Promise<Zona[]> {
  const supabase = await createClient();

  let consulta = supabase.from("zonas").select("*").order("nombre", { ascending: true });
  if (soloActivas) consulta = consulta.eq("activa", true);

  const { data } = await consulta;
  return (data ?? []) as Zona[];
}

// La zona de un trabajo puede ser una que ya se retiro: en ese caso hay que
// ofrecerla igual, o guardar el formulario sin tocarla la borraria.
export async function leerZonasPara(zonaId: string | null | undefined): Promise<Zona[]> {
  const activas = await leerZonas();
  if (!zonaId || activas.some((z) => z.id === zonaId)) return activas;

  const supabase = await createClient();
  const { data } = await supabase.from("zonas").select("*").eq("id", zonaId).maybeSingle();
  const suya = data as Zona | null;

  return suya ? [...activas, suya].sort((a, b) => a.nombre.localeCompare(b.nombre)) : activas;
}

// Resuelve la zona que eligio un formulario y, si vino nueva, la crea.
//
// Vive aca y no dentro de las acciones de oportunidades porque el mismo
// desplegable lo usan las tres pantallas que ubican un trabajo: oportunidad,
// proyecto y salida. Una sola copia significa que las tres crean los lugares
// con el mismo criterio.
//
// La zona nueva nace sin coordenadas, a proposito: el que esta cargando una
// oportunidad no tiene la posicion a mano y pedirsela seria volver al
// problema que esto resuelve. Queda "sin ubicar" y el mapa la ignora hasta
// que alguien la complete en Zonas.
//
// Un lugar "nuevo" que ya existe con ese nombre no se duplica: se reusa. El
// indice unico de 0025 es sobre lower(trim(nombre)), asi que "las toninas" y
// "Las Toninas " son la misma, y mandar el insert igual seria un error en la
// cara del que esta guardando.
export async function resolverZona(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<{ zona_id: string | null }> {
  const elegida = formData.get("zona_id");
  const zonaId = typeof elegida === "string" && elegida.trim() !== "" ? elegida.trim() : null;
  if (zonaId !== "nueva") return { zona_id: zonaId };

  const crudo = formData.get("zona_nueva_nombre");
  const nombre = typeof crudo === "string" ? crudo.trim() : "";
  if (!nombre) throw new Error("El lugar nuevo necesita un nombre.");

  const pedido = formData.get("zona_nueva_tipo");
  const tipo = TIPOS_ZONA.some((t) => t.id === pedido) ? (pedido as Zona["tipo"]) : "puerto";

  const { data: existente } = await supabase
    .from("zonas")
    .select("id")
    .ilike("nombre", nombre)
    .maybeSingle();
  if (existente) return { zona_id: existente.id };

  const { data, error } = await supabase
    .from("zonas")
    .insert({ nombre, tipo })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear el lugar: ${error.message}`);

  return { zona_id: data.id };
}
