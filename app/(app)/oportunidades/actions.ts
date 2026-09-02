"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function num(formData: FormData, key: string): number {
  const value = formData.get(key);
  const parsed = typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function numOrNull(valor: FormDataEntryValue | undefined): number | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function fields(formData: FormData) {
  return {
    compania: str(formData, "compania") ?? "",
    alcance_oportunidad: str(formData, "alcance_oportunidad"),
    descripcion_alcance: str(formData, "descripcion_alcance"),
    nro_oportunidad: str(formData, "nro_oportunidad"),
    contacto: str(formData, "contacto"),
    estadio: str(formData, "estadio") ?? "Investigando",
    valor: num(formData, "valor"),
    fecha_creacion: str(formData, "fecha_creacion") ?? new Date().toISOString().slice(0, 10),
    fecha_esperada_cierre: str(formData, "fecha_esperada_cierre"),
    last_interacted_on: str(formData, "last_interacted_on"),
    proximos_pasos: str(formData, "proximos_pasos"),
    notas: str(formData, "notas"),
    referencias: str(formData, "referencias"),
    // 0002
    cliente_final: str(formData, "cliente_final"),
    buque: str(formData, "buque"),
    estructura_tarifaria: str(formData, "estructura_tarifaria") ?? "diaria",
    // 0003
    contacto_email: str(formData, "contacto_email"),
    contacto_telefono: str(formData, "contacto_telefono"),
    fecha_inicio_estimada: str(formData, "fecha_inicio_estimada"),
    fecha_fin_estimada: str(formData, "fecha_fin_estimada"),
    // 0004
    contacto_linkedin: str(formData, "contacto_linkedin"),
  };
}

// Tres columnas NO estan en fields(), y las tres por el mismo motivo: el
// formulario dejo de pedirlas, y si las mandaramos igual borrarian lo que ya
// hay cada vez que alguien edita una fila vieja.
//
//   empresa          — se las pasaria a PL Offshore a las 16 filas que hoy son
//                      de Terra Mare, Clean Sea y HF Offshore. En el alta la
//                      resuelve el default de la tabla.
//   nombre_proyecto  — las filas del tracker original lo tienen cargado.
//   costo            — se saco del formulario; en el alta queda en 0 por
//                      default.

// El nro de oportunidad lo pone un trigger cuando llega vacio. En un alta el
// campo va de solo lectura, asi que nunca se manda; en una edicion se respeta
// lo que ya tiene.

// El estadio no se lleva a Ganado ni a Perdido desde el formulario comun:
// esos dos pasan por sus propias acciones, que son las que crean el proyecto
// o exigen el motivo. Si el form manda uno de esos valores, se ignora.
const ESTADIOS_CERRADOS = ["Ganado", "Perdido"];

export async function createOportunidad(formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (ESTADIOS_CERRADOS.includes(datos.estadio)) datos.estadio = "Propuesta Enviada";

  const { data, error } = await supabase
    .from("oportunidades")
    .insert(datos)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Los montos vienen en el mismo submit que la oportunidad: la persona
  // completa los casilleros que le muestra la estructura elegida y guarda una
  // sola vez.
  await guardarTarifas(supabase, data.id, formData);
  await registrarHistorial(supabase, data.id, null, datos.estadio, "Alta");

  revalidatePath("/oportunidades");
  // A la ficha, no a la lista: es donde se adjunta la documentacion, que
  // necesita que la oportunidad ya exista.
  redirect(`/oportunidades/${data.id}`);
}

export async function updateOportunidad(id: string, formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);

  const { data: previa } = await supabase
    .from("oportunidades")
    .select("estadio")
    .eq("id", id)
    .single();

  // Una oportunidad ya cerrada no se reabre desde el formulario comun.
  if (previa && ESTADIOS_CERRADOS.includes(previa.estadio)) {
    datos.estadio = previa.estadio;
  } else if (ESTADIOS_CERRADOS.includes(datos.estadio)) {
    datos.estadio = previa?.estadio ?? "Propuesta Enviada";
  }

  const { error } = await supabase.from("oportunidades").update(datos).eq("id", id);
  if (error) throw new Error(error.message);

  await guardarTarifas(supabase, id, formData);

  if (previa && previa.estadio !== datos.estadio) {
    await registrarHistorial(supabase, id, previa.estadio, datos.estadio, null);
  }

  revalidatePath("/oportunidades");
  redirect("/oportunidades");
}

export async function deleteOportunidad(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("oportunidades").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/oportunidades");
  redirect("/oportunidades");
}

// ------------------------------------------------------------
// Conceptos tarifarios
//
// Reemplazo completo: se borra y se reinserta. Son pocas filas y evita
// llevar la cuenta de cual se edito, cual se agrego y cual se saco.
// ------------------------------------------------------------

async function guardarTarifas(supabase: Cliente, id: string, formData: FormData) {
  const conceptos = formData.getAll("tarifa_concepto");
  const detalles = formData.getAll("tarifa_detalle");
  const unidades = formData.getAll("tarifa_unidad");
  const montos = formData.getAll("tarifa_monto");
  const cantidades = formData.getAll("tarifa_cantidad");
  const horas = formData.getAll("tarifa_horas");

  const filas = conceptos
    .map((concepto, i) => ({
      oportunidad_id: id,
      concepto: String(concepto ?? "").trim(),
      detalle: String(detalles[i] ?? "").trim() || null,
      unidad: String(unidades[i] ?? "global"),
      monto: numOrNull(montos[i]),
      cantidad: numOrNull(cantidades[i]),
      aplica_desde_horas: numOrNull(horas[i]),
      orden: i,
    }))
    .filter((f) => f.concepto !== "" && f.monto !== null);

  const { error: eDel } = await supabase
    .from("oportunidad_tarifas")
    .delete()
    .eq("oportunidad_id", id);
  if (eDel) throw new Error(eDel.message);

  if (filas.length) {
    const { error } = await supabase.from("oportunidad_tarifas").insert(filas);
    if (error) throw new Error(error.message);
  }
}

