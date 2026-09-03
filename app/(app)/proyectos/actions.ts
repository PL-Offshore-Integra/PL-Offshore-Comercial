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

// Lo que el formulario del proyecto puede escribir.
//
// El cliente NO esta aca: viene de la oportunidad y en el proyecto se muestra
// pero no se cambia. Cambiarle el cliente a un trabajo ya ganado no es una
// edicion, es otro trabajo.
function fields(formData: FormData) {
  return {
    nombre: str(formData, "nombre") ?? "",
    buque: str(formData, "buque"),
    descripcion: str(formData, "descripcion"),
    alcance: str(formData, "alcance"),

    fecha_inicio_estimada: str(formData, "fecha_inicio_estimada"),
    fecha_fin_estimada: str(formData, "fecha_fin_estimada"),
    fecha_inicio_real: str(formData, "fecha_inicio_real"),
    fecha_fin_real: str(formData, "fecha_fin_real"),

    moneda: str(formData, "moneda") ?? "USD",
    iva: str(formData, "iva") ?? "21",
    estructura_tarifaria: str(formData, "estructura_tarifaria") ?? "diaria",
    valor: num(formData, "valor"),

    estado: str(formData, "estado") ?? "por_arrancar",
    notas: str(formData, "notas"),
  };
}

// ------------------------------------------------------------
// Alta: convertir una oportunidad ganada en proyecto
// ------------------------------------------------------------
export async function crearProyecto(formData: FormData) {
  const supabase = await createClient();

  const oportunidadId = str(formData, "oportunidad_id");
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("El proyecto necesita un nombre.");

  // El cliente y el numero de la oportunidad se leen de la base, no del
  // formulario: son el origen del proyecto y no algo que se pueda tipear.
  let cliente = {};
  if (oportunidadId) {
    const { data: opp, error } = await supabase
      .from("oportunidades")
      .select("cliente_empresa_id, cliente_contacto_id, compania, contacto, estadio")
      .eq("id", oportunidadId)
      .single();
    if (error) throw new Error(error.message);
    if (opp.estadio !== "Ganado") {
      throw new Error("Solo una oportunidad ganada se convierte en proyecto.");
    }

    const { data: yaHay } = await supabase
      .from("proyectos")
      .select("id")
      .eq("oportunidad_id", oportunidadId)
      .maybeSingle();
    if (yaHay) throw new Error("Esta oportunidad ya tiene un proyecto.");

    cliente = {
      oportunidad_id: oportunidadId,
      cliente_empresa_id: opp.cliente_empresa_id,
      cliente_contacto_id: opp.cliente_contacto_id,
      compania: opp.compania,
      contacto: opp.contacto,
    };
  }

  const { data, error } = await supabase
    .from("proyectos")
    .insert({ ...datos, ...cliente })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await guardarTarifas(supabase, data.id, formData);

  revalidatePath("/proyectos");
  revalidatePath("/oportunidades");
  redirect(`/proyectos/${data.id}`);
}

export async function actualizarProyecto(id: string, formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("El proyecto necesita un nombre.");

  const { error } = await supabase
    .from("proyectos")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await guardarTarifas(supabase, id, formData);

  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${id}`);
  redirect("/proyectos");
}

export async function borrarProyecto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/proyectos");
  redirect("/proyectos");
}

// ------------------------------------------------------------
// Tarifas · mismo criterio que en oportunidades: se borran y se
// reinsertan, que son pocas filas y evita llevar la cuenta de cual se
// edito y cual se saco.
// ------------------------------------------------------------
async function guardarTarifas(supabase: Cliente, id: string, formData: FormData) {
  const conceptos = formData.getAll("tarifa_concepto");
  const detalles = formData.getAll("tarifa_detalle");
  const unidades = formData.getAll("tarifa_unidad");
  const montos = formData.getAll("tarifa_monto");

  const filas = conceptos
    .map((concepto, i) => ({
      proyecto_id: id,
      concepto: String(concepto ?? "").trim(),
      detalle: String(detalles[i] ?? "").trim() || null,
      unidad: String(unidades[i] ?? "global"),
      monto: numOrNull(montos[i]),
      orden: i,
    }))
    .filter((f) => f.concepto !== "" && f.monto !== null);

  const { error: eDel } = await supabase
    .from("proyecto_tarifas")
    .delete()
    .eq("proyecto_id", id);
  if (eDel) throw new Error(eDel.message);

  if (filas.length) {
    const { error } = await supabase.from("proyecto_tarifas").insert(filas);
    if (error) throw new Error(error.message);
  }
}

// ------------------------------------------------------------
// Documentacion · el contrato firmado y el resto
//
// Mismo bucket privado y misma mecanica que los adjuntos de oportunidad: la
// ruta se arma con un uuid y el nombre original queda en la fila.
// ------------------------------------------------------------
const MAX_ADJUNTO_BYTES = 25 * 1024 * 1024;

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  if (punto <= 0 || punto === nombre.length - 1) return "";
  const ext = nombre.slice(punto + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : "";
}

export async function subirAdjuntoProyecto(id: string, formData: FormData) {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error("No se eligio ningun archivo.");
  }
  if (archivo.size > MAX_ADJUNTO_BYTES) {
    throw new Error("El archivo supera los 25 MB.");
  }

  const clase = str(formData, "clase") === "contrato" ? "contrato" : "otro";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = `proyectos/${id}/${crypto.randomUUID()}${extensionDe(archivo.name)}`;

  const { error: eUp } = await supabase.storage
    .from("comercial")
    .upload(path, archivo, { contentType: archivo.type || undefined, upsert: false });
  if (eUp) throw new Error(`No se pudo subir el archivo: ${eUp.message}`);

  const { error } = await supabase.from("proyecto_adjuntos").insert({
    proyecto_id: id,
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

  revalidatePath(`/proyectos/${id}`);
}

export async function borrarAdjuntoProyecto(id: string, adjuntoId: string, path: string) {
  const supabase = await createClient();

  const { error: eDel } = await supabase
    .from("proyecto_adjuntos")
    .delete()
    .eq("id", adjuntoId);
  if (eDel) throw new Error(eDel.message);

  const { error } = await supabase.storage.from("comercial").remove([path]);
  if (error) console.error("No se pudo borrar el archivo del bucket:", error.message);

  revalidatePath(`/proyectos/${id}`);
}
