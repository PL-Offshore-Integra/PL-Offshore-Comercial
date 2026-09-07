"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ESTADOS_BUQUE,
  RELACIONES_BUQUE,
  TIPOS_BUQUE,
  type EstadoComercialBuque,
  type RelacionBuque,
  type TipoBuque,
} from "@/lib/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// Los numeros de una ficha tecnica se copian de un PDF, y ahi vienen como
// "73,5", "2.590" o "1.950 mT". Se acepta cualquiera de las tres: se saca
// todo lo que no sea digito, coma, punto o signo, y despues se resuelve el
// separador decimal.
function numero(formData: FormData, key: string): number | null {
  const bruto = str(formData, key);
  if (bruto === null) return null;

  const limpio = bruto.replace(/[^\d.,-]/g, "");
  if (limpio === "") return null;

  // Si tiene los dos separadores, el ultimo es el decimal: "1.234,56" y
  // "1,234.56" son el mismo numero escrito en dos paises.
  const ultimaComa = limpio.lastIndexOf(",");
  const ultimoPunto = limpio.lastIndexOf(".");
  let normal: string;
  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    const decimal = Math.max(ultimaComa, ultimoPunto);
    normal =
      limpio.slice(0, decimal).replace(/[.,]/g, "") + "." + limpio.slice(decimal + 1);
  } else if (ultimaComa !== -1) {
    // Una sola coma: decimal si deja uno o dos digitos, miles si deja tres.
    const decimales = limpio.length - ultimaComa - 1;
    normal =
      decimales === 3
        ? limpio.replace(/,/g, "")
        : limpio.slice(0, ultimaComa) + "." + limpio.slice(ultimaComa + 1);
  } else {
    // Solo puntos: si hay mas de uno son miles seguro. Si hay uno, se
    // interpreta igual que la coma.
    const puntos = (limpio.match(/\./g) ?? []).length;
    if (puntos > 1) normal = limpio.replace(/\./g, "");
    else if (puntos === 1 && limpio.length - ultimoPunto - 1 === 3)
      normal = limpio.replace(/\./g, "");
    else normal = limpio;
  }

  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

function entero(formData: FormData, key: string): number | null {
  const n = numero(formData, key);
  return n === null ? null : Math.round(n);
}

function unoDe<T extends string>(
  valor: string | null,
  opciones: { id: T }[],
  porDefecto: T
): T {
  return opciones.some((o) => o.id === valor) ? (valor as T) : porDefecto;
}

function fields(formData: FormData) {
  const anio = entero(formData, "anio");
  if (anio !== null && (anio < 1900 || anio > 2100)) {
    throw new Error("El ano de construccion tiene que ser un ano.");
  }

  const moneda = str(formData, "precio_moneda");
  const precio = numero(formData, "precio_pedido");

  return {
    nombre: str(formData, "nombre") ?? "",
    tipo: unoDe<TipoBuque>(str(formData, "tipo"), TIPOS_BUQUE, "remolcador"),
    relacion: unoDe<RelacionBuque>(str(formData, "relacion"), RELACIONES_BUQUE, "terceros"),
    // El estado comercial puede no saberse, y decir "disponible" cuando no
    // se sabe es peor que no decir nada.
    estado_comercial: ESTADOS_BUQUE.some((e) => e.id === str(formData, "estado_comercial"))
      ? (str(formData, "estado_comercial") as EstadoComercialBuque)
      : null,

    propietario: str(formData, "propietario"),
    operador: str(formData, "operador"),
    broker: str(formData, "broker"),

    bandera: str(formData, "bandera"),
    puerto_registro: str(formData, "puerto_registro"),
    imo: str(formData, "imo"),

    anio,
    astillero: str(formData, "astillero"),
    diseno: str(formData, "diseno"),

    clasificadora: str(formData, "clasificadora"),
    notacion_clase: str(formData, "notacion_clase"),
    dp: str(formData, "dp"),

    loa_m: numero(formData, "loa_m"),
    manga_m: numero(formData, "manga_m"),
    puntal_m: numero(formData, "puntal_m"),
    calado_m: numero(formData, "calado_m"),
    gt: numero(formData, "gt"),
    nt: numero(formData, "nt"),
    dwt_t: numero(formData, "dwt_t"),

    bollard_pull_t: numero(formData, "bollard_pull_t"),
    potencia_kw: numero(formData, "potencia_kw"),
    velocidad_kn: numero(formData, "velocidad_kn"),
    motores: str(formData, "motores"),
    propulsion: str(formData, "propulsion"),
    thrusters: str(formData, "thrusters"),

    winches: str(formData, "winches"),
    grua: str(formData, "grua"),
    fifi: str(formData, "fifi"),
    acomodacion: entero(formData, "acomodacion"),
    tanques: str(formData, "tanques"),

    precio_pedido: precio,
    // Sin precio no hay moneda que valga, y con precio hace falta una.
    precio_moneda: precio === null ? null : moneda === "EUR" ? "EUR" : "USD",
    disponibilidad: str(formData, "disponibilidad"),
    proxima_seca: str(formData, "proxima_seca"),

    fuente: str(formData, "fuente"),
    notas: str(formData, "notas"),
    // Un checkbox que no se marca no viaja en el FormData.
    activo: formData.get("activo") !== null,
  };
}

// Los dos indices unicos son sobre expresiones, asi que Postgres contesta con
// el nombre del indice y no con el de la columna. Se traduce.
function mensajeDeError(mensaje: string): string {
  if (mensaje.includes("ux_com_buques_nombre")) {
    return "Ya hay un buque con ese nombre. La idea es que cada buque tenga una sola fila: busca el que existe y corregilo.";
  }
  if (mensaje.includes("ux_com_buques_imo")) {
    return "Ya hay un buque con ese IMO. El IMO no cambia nunca, ni cuando cambian el nombre y la bandera, asi que si esta repetido es el mismo buque cargado dos veces.";
  }
  return mensaje;
}

export async function crearBuque(formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("El buque necesita un nombre.");

  const { error } = await supabase.from("buques").insert(datos);
  if (error) throw new Error(mensajeDeError(error.message));

  revalidatePath("/broker/tonelaje");
  redirect("/broker/tonelaje");
}

export async function actualizarBuque(id: string, formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.nombre) throw new Error("El buque necesita un nombre.");

  const { error } = await supabase
    .from("buques")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(mensajeDeError(error.message));

  revalidatePath("/broker/tonelaje");
  revalidatePath(`/broker/tonelaje/${id}`);
  redirect("/broker/tonelaje");
}

// Para sacar un buque de circulacion sin perder la ficha esta `activo`, que es
// casi siempre lo que se quiere: el tonelaje que hoy no sirve puede volver a
// servir el ano que viene, y la ficha costo leerla.
export async function borrarBuque(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("buques").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/broker/tonelaje");
  redirect("/broker/tonelaje");
}