// ------------------------------------------------------------
// Cerrar la oportunidad
// ------------------------------------------------------------

// Ganar es solo ganar: marca el estadio y nada mas. NO crea el proyecto en
// public.proyectos.
//
// Antes lo creaba, y esa era la version del circuito Integra: ganar una
// oportunidad daba de alta el proyecto que despues leen Compras, Viveres,
// Reparaciones y Finanzas. Se saco por pedido explicito. La funcion que lo
// hacia —`ganarOportunidad`, con el insert a public.proyectos y el
// origen: "comercial"— esta en el historial de git; la columna proyecto_id y
// su foreign key siguen en la tabla, sin usar. Para volver atras hay que
// recuperar esa funcion y la regla opp_ganado_con_proyecto (ver 0008).
export async function marcarGanado(id: string) {
  const supabase = await createClient();

  const { data: previa } = await supabase
    .from("oportunidades")
    .select("estadio")
    .eq("id", id)
    .single();

  if (previa && ESTADIOS_CERRADOS.includes(previa.estadio)) {
    throw new Error("Esta oportunidad ya esta cerrada.");
  }

  const { error } = await supabase
    .from("oportunidades")
    .update({ estadio: "Ganado" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await registrarHistorial(supabase, id, previa?.estadio ?? null, "Ganado", null);

  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
}

// El motivo es obligatorio de este lado tambien, no solo en el cuadro de
// dialogo: el `required` del formulario lo puede saltear cualquiera, la regla
// opp_perdido_con_motivo de la base no.
export async function perderOportunidad(id: string, formData: FormData) {
  const supabase = await createClient();

  const motivo = str(formData, "motivo_perdida");
  if (!motivo) throw new Error("Para cerrar como perdida hace falta el motivo.");

  const { data: previa } = await supabase
    .from("oportunidades")
    .select("estadio")
    .eq("id", id)
    .single();

  if (previa && ESTADIOS_CERRADOS.includes(previa.estadio)) {
    throw new Error("Esta oportunidad ya esta cerrada.");
  }

  const { error } = await supabase
    .from("oportunidades")
    .update({
      estadio: "Perdido",
      motivo_perdida: motivo,
      competidor: str(formData, "competidor"),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await registrarHistorial(supabase, id, previa?.estadio ?? null, "Perdido", motivo);

  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
}

// ------------------------------------------------------------
// Documentacion adjunta
//
// El archivo va a un bucket privado; la fila guarda donde quedo. Nunca se
// expone un link publico: se firma una URL cuando alguien la pide.
// ------------------------------------------------------------

const MAX_ADJUNTO_BYTES = 25 * 1024 * 1024;

// Storage acepta un juego de caracteres acotado en las rutas. En vez de
// pelear con acentos y espacios, la ruta se arma con un uuid y el nombre
// original se guarda en la fila, que es lo que despues ve la persona.
function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  if (punto <= 0 || punto === nombre.length - 1) return "";
  const ext = nombre.slice(punto + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : "";
}

export async function subirAdjunto(id: string, formData: FormData) {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error("No se eligio ningun archivo.");
  }
  if (archivo.size > MAX_ADJUNTO_BYTES) {
    throw new Error("El archivo supera los 25 MB.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = `oportunidades/${id}/${crypto.randomUUID()}${extensionDe(archivo.name)}`;

  const { error: eUp } = await supabase.storage
    .from("comercial")
    .upload(path, archivo, { contentType: archivo.type || undefined, upsert: false });
  if (eUp) throw new Error(`No se pudo subir el archivo: ${eUp.message}`);

  const { error } = await supabase.from("oportunidad_adjuntos").insert({
    oportunidad_id: id,
    nombre: archivo.name,
    path,
    tipo: archivo.type || null,
    tamano_bytes: archivo.size,
    subido_por: user?.id ?? null,
  });
  if (error) {
    // Si la fila no entra, el archivo queda huerfano en el bucket. Lo sacamos.
    await supabase.storage.from("comercial").remove([path]);
    throw new Error(error.message);
  }

  revalidatePath(`/oportunidades/${id}`);
}

export async function borrarAdjunto(id: string, adjuntoId: string, path: string) {
  const supabase = await createClient();

  const { error: eDel } = await supabase
    .from("oportunidad_adjuntos")
    .delete()
    .eq("id", adjuntoId);
  if (eDel) throw new Error(eDel.message);

  // Si el borrado del archivo falla, la fila ya no esta y el bucket queda con
  // un huerfano: molesta menos que una fila que apunta a la nada.
  const { error } = await supabase.storage.from("comercial").remove([path]);
  if (error) console.error("No se pudo borrar el archivo del bucket:", error.message);

  revalidatePath(`/oportunidades/${id}`);
}

// ------------------------------------------------------------
// Historial
//
// El usuario sale de la sesion, no de un campo de texto. Si falla, no tumba
// la operacion: el historial es registro, no requisito.
// ------------------------------------------------------------

async function registrarHistorial(
  supabase: Cliente,
  oportunidadId: string,
  anterior: string | null,
  nuevo: string,
  nota: string | null
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("oportunidad_historial").insert({
    oportunidad_id: oportunidadId,
    estadio_anterior: anterior,
    estadio_nuevo: nuevo,
    nota,
    usuario_id: user?.id ?? null,
  });
  if (error) console.error("No se pudo registrar el historial:", error.message);
}
