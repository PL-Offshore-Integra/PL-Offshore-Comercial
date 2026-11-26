"use server";

import { revalidatePath } from "next/cache";
import {
  ADJUNTOS,
  BUCKET,
  CUPO_ADJUNTOS_BYTES,
  extensionDe,
  pesoLegible,
  type EntidadAdjunto,
} from "@/lib/adjuntos";
import { createClient } from "@/lib/supabase/server";

// Las tres acciones de la subida directa, compartidas por oportunidades,
// proyectos y salidas. El por que de este camino esta en lib/adjuntos.ts.
//
// La subida son tres pasos, y hacen falta los tres:
//
//   1. pedirSubida      el servidor revisa el cupo, elige las rutas y devuelve
//                       un permiso firmado por archivo.
//   2. (el navegador)   sube cada archivo derecho a Storage con ese permiso.
//   3. registrarSubida  el servidor verifica lo que quedo en el bucket y
//                       recien ahi escribe las filas.
//
// Se verifica en el paso 3 y no se confia en el paso 1 porque entre uno y
// otro el navegador podria mandar cualquier cosa: el permiso firmado habilita
// una ruta, no un tamano. El tamano que se guarda es el que informa Storage,
// no el que declaro el navegador.

type ArchivoPedido = { nombre: string; tamano: number; tipo: string | null };

export type PermisoDeSubida = {
  // El nombre original, para que el navegador sepa que permiso es de que
  // archivo.
  nombre: string;
  path: string;
  token: string;
};

type Subido = { nombre: string; path: string; tipo: string | null };

function configDe(entidad: EntidadAdjunto) {
  const config = ADJUNTOS[entidad];
  if (!config) throw new Error("Entidad desconocida.");
  return config;
}

// Lo que ya pesa lo cargado. El cupo es por entidad, asi que esta suma es la
// que manda.
async function yaPesa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entidad: EntidadAdjunto,
  id: string
): Promise<number> {
  const { tabla, fk } = configDe(entidad);
  const { data, error } = await supabase.from(tabla).select("tamano_bytes").eq(fk, id);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (suma: number, fila: { tamano_bytes: number | null }) => suma + (fila.tamano_bytes ?? 0),
    0
  );
}

function avisoDeCupo(usado: number, entrante: number): string {
  const sobra = Math.max(CUPO_ADJUNTOS_BYTES - usado, 0);
  return (
    `No entra: ${pesoLegible(entrante)} sobre ${pesoLegible(usado)} ya cargados ` +
    `supera los ${pesoLegible(CUPO_ADJUNTOS_BYTES)}. Queda lugar para ${pesoLegible(sobra)}. ` +
    `Borra algo de lo que ya esta o subi un archivo mas chico.`
  );
}

