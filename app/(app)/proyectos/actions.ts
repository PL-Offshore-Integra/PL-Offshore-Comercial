"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolverCliente } from "@/lib/clienteResolver";
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
// El cliente NO esta aca, y sale de dos lugares distintos segun el origen del
// proyecto: si vino de una oportunidad se copia de ella y despues no se
// cambia, y si se cargo desde cero lo resuelve `resolverCliente()` con lo que
// eligio el desplegable. Ver `clienteDelProyecto()`.
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

// De donde sale el cliente del proyecto, segun su origen.
//
//   Con oportunidad  se copia de ella, leida de la base y no del formulario:
//                    es el origen del proyecto y no algo que se pueda tipear.
//                    Ademas se valida que este ganada y que no tenga ya un
//                    proyecto.
//   Sin oportunidad  lo resuelve el maestro de clientes, igual que en una
//                    oportunidad nueva: la empresa puede ser una existente o
//                    una que se crea en el momento.
//
// El segundo caso existe porque no todo trabajo pasa por el embudo comercial.
// Hay clientes con los que se viene trabajando desde hace anios y sin contrato
// firmado: cuando llega el trabajo no hay ninguna oportunidad que ganar, hay
// un proyecto que arranca.
async function clienteDelProyecto(
  supabase: Cliente,
  oportunidadId: string | null,
  formData: FormData
) {
  if (!oportunidadId) {
    const c = await resolverCliente(supabase, formData);
    // La tabla de proyectos guarda solo la compania y el nombre del contacto;
    // el mail y el telefono viven en el maestro de clientes.
    return {
      oportunidad_id: null,
      cliente_empresa_id: c.cliente_empresa_id,
      cliente_contacto_id: c.cliente_contacto_id,
      compania: c.compania,
      contacto: c.contacto,
    };
  }

  const { data: opp, error } = await supabase
    .from("oportunidades")
    .select("cliente_empresa_id, cliente_contacto_id, compania, contacto, estado")
    .eq("id", oportunidadId)
    .single();
  if (error) throw new Error(error.message);

  // Se valida contra `estado` y no contra `estadio`: los nueve estadios
  // quedaron atras en 0013 y la app no los escribe mas, asi que la version
  // vieja de este chequeo rechazaba toda oportunidad ganada. Desde 0016 el
  // valor es 'adjudicado'.
  if (opp.estado !== "adjudicado") {
    throw new Error("Solo una oportunidad adjudicada se convierte en proyecto.");
  }

  const { data: yaHay } = await supabase
    .from("proyectos")
    .select("id")
    .eq("oportunidad_id", oportunidadId)
    .maybeSingle();
  if (yaHay) throw new Error("Esta oportunidad ya tiene un proyecto.");

  return {
    oportunidad_id: oportunidadId,
    cliente_empresa_id: opp.cliente_empresa_id,
    cliente_contacto_id: opp.cliente_contacto_id,
    compania: opp.compania,
    contacto: opp.contacto,
  };
}

// ------------------------------------------------------------
// Alta: desde una oportunidad ganada, o desde cero
// ------------------------------------------------------------
export async function crearProyecto(formData: FormData) {
  const supabase = await createClient();

  const oportunidadId = str(formData, "oportunidad_id");
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("El proyecto necesita un nombre.");

  const cliente = await clienteDelProyecto(supabase, oportunidadId, formData);

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

  // El cliente solo se toca en un proyecto sin oportunidad de origen. Si hay
  // origen, el cliente se corrige en la oportunidad y de ahi baja; editarlo
  // aca dejaria las dos pantallas diciendo cosas distintas.
  //
  // El origen se lee de la base y no del formulario, que es lo que hace que
  // esto sea una regla y no una sugerencia: un POST armado a mano no puede
  // cambiarle el cliente a un proyecto que vino de una oportunidad.
  const { data: actual, error: eLeer } = await supabase
    .from("proyectos")
    .select("oportunidad_id")
    .eq("id", id)
    .single();
  if (eLeer) throw new Error(eLeer.message);

  const cliente = actual.oportunidad_id
    ? {}
    : await clienteDelProyecto(supabase, null, formData);

  const { error } = await supabase
    .from("proyectos")
    .update({ ...datos, ...cliente, updated_at: new Date().toISOString() })
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
