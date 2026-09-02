"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// Las dos pantallas que muestran clientes se revalidan juntas: la base de
// clientes y el formulario de oportunidad, que lee los mismos desplegables.
function revalidarTodo() {
  revalidatePath("/clientes");
  revalidatePath("/oportunidades/nueva");
  revalidatePath("/oportunidades");
}

// No hay un alta de empresa suelta: la empresa se crea desde el alta de
// contacto (resolverEmpresa, mas abajo) o desde el formulario de la
// oportunidad. Una empresa sin ningun contacto no le sirve a nadie, y tener
// dos altas separadas obligaba a hacer dos pasos para cargar un cliente.
//
// Renombrarla sigue estando: es la unica forma de arreglar un nombre mal
// escrito ahora que las oportunidades lo toman de aca.

export async function renombrarEmpresa(id: string, formData: FormData) {
  const nombre = str(formData, "nombre");
  if (!nombre) throw new Error("La empresa necesita un nombre.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("cliente_empresas")
    .update({ nombre, notas: str(formData, "notas"), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // A proposito NO se actualiza `oportunidades.compania`: cada oportunidad
  // conserva el nombre con el que se cargo. El maestro es el que vale de aca
  // en adelante.
  revalidarTodo();
}

export async function borrarEmpresa(id: string) {
  const supabase = await createClient();

  // Los contactos se van con ella (cascade), pero las oportunidades no: se
  // quedarian apuntando a la nada y con el nombre viejo en el texto. Mejor
  // frenar y que la persona decida.
  const { count } = await supabase
    .from("oportunidades")
    .select("id", { count: "exact", head: true })
    .eq("cliente_empresa_id", id);

  if (count && count > 0) {
    throw new Error(
      `No se puede borrar: tiene ${count} oportunidad${count === 1 ? "" : "es"} cargada${count === 1 ? "" : "s"}.`
    );
  }

  const { error } = await supabase.from("cliente_empresas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidarTodo();
}

function datosContacto(formData: FormData) {
  const datos = {
    nombre: str(formData, "nombre"),
    email: str(formData, "email"),
    telefono: str(formData, "telefono"),
    linkedin: str(formData, "linkedin"),
    cargo: str(formData, "cargo"),
    notas: str(formData, "notas"),
  };
  if (!datos.nombre && !datos.email && !datos.telefono) {
    throw new Error("El contacto necesita al menos nombre, mail o telefono.");
  }
  return datos;
}

// El alta de contacto puede traer una empresa que todavia no existe: se elige
// "+ Nueva empresa" en el mismo desplegable y se escribe el nombre al lado.
// Asi cargar un cliente nuevo es un solo paso y no dos.
//
// Si el nombre ya existe se reusa esa empresa en lugar de fallar: el objetivo
// de la persona es cargar el contacto, no discutir sobre la empresa.
async function resolverEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<string> {
  const empresaId = str(formData, "empresa_id");

  if (empresaId && empresaId !== "nueva") return empresaId;

  const nombre = str(formData, "empresa_nueva");
  if (!nombre) throw new Error("Hay que elegir la empresa o escribir el nombre de la nueva.");

  const { data: existente } = await supabase
    .from("cliente_empresas")
    .select("id")
    .ilike("nombre", nombre)
    .maybeSingle();
  if (existente) return existente.id;

  const { data, error } = await supabase
    .from("cliente_empresas")
    .insert({ nombre })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear la empresa: ${error.message}`);
  return data.id;
}

export async function crearContacto(formData: FormData) {
  const supabase = await createClient();
  const empresaId = await resolverEmpresa(supabase, formData);

  const { error } = await supabase
    .from("cliente_contactos")
    .insert({ empresa_id: empresaId, ...datosContacto(formData) });
  if (error) throw new Error(error.message);

  revalidarTodo();
}

export async function actualizarContacto(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cliente_contactos")
    .update({ ...datosContacto(formData), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidarTodo();
}

export async function borrarContacto(id: string) {
  const supabase = await createClient();

  // Igual que con la empresa: si tiene oportunidades, no se borra. La
  // oportunidad quedaria sin contacto y nadie se enteraria.
  const { count } = await supabase
    .from("oportunidades")
    .select("id", { count: "exact", head: true })
    .eq("cliente_contacto_id", id);

  if (count && count > 0) {
    throw new Error(
      `No se puede borrar: tiene ${count} oportunidad${count === 1 ? "" : "es"} cargada${count === 1 ? "" : "s"}.`
    );
  }

  const { error } = await supabase.from("cliente_contactos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidarTodo();
}
