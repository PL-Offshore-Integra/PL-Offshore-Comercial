"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEvento(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("eventos").insert({
    fecha: String(formData.get("fecha")),
    evento: String(formData.get("evento")),
    lugar: String(formData.get("lugar") || "") || null,
    referencias: String(formData.get("referencias") || "") || null,
    participa_terra_mare: formData.get("participa_terra_mare") === "on",
    participa_clean_sea: formData.get("participa_clean_sea") === "on",
    participa_parana_logistica: formData.get("participa_parana_logistica") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/calendario");
  redirect("/calendario");
}
