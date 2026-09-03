import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// Resuelve el cliente que eligio un formulario y, si vino nuevo, lo crea.
//
// Vive aca y no dentro de las acciones de oportunidades porque lo usan las
// dos pantallas: una oportunidad elige su cliente, y desde que un proyecto
// puede nacer sin oportunidad, el proyecto tambien. Una sola copia significa
// que las dos crean empresas y contactos con el mismo criterio.
//
// Devuelve lo que hay que guardar en la fila: los dos FK y la foto de texto.
// La foto no es redundancia por comodidad: es el nombre con el que se cargo
// este registro, y si manana la empresa se renombra, los viejos conservan el
// suyo.
//
// Una empresa "nueva" que ya existe con ese nombre no se duplica: se reusa. El
// indice unico de 0009 es sobre lower(trim(nombre)), asi que "excelerate" y
// "Excelerate " son la misma.
export async function resolverCliente(supabase: Cliente, formData: FormData) {
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
