"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function fields(formData: FormData) {
  return {
    compania: str(formData, "compania") ?? "",
    nombre_proyecto: str(formData, "nombre_proyecto") ?? "",
    alcance_oportunidad: str(formData, "alcance_oportunidad"),
    descripcion_alcance: str(formData, "descripcion_alcance"),
    nro_oportunidad: str(formData, "nro_oportunidad"),
    contacto: str(formData, "contacto"),
    estadio: str(formData, "estadio") ?? "Investigando",
    valor: num(formData, "valor"),
    costo: num(formData, "costo"),
    fecha_creacion: str(formData, "fecha_creacion") ?? new Date().toISOString().slice(0, 10),
    fecha_esperada_cierre: str(formData, "fecha_esperada_cierre"),
    empresa: str(formData, "empresa") ?? "Terra Mare",
    last_interacted_on: str(formData, "last_interacted_on"),
    proximos_pasos: str(formData, "proximos_pasos"),
    notas: str(formData, "notas"),
    referencias: str(formData, "referencias"),
  };
}

export async function createOportunidad(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("oportunidades").insert(fields(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/oportunidades");
  redirect("/oportunidades");
}

export async function updateOportunidad(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("oportunidades").update(fields(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/oportunidades");
  redirect("/oportunidades");
}

export async function deleteOportunidad(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("oportunidades").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/oportunidades");
}
