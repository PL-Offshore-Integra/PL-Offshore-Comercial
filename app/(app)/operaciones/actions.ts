"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aTimestamp } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  calcularValor,
  diasDeOperacion,
  estructuraValida,
  type Concepto,
} from "@/lib/types";

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

// El <input type="datetime-local"> manda "aaaa-mm-ddThh:mm" sin zona, y sin
// zona Postgres asume UTC: 07:00 se guardaba como 07:00 UTC y el navegador la
// mostraba como 04:00. La zona la fija `aTimestamp`, en un solo lugar.
function fechaHora(formData: FormData, key: string): string | null {
  return aTimestamp(str(formData, key));
}

// El valor de la salida no se toma del formulario: se recalcula con la misma
// funcion que usa la pantalla para mostrarlo en vivo. Asi lo que se ve y lo
// que se guarda no pueden separarse, y un valor mandado a mano no entra.
//
// Los dias tampoco se escriben: salen de las dos fechas con sus horas, que es
// lo que hace que una salida de 29 horas se cobre como 1.21 dias.
function valorDeLaSalida(formData: FormData, inicio: string | null, fin: string | null): number {
  const tipo = estructuraValida(str(formData, "estructura_tarifaria"));
  const dias = diasDeOperacion(inicio, fin);

  const conceptos = formData.getAll("tarifa_concepto");
  const montos = formData.getAll("tarifa_monto");
  const mapa: Partial<Record<Concepto, number>> = {};
  conceptos.forEach((c, i) => {
    const concepto = String(c ?? "").trim() as Concepto;
    if (concepto) mapa[concepto] = numOrNull(montos[i]) ?? 0;
  });

  return calcularValor(tipo, mapa, dias);
}

// Lo que el formulario de la operacion puede escribir.
//
// `proyecto_id` no esta aca: se fija al crear y no se cambia despues. Mover
// una salida a otro proyecto no es una edicion, es otra salida.
function fields(formData: FormData) {
  const inicio = fechaHora(formData, "fecha_inicio");
  const fin = fechaHora(formData, "fecha_fin");

  return {
    nombre: str(formData, "nombre") ?? "",
    buque: str(formData, "buque"),
    cliente_final: str(formData, "cliente_final"),
    zona: str(formData, "zona"),
    buque_madre: str(formData, "buque_madre"),

    fecha_inicio: inicio,
    fecha_fin: fin,

    moneda: str(formData, "moneda") === "ARS" ? "ARS" : "USD",
    iva: str(formData, "iva") === "exento" ? "exento" : "21",
    estructura_tarifaria: estructuraValida(str(formData, "estructura_tarifaria")),
    valor: valorDeLaSalida(formData, inicio, fin),

    estado: str(formData, "estado") ?? "planificada",
    comentarios: str(formData, "comentarios"),
  };
}

