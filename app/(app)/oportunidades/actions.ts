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

// Resuelve el cliente que eligio el formulario y, si vino nuevo, lo crea.
//
// Devuelve lo que hay que guardar en la oportunidad: los dos FK y la foto de
// texto. La foto no es redundancia por comodidad: es el nombre con el que se
// cargo esta oportunidad, y si manana la empresa se renombra, las viejas
// conservan el suyo.
//
// Una empresa "nueva" que ya existe con ese nombre no se duplica: se reusa. El
// indice unico de 0009 es sobre lower(trim(nombre)), asi que "excelerate" y
// "Excelerate " son la misma.
async function resolverCliente(supabase: Cliente, formData: FormData) {
  let empresaId = str(formData, "cliente_empresa_id");
  let contactoId = str(formData, "cliente_contacto_id");

  if (empresaId === "nueva") {
    const nombre = str(formData, "empresa_nueva");
    if (!nombre) throw new Error("La empresa nueva necesita un nombre.");

    const { data: existente } = await supabase
      .from("cliente_empresas")
      .select("id")
      .ilike("nombre", nombre)
      .maybeSingle();

    if (existente) {
      empresaId = existente.id;
    } else {
      const { data, error } = await supabase
        .from("cliente_empresas")
        .insert({ nombre })
        .select("id")
        .single();
      if (error) throw new Error(`No se pudo crear la empresa: ${error.message}`);
      empresaId = data.id;
    }
  }

  if (!empresaId) throw new Error("Hay que elegir la empresa del cliente.");

  if (contactoId === "nuevo") {
    const nuevo = {
      empresa_id: empresaId,
      nombre: str(formData, "contacto_nuevo_nombre"),
      email: str(formData, "contacto_nuevo_email"),
      telefono: str(formData, "contacto_nuevo_telefono"),
      linkedin: str(formData, "contacto_nuevo_linkedin"),
    };
    // Sin nombre, ni mail, ni telefono no hay contacto que crear: la base lo
    // rechaza igual (cliente_contacto_algo_cargado), pero conviene decirlo
    // antes y no con un error de constraint.
    if (!nuevo.nombre && !nuevo.email && !nuevo.telefono) {
      throw new Error("El contacto nuevo necesita al menos nombre, mail o telefono.");
    }

    const { data, error } = await supabase
      .from("cliente_contactos")
      .insert(nuevo)
      .select("id")
      .single();
    if (error) throw new Error(`No se pudo crear el contacto: ${error.message}`);
    contactoId = data.id;
  }

  const { data: empresa } = await supabase
    .from("cliente_empresas")
    .select("nombre")
    .eq("id", empresaId)
    .single();

  const { data: contacto } = contactoId
    ? await supabase
        .from("cliente_contactos")
        .select("nombre, email, telefono, linkedin")
        .eq("id", contactoId)
        .single()
    : { data: null };

  return {
    cliente_empresa_id: empresaId,
    cliente_contacto_id: contactoId,
    compania: empresa?.nombre ?? "",
    contacto: contacto?.nombre ?? null,
    contacto_email: contacto?.email ?? null,
    contacto_telefono: contacto?.telefono ?? null,
    contacto_linkedin: contacto?.linkedin ?? null,
  };
}

function fields(formData: FormData) {
  return {
    alcance_oportunidad: str(formData, "alcance_oportunidad"),
    descripcion_alcance: str(formData, "descripcion_alcance"),
    nro_oportunidad: str(formData, "nro_oportunidad"),
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
    fecha_inicio_estimada: str(formData, "fecha_inicio_estimada"),
    fecha_fin_estimada: str(formData, "fecha_fin_estimada"),
  };
}

// El cliente no esta en fields(): sale de resolverCliente(), que puede tener
// que crear la empresa o el contacto antes de poder devolver los FK. De ahi
// vienen compania, contacto, contacto_email, contacto_telefono y
// contacto_linkedin, mas los dos cliente_*_id.

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
  const cliente = await resolverCliente(supabase, formData);
  const datos = { ...fields(formData), ...cliente };
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

  // La documentacion tambien puede venir en el alta. Se sube despues del
  // insert porque el archivo se cuelga de la oportunidad, que hasta hace un
  // renglon no existia. Si no viene ninguno, no pasa nada.
  const archivos = formData
    .getAll("archivo")
    .filter((a): a is File => a instanceof File && a.size > 0);
  for (const archivo of archivos) {
    await guardarAdjunto(supabase, data.id, archivo);
  }

  await registrarHistorial(supabase, data.id, null, datos.estadio, "Alta");

  revalidatePath("/oportunidades");
  // A la ficha, no a la lista: es donde se adjunta la documentacion, que
  // necesita que la oportunidad ya exista.
  redirect(`/oportunidades/${data.id}`);
}

export async function updateOportunidad(id: string, formData: FormData) {
  const supabase = await createClient();
  const cliente = await resolverCliente(supabase, formData);
  const datos = { ...fields(formData), ...cliente };

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

// Volver atras un cierre.
//
// El estadio no vuelve a un valor fijo: sale del historial. La ultima entrada
// guarda de donde venia la oportunidad cuando se cerro, asi que reabrir la
// devuelve a ese estadio y no a uno inventado. Si no hay historial —una fila
// cerrada desde la base, por ejemplo— cae en Propuesta Enviada.
//
// Al reabrir una perdida se limpian motivo y competidor: quedarian
// describiendo un cierre que ya no existe. No se pierden, siguen en la nota
// del historial.
export async function reabrirOportunidad(id: string) {
  const supabase = await createClient();

  const { data: opp, error: eOpp } = await supabase
    .from("oportunidades")
    .select("estadio, motivo_perdida, competidor")
    .eq("id", id)
    .single();
  if (eOpp) throw new Error(eOpp.message);
  if (!ESTADIOS_CERRADOS.includes(opp.estadio)) {
    throw new Error("Esta oportunidad no esta cerrada.");
  }

  const { data: ultima } = await supabase
    .from("oportunidad_historial")
    .select("estadio_anterior")
    .eq("oportunidad_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const vuelveA =
    ultima?.estadio_anterior && !ESTADIOS_CERRADOS.includes(ultima.estadio_anterior)
      ? ultima.estadio_anterior
      : "Propuesta Enviada";

  const { error } = await supabase
    .from("oportunidades")
    .update({ estadio: vuelveA, motivo_perdida: null, competidor: null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const nota =
    opp.estadio === "Perdido" && opp.motivo_perdida
      ? `Reabierta. Estaba perdida por: ${opp.motivo_perdida}`
      : "Reabierta";
  await registrarHistorial(supabase, id, opp.estadio, vuelveA, nota);

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

// El trabajo real de subir, separado de la accion: lo usan el boton de la
// ficha y tambien el alta, que puede traer un archivo en el mismo submit.
async function guardarAdjunto(supabase: Cliente, id: string, archivo: File) {
  if (archivo.size > MAX_ADJUNTO_BYTES) {
    throw new Error("El archivo supera los 25 MB.");
  }

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
}

export async function subirAdjunto(id: string, formData: FormData) {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new Error("No se eligio ningun archivo.");
  }

  const supabase = await createClient();
  await guardarAdjunto(supabase, id, archivo);

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
