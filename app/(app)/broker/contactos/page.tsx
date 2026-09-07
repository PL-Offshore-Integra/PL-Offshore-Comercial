import Link from "next/link";
import ListaContactos from "@/components/ListaContactos";
import TabsBroker from "@/components/TabsBroker";
import { createClient } from "@/lib/supabase/server";
import { type BrokerContacto } from "@/lib/types";

export default async function ContactosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("broker_contactos")
    .select("*")
    .order("empresa", { ascending: true, nullsFirst: false })
    .order("email", { ascending: true });

  const contactos = (data ?? []) as BrokerContacto[];
  const sinEmpresa = contactos.filter((c) => c.empresa === null).length;

  return (
    <div>
      <TabsBroker />

      {error && (
        <div className="info-box danger mb16">
          No se pudieron leer los contactos: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">
            supabase/migrations/0037_contactos_del_broker.sql
          </span>
          .
        </div>
      )}

      <div className="info-box accent mb16">
        La lista a la que se le ofrece el{" "}
        <Link href="/broker/tonelaje">tonelaje</Link>. Se filtra y despues se{" "}
        <strong>copian los mails</strong> con el boton de la derecha, que es lo
        que se hace de verdad con una lista de mails.
      </div>

      {sinEmpresa > 0 && (
        <div className="info-box warn mb16">
          <strong>{sinEmpresa} contactos no tienen la empresa cargada.</strong>{" "}
          No es que se perdio: la planilla de origen dedujo el nombre y la
          empresa partiendo el usuario del mail, y donde el mail no era
          nombre.apellido no pudo. Se los reconoce porque en la columna de
          empresa aparece el dominio entre parentesis, y se filtran con{" "}
          <strong>Sin empresa</strong>. El mail de todos ellos sirve igual.
        </div>
      )}

      {!error && contactos.length === 0 && (
        <div className="empty-state">
          Todavia no hay contactos cargados.{" "}
          <Link href="/broker/contactos/nuevo">
            <strong>Cargar el primero</strong>
          </Link>
          .
        </div>
      )}

      {contactos.length > 0 && <ListaContactos contactos={contactos} />}
    </div>
  );
}
