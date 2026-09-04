import { createClient } from "@/lib/supabase/server";
import type { Zona } from "@/lib/types";

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
