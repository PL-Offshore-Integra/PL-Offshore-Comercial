"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_ZONA, type TipoZona } from "@/lib/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// Las coordenadas se aceptan con coma o con punto: en el teclado de aca el
// decimal es la coma, y "-38,78" no es un numero para JavaScript.
function grados(formData: FormData, key: string): number | null {
  const bruto = str(formData, key);
  if (bruto === null) return null;
  const n = Number(bruto.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function tipoValido(valor: string | null): TipoZona {
  return TIPOS_ZONA.some((t) => t.id === valor) ? (valor as TipoZona) : "otro";
}

// Media posicion no es posicion: la base lo exige (zonas_posicion_completa) y
// aca se avisa con palabras antes de que lo diga un error de Postgres.
function fields(formData: FormData) {
  const lat = grados(formData, "lat");
  const lon = grados(formData, "lon");

  if ((lat === null) !== (lon === null)) {
    throw new Error(
      "Hacen falta las dos coordenadas o ninguna. Una zona sin posicion sirve igual: lo unico que no puede es dibujarse en el mapa."
    );
  }
  if (lat !== null && (lat < -90 || lat > 90)) {
    throw new Error("La latitud va entre -90 y 90.");
  }
  if (lon !== null && (lon < -180 || lon > 180)) {
    throw new Error("La longitud va entre -180 y 180.");
  }

  return {
    nombre: str(formData, "nombre") ?? "",
    tipo: tipoValido(str(formData, "tipo")),
    lat,
    lon,
    notas: str(formData, "notas"),
    // Un checkbox que no se marca no viaja en el FormData.
    activa: formData.get("activa") !== null,
  };
}

// El indice unico es sobre lower(trim(nombre)), asi que el error de Postgres
// habla de un indice y no del nombre. Se traduce.
function mensajeDeError(mensaje: string): string {
  if (mensaje.includes("ux_com_zonas_nombre")) {
    return "Ya hay una zona con ese nombre. La idea es justamente que cada lugar tenga una sola fila: busca la que existe y corregila.";
  }
  return mensaje;
}

export async function crearZona(formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("La zona necesita un nombre.");

  const { error } = await supabase.from("zonas").insert(datos);
  if (error) throw new Error(mensajeDeError(error.message));

  revalidatePath("/zonas");
  revalidatePath("/mapa");
  redirect("/zonas");
}

export async function actualizarZona(id: string, formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("La zona necesita un nombre.");

  const { error } = await supabase
    .from("zonas")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(mensajeDeError(error.message));

  revalidatePath("/zonas");
  revalidatePath("/mapa");
  redirect("/zonas");
}

// Borrar una zona no borra los trabajos: el FK es `on delete set null`, asi
// que quedan sin lugar. Igual se avisa cuantos son antes, en la ficha.
//
// Para sacar una zona de circulacion sin perder la historia esta `activa`, que
// es casi siempre lo que se quiere.
export async function borrarZona(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("zonas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/zonas");
  revalidatePath("/mapa");
  redirect("/zonas");
}
