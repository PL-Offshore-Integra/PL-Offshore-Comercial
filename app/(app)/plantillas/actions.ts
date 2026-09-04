"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { estructuraValida } from "@/lib/types";

type Cliente = Awaited<ReturnType<typeof createClient>>;

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function numOrNull(valor: FormDataEntryValue | undefined): number | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

// Lo que el formulario de la plantilla puede escribir.
//
// El cliente son los dos FK directos y no pasa por `resolverCliente()`: una
// plantilla se arma con clientes que ya existen. Crear una empresa nueva desde
// aca seria crearla sin ninguna oportunidad ni proyecto que la justifique.
//
// `alcance` no esta: el casillero salio del formulario en 0026 —repetia lo que
// ya dice la descripcion— y la columna se deja con lo que tenga. Si la
// mandaramos igual, cada guardado borraria lo que hay en las filas viejas.
function fields(formData: FormData) {
  const nombre = str(formData, "nombre") ?? "";

  return {
    nombre,
    // Como se va a llamar el proyecto. Si no se completa, el nombre de la
    // plantilla: es lo que alguien iba a tipear igual.
    nombre_proyecto: str(formData, "nombre_proyecto") ?? nombre,
    descripcion: str(formData, "descripcion"),

    cliente_empresa_id: str(formData, "cliente_empresa_id"),
    cliente_contacto_id: str(formData, "cliente_contacto_id"),
    cliente_final: str(formData, "cliente_final"),

    buque: str(formData, "buque"),

    moneda: str(formData, "moneda") === "ARS" ? "ARS" : "USD",
    iva: str(formData, "iva") === "exento" ? "exento" : "21",
    estructura_tarifaria: estructuraValida(str(formData, "estructura_tarifaria")),

    // Un checkbox que no se marca no viaja en el FormData.
    activa: formData.get("activa") !== null,

    notas: str(formData, "notas"),
  };
}

export async function crearPlantilla(formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("La plantilla necesita un nombre.");

  const { data, error } = await supabase
    .from("plantillas")
    .insert(datos)
    .select("id")
    .single();
  if (error) throw new Error(mensajeDeError(error.message));

  await guardarTarifas(supabase, data.id, formData);

  revalidatePath("/plantillas");
  redirect("/plantillas");
}

export async function actualizarPlantilla(id: string, formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("La plantilla necesita un nombre.");

  const { error } = await supabase
    .from("plantillas")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(mensajeDeError(error.message));

  await guardarTarifas(supabase, id, formData);

  revalidatePath("/plantillas");
  revalidatePath(`/plantillas/${id}`);
  redirect("/plantillas");
}

export async function borrarPlantilla(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("plantillas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/plantillas");
  redirect("/plantillas");
}

// ------------------------------------------------------------
// El atajo: convertir un proyecto que ya funciona en plantilla
//
// Es como se van a crear casi todas. Cuando un proyecto esta bien cargado
// —cliente, buque, tipo de contratacion, tarifas— volver a tipear todo eso en
// un formulario de plantilla no tiene sentido: se copia.
// ------------------------------------------------------------
export async function plantillaDesdeProyecto(proyectoId: string) {
  const supabase = await createClient();

  const { data: p, error } = await supabase
    .from("proyectos")
    .select(
      "nombre, descripcion, buque, cliente_empresa_id, cliente_contacto_id, cliente_final, moneda, iva, estructura_tarifaria"
    )
    .eq("id", proyectoId)
    .single();
  if (error) throw new Error(error.message);

  // El nombre tiene que ser unico. Si ya hay una plantilla con el nombre del
  // proyecto se le agrega un sufijo en vez de fallar: la persona la renombra
  // despues si quiere.
  let nombre = p.nombre;
  const { data: choca } = await supabase
    .from("plantillas")
    .select("id")
    .ilike("nombre", nombre)
    .maybeSingle();
  if (choca) nombre = `${nombre} (${new Date().toISOString().slice(0, 10)})`;

  const { data: nueva, error: eIns } = await supabase
    .from("plantillas")
    .insert({
      nombre,
      // El nombre del proyecto es el del proyecto de origen, no el de la
      // plantilla: si a la plantilla hubo que ponerle un sufijo para que no
      // choque, el proyecto que salga de ella igual tiene que nacer con el
      // nombre bueno.
      nombre_proyecto: p.nombre,
      descripcion: p.descripcion,
      buque: p.buque,
      cliente_empresa_id: p.cliente_empresa_id,
      cliente_contacto_id: p.cliente_contacto_id,
      cliente_final: p.cliente_final,
      moneda: p.moneda,
      iva: p.iva,
      estructura_tarifaria: p.estructura_tarifaria,
    })
    .select("id")
    .single();
  if (eIns) throw new Error(mensajeDeError(eIns.message));

  // Y las tarifas, tal cual estan en el proyecto.
  const { data: tarifas } = await supabase
    .from("proyecto_tarifas")
    .select("concepto, detalle, unidad, monto, orden")
    .eq("proyecto_id", proyectoId)
    .order("orden", { ascending: true });

  if (tarifas?.length) {
    const { error: eTar } = await supabase
      .from("plantilla_tarifas")
      .insert(tarifas.map((t) => ({ ...t, plantilla_id: nueva.id })));
    if (eTar) throw new Error(eTar.message);
  }

  revalidatePath("/plantillas");
  redirect(`/plantillas/${nueva.id}`);
}

// ------------------------------------------------------------
// Tarifas · mismo criterio que en el resto: se borran y se reinsertan.
// ------------------------------------------------------------
async function guardarTarifas(supabase: Cliente, id: string, formData: FormData) {
  const conceptos = formData.getAll("tarifa_concepto");
  const unidades = formData.getAll("tarifa_unidad");
  const montos = formData.getAll("tarifa_monto");

  const filas = conceptos
    .map((concepto, i) => ({
      plantilla_id: id,
      concepto: String(concepto ?? "").trim(),
      unidad: String(unidades[i] ?? "global"),
      monto: numOrNull(montos[i]),
      orden: i,
    }))
    .filter((f) => f.concepto !== "" && f.monto !== null);

  const { error: eDel } = await supabase
    .from("plantilla_tarifas")
    .delete()
    .eq("plantilla_id", id);
  if (eDel) throw new Error(eDel.message);

  if (filas.length) {
    const { error } = await supabase.from("plantilla_tarifas").insert(filas);
    if (error) throw new Error(error.message);
  }
}

// El indice unico sobre el nombre da un error de Postgres que no le dice nada
// a nadie. Se traduce.
function mensajeDeError(mensaje: string): string {
  if (mensaje.includes("ux_com_plantilla_nombre")) {
    return "Ya hay una plantilla con ese nombre.";
  }
  return mensaje;
}
