"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolverCliente } from "@/lib/clienteResolver";
import { createClient } from "@/lib/supabase/server";
import {
  calcularValor,
  comisionTotal,
  estructuraValida,
  finEstimado,
  type Concepto,
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

// El valor total no se toma del formulario: se recalcula acá con la misma
// funcion que usa la pantalla para mostrarlo en vivo. Asi lo que se ve y lo
// que se guarda no pueden separarse, y un valor mandado a mano no entra.
function valorDeLaPropuesta(formData: FormData): number {
  const tipo = estructuraValida(str(formData, "estructura_tarifaria"));
  const dias = numOrNull(formData.get("duracion_estimada_dias") ?? undefined);
  return calcularValor(tipo, montosDelFormulario(formData), dias);
}

// La comision del broker, con el mismo criterio: dias × comision, recalculada
// aca y no tomada del formulario. Da 0 en los otros tres tipos de
// contratacion, asi que cambiar de Broker a Time Charter la borra (0024).
function comisionDeLaPropuesta(formData: FormData): number {
  const tipo = estructuraValida(str(formData, "estructura_tarifaria"));
  const dias = numOrNull(formData.get("duracion_estimada_dias") ?? undefined);
  return comisionTotal(tipo, montosDelFormulario(formData), dias);
}

// Los montos que vinieron en el submit, indexados por concepto. Lo usan las
// dos cuentas de arriba.
function montosDelFormulario(formData: FormData): Partial<Record<Concepto, number>> {
  const conceptos = formData.getAll("tarifa_concepto");
  const montos = formData.getAll("tarifa_monto");
  const mapa: Partial<Record<Concepto, number>> = {};
  conceptos.forEach((c, i) => {
    const concepto = String(c ?? "").trim() as Concepto;
    if (concepto) mapa[concepto] = numOrNull(montos[i]) ?? 0;
  });
  return mapa;
}

// El fin estimado tampoco: sale del inicio mas la duracion.
function finDelTrabajo(formData: FormData): string | null {
  const inicio = str(formData, "fecha_inicio_estimada");
  const dias = numOrNull(formData.get("duracion_estimada_dias") ?? undefined);
  if (!inicio || !dias || dias < 1) return null;
  return finEstimado(inicio, dias) || null;
}

// El estado ya no se toma del formulario. Con tres estados (0016) los dos que
// no son "en curso" son finales con consecuencias —adjudicado dispara el alta
// del proyecto, cancelado pide el motivo— y los dos se marcan desde la lista,
// que es donde esas consecuencias se pueden mostrar. Una oportunidad nueva
// nace en_curso por el default de la tabla, y editar el formulario no le
// cambia el estado a una adjudicada ni a una cancelada.

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
    estructura_tarifaria: estructuraValida(str(formData, "estructura_tarifaria")),
    // 0003
    fecha_inicio_estimada: str(formData, "fecha_inicio_estimada"),
    fecha_fin_estimada: finDelTrabajo(formData),
    // 0013
    comentarios: str(formData, "comentarios"),
    // 0015
    moneda: str(formData, "moneda") === "ARS" ? "ARS" : "USD",
    duracion_estimada_dias: numOrNull(formData.get("duracion_estimada_dias") ?? undefined),
    // 0024 · los dos puertos del charter y la comision del broker
    delivery_port: str(formData, "delivery_port"),
    redelivery_port: str(formData, "redelivery_port"),
    comision_total: comisionDeLaPropuesta(formData),
    // 0025 · donde se haria el trabajo. Vacio es una respuesta valida: no
    // siempre se sabe al cotizar.
    zona_id: str(formData, "zona_id"),
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

  // Sin estado: lo pone el default de la tabla, en_curso.
  const datos = { ...fields(formData), ...cliente };

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

  await registrarHistorial(supabase, data.id, null, "en_curso", "Alta");

  revalidatePath("/oportunidades");
  // A la ficha, no a la lista: es donde se adjunta la documentacion, que
  // necesita que la oportunidad ya exista.
  redirect(`/oportunidades/${data.id}`);
}

