"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calcularValor,
  finEstimado,
  type Concepto,
  type EstructuraTarifaria,
} from "@/lib/types";

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

// El valor total no se toma del formulario: se recalcula acá con la misma
// funcion que usa la pantalla para mostrarlo en vivo. Asi lo que se ve y lo
// que se guarda no pueden separarse, y un valor mandado a mano no entra.
function valorDeLaPropuesta(formData: FormData): number {
  const tipo = (str(formData, "estructura_tarifaria") ?? "time_charter") as EstructuraTarifaria;
  const dias = numOrNull(formData.get("duracion_estimada_dias") ?? undefined);

  const conceptos = formData.getAll("tarifa_concepto");
  const montos = formData.getAll("tarifa_monto");
  const mapa: Partial<Record<Concepto, number>> = {};
  conceptos.forEach((c, i) => {
    const concepto = String(c ?? "").trim() as Concepto;
    if (concepto) mapa[concepto] = numOrNull(montos[i]) ?? 0;
  });

  return calcularValor(tipo, mapa, dias);
}

// El fin estimado tampoco: sale del inicio mas la duracion.
function finDelTrabajo(formData: FormData): string | null {
  const inicio = str(formData, "fecha_inicio_estimada");
  const dias = numOrNull(formData.get("duracion_estimada_dias") ?? undefined);
  if (!inicio || !dias || dias < 1) return null;
  return finEstimado(inicio, dias) || null;
}

// Cerrado nunca llega por el formulario: pasa por el cuadro de cierre, que es
// el que pide resultado y comentario. Cualquier otra cosa cae en abierto.
function estadoDirecto(pedido: string | null): string {
  return pedido === "en_curso" || pedido === "cancelado" ? pedido : "abierto";
}

function fields(formData: FormData) {
  return {
    descripcion_alcance: str(formData, "descripcion_alcance"),
    nro_oportunidad: str(formData, "nro_oportunidad"),
    valor: valorDeLaPropuesta(formData),
    fecha_creacion: str(formData, "fecha_creacion") ?? new Date().toISOString().slice(0, 10),
    fecha_esperada_cierre: str(formData, "fecha_esperada_cierre"),
    last_interacted_on: str(formData, "last_interacted_on"),
    // 0002
    cliente_final: str(formData, "cliente_final"),
    buque: str(formData, "buque"),
    estructura_tarifaria: str(formData, "estructura_tarifaria") ?? "time_charter",
    // 0003
    fecha_inicio_estimada: str(formData, "fecha_inicio_estimada"),
    fecha_fin_estimada: finDelTrabajo(formData),
    // 0013
    comentarios: str(formData, "comentarios"),
    duracion_estimada_dias: numOrNull(formData.get("duracion_estimada_dias") ?? undefined),
  };
}

// El cliente no esta en fields(): sale de resolverCliente(), que puede tener
// que crear la empresa o el contacto antes de poder devolver los FK. De ahi
// vienen compania, contacto, contacto_email, contacto_telefono y
// contacto_linkedin, mas los dos cliente_*_id.

// Estas columnas NO estan en fields(), y todas por el mismo motivo: el
// formulario dejo de pedirlas, y si las mandaramos igual borrarian lo que ya
// hay cada vez que alguien edita una fila vieja.
//
//   empresa              — es la empresa PROPIA, no el cliente. En el alta la
//                          resuelve el default de la tabla.
//   nombre_proyecto      — las filas del tracker original lo tienen cargado.
//   costo                — se saco del formulario; en el alta queda en 0.
//   alcance_oportunidad  — se saco del formulario (0013).
//   estadio              — los nueve viejos. Lo reemplazo `estado` (0013) y
//                          la columna queda con lo que tenia.
//   notas, referencias,
//   proximos_pasos       — se unificaron en `comentarios` (0013). La copia ya
//                          la hizo la migracion; las columnas quedan como
//                          estaban.
//   estado, resultado    — no se cambian desde el formulario: pasan por
//                          cambiarEstadoOportunidad, cerrarOportunidad y
//                          reabrirOportunidad, que son las que saben pedir el
//                          resultado y el comentario. En el alta el default de
//                          la tabla los deja en abierto / sin resultado.

// El nro de oportunidad lo pone un trigger cuando llega vacio. En un alta el
// campo va de solo lectura, asi que nunca se manda; en una edicion se respeta
// lo que ya tiene.

export async function createOportunidad(formData: FormData) {
  const supabase = await createClient();
  const cliente = await resolverCliente(supabase, formData);

  // El estado si se toma en el alta: cualquiera de los directos —abierto, en
  // curso, cancelado—, porque cerrado no esta en el desplegable.
  const estado = estadoDirecto(str(formData, "estado"));
  const datos = { ...fields(formData), ...cliente, estado };

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

  await registrarHistorial(supabase, data.id, null, estado, "Alta");

  revalidatePath("/oportunidades");
  // A la ficha, no a la lista: es donde se adjunta la documentacion, que
  // necesita que la oportunidad ya exista.
  redirect(`/oportunidades/${data.id}`);
}

