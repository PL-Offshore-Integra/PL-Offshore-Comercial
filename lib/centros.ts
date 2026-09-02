import { createClient } from "@/lib/supabase/server";
import type { CentroCosto } from "@/lib/types";

// El maestro de buques de PL Offshore es la tabla de centros de costo: en
// Xubio el centro de costo ES el buque (mas oficina y astillero). Por eso el
// desplegable de buque se alimenta de ahi en lugar de tener su propia lista,
// que es justo el problema que ya tienen otros modulos —cinco listas de
// buques distintas, una de ellas deducida de los datos cargados.
//
// La tabla vive en `public`, y el cliente de esta app apunta a `comercial`:
// hay que pedir el esquema explicitamente.
const EMPRESA = "Parana Logistica";

export async function listarCentrosCosto(): Promise<CentroCosto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("public")
    .from("centros_costo")
    .select("id, codigo, nombre, activo")
    .eq("empresa", EMPRESA)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    // Que no se caiga el alta de una oportunidad porque el maestro no
    // responde: el campo queda vacio y se puede completar despues.
    console.error("No se pudieron leer los centros de costo:", error.message);
    return [];
  }
  return (data ?? []) as CentroCosto[];
}
