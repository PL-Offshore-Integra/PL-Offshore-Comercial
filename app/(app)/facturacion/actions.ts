"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { numeroONulo } from "@/lib/numeros";
import { createClient } from "@/lib/supabase/server";
import { EMPRESAS_PROPIAS, type EmpresaPropia } from "@/lib/types";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// Los montos se leen con `numeroONulo` (lib/numeros.ts), que distingue
// "59135.43" de "59.135,43". La cuenta de por que eso importa esta ahi.
function numOrNull(formData: FormData, key: string): number | null {
  return numeroONulo(str(formData, key));
}

function num(formData: FormData, key: string): number {
  return numOrNull(formData, key) ?? 0;
}

function empresaValida(valor: string | null): EmpresaPropia {
  return EMPRESAS_PROPIAS.includes(valor as EmpresaPropia)
    ? (valor as EmpresaPropia)
    : "Parana Logistica";
}

function monedaValida(valor: string | null): "USD" | "ARS" {
  return valor === "ARS" ? "ARS" : "USD";
}

// Lo que el formulario de la factura puede escribir.
//
// El cliente no esta: sale del proyecto. Repetirlo en la factura seria dejar
// que digan cosas distintas.
function fields(formData: FormData) {
  const cobroMoneda = str(formData, "cobro_moneda");
  const cobrada = cobroMoneda === "USD" || cobroMoneda === "ARS";
  const cobroFecha = str(formData, "cobro_fecha");

  // Media cobranza descuadra cualquier total, asi que se avisa con palabras
  // antes de que lo diga un error de Postgres (facturas_cobro_completo).
  if (cobrada && !cobroFecha) {
    throw new Error("Si la factura esta cobrada hace falta la fecha de cobro.");
  }
  if (!cobrada && cobroFecha) {
    throw new Error(
      "Hay fecha de cobro pero no se dijo en que moneda entro la plata. Elegi USD o ARS, o borra la fecha."
    );
  }

  const tcPagado = numOrNull(formData, "tc_pagado");
  if (cobroMoneda === "ARS" && tcPagado === null) {
    throw new Error(
      "Cobrada en pesos sin tipo de cambio no permite saber cuanta plata entro: falta el TC pagado."
    );
  }

  const importe = num(formData, "importe");
  const comision = num(formData, "comision");
  if (importe <= 0) throw new Error("La factura necesita un importe.");
  if (comision < 0) throw new Error("La comision no puede ser negativa.");
  if (comision > importe) {
    throw new Error("La comision no puede ser mayor que el importe de la factura.");
  }

  return {
    operacion_id: str(formData, "operacion_id"),
    nro_factura: str(formData, "nro_factura"),
    empresa_facturadora: empresaValida(str(formData, "empresa_facturadora")),

    fecha_emision: str(formData, "fecha_emision") ?? new Date().toISOString().slice(0, 10),
    vencimiento: str(formData, "vencimiento"),

    importe,
    comision,
    moneda: monedaValida(str(formData, "moneda")),

    // El estado no se guarda: se deduce de esto. Ver `estadoDeFactura`.
    cobro_moneda: cobrada ? monedaValida(cobroMoneda) : null,
    cobro_fecha: cobrada ? cobroFecha : null,
    tc_pagado: tcPagado,
    tc_dia_cobro: numOrNull(formData, "tc_dia_cobro"),

    notas: str(formData, "notas"),
  };
}

// A donde volver despues de guardar. Se crea una factura desde la ficha del
// proyecto o desde el seguimiento, y conviene volver al lugar de donde se
// vino.
function volverA(formData: FormData, proyectoId: string): string {
  return str(formData, "volver_a") === "proyecto"
    ? `/proyectos/${proyectoId}`
    : "/facturacion";
}

function refrescar(proyectoId: string) {
  revalidatePath("/facturacion");
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${proyectoId}`);
}

export async function crearFactura(formData: FormData) {
  const proyectoId = str(formData, "proyecto_id");
  if (!proyectoId) throw new Error("La factura necesita un proyecto.");

  const supabase = await createClient();
  const datos = fields(formData);

  const { error } = await supabase
    .from("facturas")
    .insert({ ...datos, proyecto_id: proyectoId });
  if (error) throw new Error(mensajeDeError(error.message));

  refrescar(proyectoId);
  redirect(volverA(formData, proyectoId));
}

export async function actualizarFactura(id: string, formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);

  // El proyecto no se cambia: una factura emitida a un cliente no se muda a
  // otro trabajo. Se lee de la base para no depender de un campo oculto.
  const { data: actual, error: eLeer } = await supabase
    .from("facturas")
    .select("proyecto_id")
    .eq("id", id)
    .single();
  if (eLeer) throw new Error(eLeer.message);

  const { error } = await supabase
    .from("facturas")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(mensajeDeError(error.message));

  refrescar(actual.proyecto_id);
  redirect(volverA(formData, actual.proyecto_id));
}

export async function borrarFactura(id: string) {
  const supabase = await createClient();

  const { data: actual } = await supabase
    .from("facturas")
    .select("proyecto_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("facturas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refrescar(actual?.proyecto_id ?? "");
  redirect("/facturacion");
}

// El indice unico es sobre lower(trim(nro_factura)), asi que el error de
// Postgres habla de un indice.
function mensajeDeError(mensaje: string): string {
  if (mensaje.includes("ux_com_facturas_nro")) {
    return "Ya hay otra factura cargada con ese numero.";
  }
  if (mensaje.includes("facturas_cobro_completo")) {
    return "El cobro necesita la moneda y la fecha, las dos o ninguna.";
  }
  if (mensaje.includes("facturas_pesos_con_tc")) {
    return "Una factura cobrada en pesos necesita el TC pagado.";
  }
  return mensaje;
}
