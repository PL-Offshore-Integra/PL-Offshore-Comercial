import Link from "next/link";
import { notFound } from "next/navigation";
import ContactoForm from "@/components/ContactoForm";
import {
  actualizarContacto,
  borrarContacto,
} from "@/app/(app)/broker/contactos/actions";
import { createClient } from "@/lib/supabase/server";
import { nombreContacto, type BrokerContacto } from "@/lib/types";

export default async function ContactoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("broker_contactos")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const contacto = data as BrokerContacto;

  // Los otros contactos de la misma casa. Se agrupa por dominio y no por
  // empresa porque el dominio esta siempre, tambien en los 180 contactos a
  // los que la planilla no les pudo deducir el nombre de la empresa.
  const { data: mismos } = contacto.dominio
    ? await supabase
        .from("broker_contactos")
        .select("*")
        .eq("dominio", contacto.dominio)
        .neq("id", id)
        .order("email", { ascending: true })
    : { data: [] };

  const companeros = (mismos ?? []) as BrokerContacto[];

  const guardar = actualizarContacto.bind(null, contacto.id);
  const eliminar = borrarContacto.bind(null, contacto.id);

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">{nombreContacto(contacto)}</span>
        <form action={eliminar}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>

      <ContactoForm action={guardar} contacto={contacto} />

      {companeros.length > 0 && (
        <div className="card">
          <div className="form-section">
            Otros contactos de {contacto.dominio}
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Quien</th>
                  <th>Mail</th>
                  <th>Pais</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {companeros.map((c) => (
                  <tr key={c.id}>
                    <td>{nombreContacto(c)}</td>
                    <td className="text-mono">{c.email}</td>
                    <td className="text-muted">{c.pais ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/broker/contactos/${c.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="hint">
            Se agrupan por dominio del mail y no por empresa, porque el dominio
            esta siempre. Si a alguno de estos le falta la empresa, este es el
            lugar donde se ve cual es.
          </span>
        </div>
      )}
    </div>
  );
}
