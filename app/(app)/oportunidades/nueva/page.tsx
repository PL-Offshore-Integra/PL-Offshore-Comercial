import OportunidadForm from "@/components/OportunidadForm";
import { createOportunidad } from "@/app/(app)/oportunidades/actions";
import { leerMaestroClientes } from "@/lib/clientes";
import { leerZonas } from "@/lib/zonas";
import { createClient } from "@/lib/supabase/server";

// Para mostrar el numero antes de guardar hay que saber cuantas oportunidades
// lleva cada anio. Se lee en el servidor en cada visita —la pagina ya es
// dinamica porque el cliente de Supabase usa cookies—, asi el numero que se
// ve es el de este momento y no uno cacheado.
//
// Es lo que sigue, no una reserva: el numero definitivo lo pone la base al
// insertar. Reservarlo al abrir el formulario dejaria huecos cada vez que
// alguien entra y no guarda.
export default async function NuevaOportunidadPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("oportunidad_contador").select("anio, ultimo");

  // Si la lectura falla, se manda null y el formulario no muestra numero. Un
  // contador vacio y un contador ilegible se ven igual desde aca, y en el
  // segundo caso mostrar "Ploffshore-1" seria inventar.
  let contadores: Record<number, number> | null = null;
  if (!error) {
    contadores = {};
    for (const fila of data ?? []) contadores[fila.anio] = fila.ultimo;
  }

  const [{ empresas, contactos }, zonas] = await Promise.all([
    leerMaestroClientes(),
    leerZonas(),
  ]);

  return (
    <OportunidadForm
      action={createOportunidad}
      contadores={contadores}
      empresas={empresas}
      contactos={contactos}
      zonas={zonas}
    />
  );
}