export async function crearOperacion(formData: FormData) {
  const supabase = await createClient();

  const proyectoId = str(formData, "proyecto_id");
  if (!proyectoId) throw new Error("La operacion necesita un proyecto.");

  const datos = fields(formData);
  if (!datos.nombre) throw new Error("La operacion necesita un nombre.");
  if (datos.fecha_inicio && datos.fecha_fin && datos.fecha_fin <= datos.fecha_inicio) {
    throw new Error("La fecha de fin tiene que ser posterior a la de inicio.");
  }

  // Que el proyecto exista se valida contra la base: el id viene de un campo
  // oculto del formulario.
  const { error: eProy } = await supabase
    .from("proyectos")
    .select("id")
    .eq("id", proyectoId)
    .single();
  if (eProy) throw new Error("No se encontro el proyecto de la operacion.");

  const { data, error } = await supabase
    .from("operaciones")
    .insert({ ...datos, proyecto_id: proyectoId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await guardarTarifas(supabase, data.id, formData);

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${proyectoId}`);
  redirect(`/proyectos/${proyectoId}/operaciones/${data.id}`);
}

export async function actualizarOperacion(id: string, formData: FormData) {
  const supabase = await createClient();

  const datos = fields(formData);
  if (!datos.nombre) throw new Error("La operacion necesita un nombre.");
  if (datos.fecha_inicio && datos.fecha_fin && datos.fecha_fin <= datos.fecha_inicio) {
    throw new Error("La fecha de fin tiene que ser posterior a la de inicio.");
  }

  const { data: previa, error: eLeer } = await supabase
    .from("operaciones")
    .select("proyecto_id")
    .eq("id", id)
    .single();
  if (eLeer) throw new Error(eLeer.message);

  const { error } = await supabase
    .from("operaciones")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await guardarTarifas(supabase, id, formData);

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${previa.proyecto_id}`);
  redirect(`/proyectos/${previa.proyecto_id}`);
}

export async function borrarOperacion(id: string) {
  const supabase = await createClient();

  const { data: previa, error: eLeer } = await supabase
    .from("operaciones")
    .select("proyecto_id")
    .eq("id", id)
    .single();
  if (eLeer) throw new Error(eLeer.message);

  const { error } = await supabase.from("operaciones").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${previa.proyecto_id}`);
  redirect(`/proyectos/${previa.proyecto_id}`);
}

// ------------------------------------------------------------
// Tarifas · mismo criterio que en oportunidades y proyectos: se borran y
// se reinsertan, que son pocas filas y evita llevar la cuenta de cual se
// edito y cual se saco.
// ------------------------------------------------------------
async function guardarTarifas(supabase: Cliente, id: string, formData: FormData) {
  const conceptos = formData.getAll("tarifa_concepto");
  const detalles = formData.getAll("tarifa_detalle");
  const unidades = formData.getAll("tarifa_unidad");
  const montos = formData.getAll("tarifa_monto");

  const filas = conceptos
    .map((concepto, i) => ({
      operacion_id: id,
      concepto: String(concepto ?? "").trim(),
      detalle: String(detalles[i] ?? "").trim() || null,
      unidad: String(unidades[i] ?? "global"),
      monto: numOrNull(montos[i]),
      orden: i,
    }))
    .filter((f) => f.concepto !== "" && f.monto !== null);

  const { error: eDel } = await supabase
    .from("operacion_tarifas")
    .delete()
    .eq("operacion_id", id);
  if (eDel) throw new Error(eDel.message);

  if (filas.length) {
    const { error } = await supabase.from("operacion_tarifas").insert(filas);
    if (error) throw new Error(error.message);
  }
}

// ------------------------------------------------------------
// Documentacion de la salida
//
// Mismo bucket privado y misma mecanica que el resto. `clase` separa los dos
// documentos que se le mandan al cliente por cada salida: el calculo de la
// tarifa y el statement of facts.
// ------------------------------------------------------------
const MAX_ADJUNTO_BYTES = 25 * 1024 * 1024;

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  if (punto <= 0 || punto === nombre.length - 1) return "";
  const ext = nombre.slice(punto + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : "";
}

export async function subirAdjuntoOperacion(id: string, formData: FormData) {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error("No se eligio ningun archivo.");
  }
  if (archivo.size > MAX_ADJUNTO_BYTES) {
    throw new Error("El archivo supera los 25 MB.");
  }

  const pedida = str(formData, "clase");
  const clase = pedida === "calculo" || pedida === "sof" ? pedida : "otro";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = `operaciones/${id}/${crypto.randomUUID()}${extensionDe(archivo.name)}`;

  const { error: eUp } = await supabase.storage
    .from("comercial")
    .upload(path, archivo, { contentType: archivo.type || undefined, upsert: false });
  if (eUp) throw new Error(`No se pudo subir el archivo: ${eUp.message}`);

  const { error } = await supabase.from("operacion_adjuntos").insert({
    operacion_id: id,
    clase,
    nombre: archivo.name,
    path,
    tipo: archivo.type || null,
    tamano_bytes: archivo.size,
    subido_por: user?.id ?? null,
  });
  if (error) {
    await supabase.storage.from("comercial").remove([path]);
    throw new Error(error.message);
  }

  revalidatePath(`/proyectos`);
}

export async function borrarAdjuntoOperacion(adjuntoId: string, path: string) {
  const supabase = await createClient();

  const { error: eDel } = await supabase
    .from("operacion_adjuntos")
    .delete()
    .eq("id", adjuntoId);
  if (eDel) throw new Error(eDel.message);

  const { error } = await supabase.storage.from("comercial").remove([path]);
  if (error) console.error("No se pudo borrar el archivo del bucket:", error.message);

  revalidatePath(`/proyectos`);
}