export async function updateOportunidad(id: string, formData: FormData) {
  const supabase = await createClient();
  const cliente = await resolverCliente(supabase, formData);
  const base = { ...fields(formData), ...cliente };

  const { data: previa } = await supabase
    .from("oportunidades")
    .select("estado")
    .eq("id", id)
    .single();

  // Una cerrada no se reabre desde el formulario: para eso esta Reabrir en la
  // lista. En cualquier otro caso el estado que llega solo puede ser uno de
  // los directos.
  const datos =
    previa?.estado === "cerrado"
      ? base
      : { ...base, estado: estadoDirecto(str(formData, "estado")) };

  const { error } = await supabase.from("oportunidades").update(datos).eq("id", id);
  if (error) throw new Error(error.message);

  await guardarTarifas(supabase, id, formData);

  const estadoNuevo = "estado" in datos ? (datos.estado as string) : previa?.estado;
  if (previa && estadoNuevo && previa.estado !== estadoNuevo) {
    await registrarHistorial(supabase, id, previa.estado, estadoNuevo, null);
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
// Estado: cambiar, cerrar y reabrir
//
// Abierto y en curso se cambian de una desde el desplegable de la lista.
// Cerrar es distinto: obliga a decir con que resultado y, si se perdio, por
// que. Ese porque va a `comentarios`, que es lo que se ve en el listado.
// ------------------------------------------------------------

// Los estados que se eligen directo del desplegable, sin cuadro de cierre.
// Cancelado esta aca: no pide resultado ni comentario.
const ESTADOS_DIRECTOS = ["abierto", "en_curso", "cancelado"];
// Y estos son los que cuentan como "todavia viva", para saber a donde vuelve
// una reapertura.
const ESTADOS_VIVOS = ["abierto", "en_curso"];

export async function cambiarEstadoOportunidad(id: string, formData: FormData) {
  const nuevo = str(formData, "estado");
  if (!nuevo || !ESTADOS_DIRECTOS.includes(nuevo)) {
    throw new Error("Estado invalido. Para cerrar hay que usar el cuadro de cierre.");
  }

  const supabase = await createClient();

  const { data: previa } = await supabase
    .from("oportunidades")
    .select("estado")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("oportunidades")
    .update({ estado: nuevo, resultado: null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (previa?.estado !== nuevo) {
    await registrarHistorial(supabase, id, previa?.estado ?? null, nuevo, null);
  }

  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);
}

// Cerrar. El comentario es obligatorio cuando se pierde: la regla
// opp_perdida_con_comentario de 0013 lo exige tambien del lado de la base,
// asi que el required del formulario no es la unica defensa.
//
// Ganar NO crea el proyecto en public.proyectos, el maestro de Integra. Eso
// se saco en 0008 por pedido explicito; lo que hace es abrir la conversion en
// un proyecto de Comercial (0012).
export async function cerrarOportunidad(id: string, formData: FormData) {
  const resultado = str(formData, "resultado");
  if (resultado !== "ganado" && resultado !== "perdido") {
    throw new Error("Hay que decir si se gano o se perdio.");
  }

  const comentarios = str(formData, "comentarios");
  if (resultado === "perdido" && !comentarios) {
    throw new Error("Para cerrar como perdida hace falta el comentario.");
  }

  const supabase = await createClient();

  const { data: previa } = await supabase
    .from("oportunidades")
    .select("estado, comentarios")
    .eq("id", id)
    .single();

  if (previa?.estado === "cerrado") {
    throw new Error("Esta oportunidad ya esta cerrada.");
  }

  const { error } = await supabase
    .from("oportunidades")
    .update({
      estado: "cerrado",
      resultado,
      // Si el cuadro vino vacio en un cierre ganado, se deja lo que ya habia.
      comentarios: comentarios ?? previa?.comentarios ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await registrarHistorial(
    supabase,
    id,
    previa?.estado ?? null,
    `cerrado / ${resultado}`,
    comentarios
  );

  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);

  // Ganar abre la conversion en proyecto, con todo lo de la oportunidad
  // precargado y editable. Si no se guarda, la oportunidad queda cerrada y
  // ganada sin proyecto, y su ficha ofrece convertirla mas tarde.
  if (resultado === "ganado") {
    redirect(`/proyectos/nuevo?oportunidad=${id}`);
  }
}

// Volver atras un cierre.
//
// El estado no vuelve a un valor fijo: sale del historial. La ultima entrada
// guarda de donde venia la oportunidad cuando se cerro. Si no hay historial
// —una fila cerrada desde la base— cae en en_curso.
//
// El comentario NO se borra: si describia por que se perdio, sigue siendo
// informacion util, y borrarlo dejaria la fila sin explicacion de un cierre
// que existio.
export async function reabrirOportunidad(id: string) {
  const supabase = await createClient();

  const { data: opp, error: eOpp } = await supabase
    .from("oportunidades")
    .select("estado, resultado")
    .eq("id", id)
    .single();
  if (eOpp) throw new Error(eOpp.message);
  if (opp.estado !== "cerrado") throw new Error("Esta oportunidad no esta cerrada.");

  const { data: ultima } = await supabase
    .from("oportunidad_historial")
    .select("estadio_anterior")
    .eq("oportunidad_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const vuelveA =
    ultima?.estadio_anterior && ESTADOS_VIVOS.includes(ultima.estadio_anterior)
      ? ultima.estadio_anterior
      : "en_curso";

  const { error } = await supabase
    .from("oportunidades")
    .update({ estado: vuelveA, resultado: null })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await registrarHistorial(
    supabase,
    id,
    `cerrado / ${opp.resultado ?? "sin resultado"}`,
    vuelveA,
    "Reabierta"
  );

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
