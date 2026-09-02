import { createClient } from "@/lib/supabase/server";
import type { ClienteContacto, ClienteEmpresa } from "@/lib/types";

// El maestro de clientes, para los desplegables del formulario de oportunidad.
// Se leen las dos tablas completas de una: son cientos de filas como mucho, y
// filtrar los contactos por empresa del lado del navegador evita ir y volver
// al servidor cada vez que se cambia la empresa elegida.
export async function leerMaestroClientes(): Promise<{
  empresas: ClienteEmpresa[];
  contactos: ClienteContacto[];
}> {
  const supabase = await createClient();

  const [{ data: empresas }, { data: contactos }] = await Promise.all([
    supabase.from("cliente_empresas").select("*").order("nombre", { ascending: true }),
    supabase.from("cliente_contactos").select("*").order("nombre", { ascending: true }),
  ]);

  return {
    empresas: (empresas ?? []) as ClienteEmpresa[],
    contactos: (contactos ?? []) as ClienteContacto[],
  };
}