export async function updateOportunidad(id: string, formData: FormData) {
  const supabase = await createClient();
  const cliente = await resolverCliente(supabase, formData);

  // Sin estado: el formulario no lo edita. Guardar los datos de una
  // oportunidad adjudicada no la devuelve a en curso.
  const datos = { ...fields(formData), ...cliente };

  const { error } = await supabase.from("oportunidades").update(datos).eq("id", id);
  if (error) throw new Error(error.message);

  await guardarTarifas(supabase, id, formData);

  // No se registra historial: esta accion no cambia el estado. Los cambios de
  // estado pasan todos por cambiarEstadoOportunidad, que si lo registra.

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
// Estado: un solo camino para los tres
//
// En curso y adjudicado se cambian de una desde el desplegable de la lista.
// Cancelado pasa por un cuadro que pide el motivo, pero termina en esta misma
// accion: el motivo va a `comentarios`, que es lo que se ve en el listado.
//
// Adjudicar NO crea nada en public.proyectos, el maestro de Integra: eso se
// saco en 0008 por pedido explicito. Lo que hace es abrir el alta de un
// proyecto de Comercial (0012) con todo precargado.
// ------------------------------------------------------------

const ESTADOS_VALIDOS = ["en_curso", "adjudicado", "cancelado"];

export async function cambiarEstadoOportunidad(id: string, formData: FormData) {
  const nuevo = str(formData, "estado");
  if (!nuevo || !ESTADOS_VALIDOS.includes(nuevo)) {
    throw new Error("Estado invalido.");
  }

  // Cancelar es un final, y un final sin motivo no le sirve a nadie: el cuadro
  // lo pide y aca se exige igual, porque el required del formulario lo saltea
  // cualquiera con la consola abierta. La base tambien lo exige
  // (opp_cancelada_con_comentario, 0016).
  const comentarios = str(formData, "comentarios");
  if (nuevo === "cancelado" && !comentarios) {
    throw new Error("Para cancelar hace falta el comentario.");
  }

  const supabase = await createClient();

  const { data: previa, error: ePrevia } = await supabase
    .from("oportunidades")
    .select("estado, comentarios")
    .eq("id", id)
    .single();
  if (ePrevia) throw new Error(ePrevia.message);

  // Sacar una oportunidad de adjudicada cuando su proyecto ya existe dejaria
  // al proyecto colgado de una oportunidad que dice que nunca se gano. Se
  // avisa en vez de romper la coherencia por lo bajo.
  if (previa.estado === "adjudicado" && nuevo !== "adjudicado") {
    const { data: proyecto } = await supabase
      .from("proyectos")
      .select("nro_proyecto")
      .eq("oportunidad_id", id)
      .maybeSingle();
    if (proyecto) {
      throw new Error(
        `Esta oportunidad ya se convirtio en el proyecto ${proyecto.nro_proyecto ?? "sin nro"}. Para volver atras hay que borrar ese proyecto primero.`
      );
    }
  }

  const { error } = await supabase
    .from("oportunidades")
    .update({
      estado: nuevo,
      // Volver a en curso desde el desplegable no manda comentarios: en ese
      // caso se deja lo que ya habia.
      comentarios: comentarios ?? previa.comentarios ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (previa.estado !== nuevo) {
    await registrarHistorial(supabase, id, previa.estado ?? null, nuevo, comentarios);
  }

  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${id}`);

  // Adjudicar abre el alta del proyecto, con lo de la oportunidad precargado y
  // editable. Si no se guarda, la oportunidad queda adjudicada sin proyecto y
  // su ficha ofrece convertirla mas tarde.
  if (nuevo === "adjudicado") {
    redirect(`/proyectos/nuevo?oportunidad=${id}`);
  }
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
