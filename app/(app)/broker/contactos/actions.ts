"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function fields(formData: FormData) {
  const email = str(formData, "email")?.toLowerCase() ?? "";

  // No se valida el mail con una expresion regular larga: alcanza con que
  // tenga arroba y un punto despues, que es lo que distingue un mail de un
  // nombre pegado por error. El resto lo dice el rebote.
  if (email !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(`"${email}" no parece un mail.`);
  }

  // El dominio se saca del mail si no se escribio: es el mismo dato dos veces
  // y no tiene sentido pedirlo.
  const dominio = str(formData, "dominio")?.toLowerCase() ?? email.split("@")[1] ?? null;

  return {
    email,
    nombre: str(formData, "nombre"),
    apellido: str(formData, "apellido"),
    empresa: str(formData, "empresa"),
    pais: str(formData, "pais"),
    dominio,
    notas: str(formData, "notas"),
    activo: formData.get("activo") !== null,
  };
}

function mensajeDeError(mensaje: string): string {
  if (mensaje.includes("ux_com_broker_contactos_email")) {
    return "Ese mail ya esta en la lista. Busca el contacto que existe y corregilo.";
  }
  return mensaje;
}

export async function crearContacto(formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.email) throw new Error("El contacto necesita un mail: es lo que lo identifica.");

  const { error } = await supabase.from("broker_contactos").insert(datos);
  if (error) throw new Error(mensajeDeError(error.message));

  revalidatePath("/broker/contactos");
  redirect("/broker/contactos");
}

export async function actualizarContacto(id: string, formData: FormData) {
  const supabase = await createClient();
  const datos = fields(formData);
  if (!datos.email) throw new Error("El contacto necesita un mail: es lo que lo identifica.");

  const { error } = await supabase
    .from("broker_contactos")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(mensajeDeError(error.message));

  revalidatePath("/broker/contactos");
  revalidatePath(`/broker/contactos/${id}`);
  redirect("/broker/contactos");
}

// Para dejar de escribirle a alguien sin perder el contacto esta `activo`.
// Borrar es para el mail que rebota siempre o el que pidio salir de la lista.
export async function borrarContacto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("broker_contactos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/broker/contactos");
  redirect("/broker/contactos");
}