// Paso 1: revisar el cupo y devolver un permiso por archivo.
export async function pedirSubida(
  entidad: EntidadAdjunto,
  id: string,
  archivos: ArchivoPedido[]
): Promise<PermisoDeSubida[]> {
  const { carpeta } = configDe(entidad);

  if (!Array.isArray(archivos) || archivos.length === 0) {
    throw new Error("No se eligio ningun archivo.");
  }
  if (archivos.some((a) => !a?.nombre || !Number.isFinite(a.tamano) || a.tamano <= 0)) {
    throw new Error("Alguno de los archivos llego vacio.");
  }

  const supabase = await createClient();

  // Sin sesion no se sube nada. La RLS tambien lo impide, pero el error que
  // devuelve no dice esto.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("La sesion vencio. Volve a entrar.");

  const usado = await yaPesa(supabase, entidad, id);
  const entrante = archivos.reduce((suma, a) => suma + a.tamano, 0);
  if (usado + entrante > CUPO_ADJUNTOS_BYTES) {
    throw new Error(avisoDeCupo(usado, entrante));
  }

  const permisos: PermisoDeSubida[] = [];
  for (const archivo of archivos) {
    const path = `${carpeta}/${id}/${crypto.randomUUID()}${extensionDe(archivo.nombre)}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      // Los permisos ya emitidos no se usaron: no hay nada que limpiar, un
      // permiso sin archivo no deja rastro.
      throw new Error(`No se pudo preparar la subida: ${error?.message ?? "sin detalle"}`);
    }
    permisos.push({ nombre: archivo.nombre, path: data.path, token: data.token });
  }

  return permisos;
}

// Paso 3: verificar lo que quedo en el bucket y escribir las filas.
export async function registrarSubida(
  entidad: EntidadAdjunto,
  id: string,
  subidos: Subido[],
  clase?: string
): Promise<void> {
  const { tabla, fk, carpeta, clases } = configDe(entidad);

  if (!Array.isArray(subidos) || subidos.length === 0) return;

  // Una ruta que no sea de esta entidad no se registra. El navegador propone
  // la lista, asi que se revisa.
  const prefijo = `${carpeta}/${id}/`;
  if (subidos.some((s) => !s?.path?.startsWith(prefijo))) {
    throw new Error("Una de las rutas no pertenece a este registro.");
  }

  const supabase = await createClient();

  // El tamano real, preguntado a Storage. Es el que se guarda.
  const pesos = new Map<string, number>();
  for (const s of subidos) {
    const { data, error } = await supabase.storage.from(BUCKET).info(s.path);
    if (error || !data) {
      await supabase.storage.from(BUCKET).remove(subidos.map((x) => x.path));
      throw new Error("La subida no llego completa. Proba de nuevo.");
    }
    pesos.set(s.path, data.size ?? 0);
  }

  const usado = await yaPesa(supabase, entidad, id);
  const entrante = [...pesos.values()].reduce((suma, n) => suma + n, 0);
  if (usado + entrante > CUPO_ADJUNTOS_BYTES) {
    // Lo que entro al bucket y no va a tener fila se saca: un archivo sin
    // fila no se ve en ninguna pantalla y nadie lo podria borrar despues.
    await supabase.storage.from(BUCKET).remove(subidos.map((x) => x.path));
    throw new Error(avisoDeCupo(usado, entrante));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const claseValida = clases
    ? clases.includes(clase ?? "")
      ? clase
      : clases[clases.length - 1]
    : null;

  const filas = subidos.map((s) => ({
    [fk]: id,
    nombre: s.nombre.slice(0, 200),
    path: s.path,
    tipo: s.tipo || null,
    tamano_bytes: pesos.get(s.path) ?? 0,
    subido_por: user?.id ?? null,
    ...(claseValida ? { clase: claseValida } : {}),
  }));

  const { error } = await supabase.from(tabla).insert(filas);
  if (error) {
    await supabase.storage.from(BUCKET).remove(subidos.map((x) => x.path));
    throw new Error(error.message);
  }

  refrescar(entidad, id);
}

// Si el navegador no pudo terminar de subir, lo que si entro se saca: un
// archivo sin fila es un archivo que nadie ve y nadie puede borrar.
export async function descartarSubida(paths: string[]): Promise<void> {
  if (!Array.isArray(paths) || paths.length === 0) return;

  const carpetas = Object.values(ADJUNTOS).map((c) => `${c.carpeta}/`);
  const propias = paths.filter((p) => carpetas.some((c) => p?.startsWith(c)));
  if (propias.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove(propias);
  if (error) console.error("No se pudo limpiar la subida a medias:", error.message);
}

function refrescar(entidad: EntidadAdjunto, id: string) {
  if (entidad === "oportunidad") {
    revalidatePath(`/oportunidades/${id}`);
    revalidatePath(`/oportunidades/${id}/editar`);
    return;
  }
  if (entidad === "proyecto") {
    revalidatePath(`/proyectos/${id}`);
    return;
  }
  // La salida vive adentro de un proyecto y aca no se sabe de cual: se
  // refresca el arbol entero de /proyectos. Antes se refrescaba solo
  // /proyectos, que es la lista, asi que la ficha de la salida se quedaba
  // mostrando la documentacion vieja hasta recargar a mano.
  revalidatePath("/proyectos", "layout");
}
