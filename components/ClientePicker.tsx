"use client";

import { useMemo, useState } from "react";
import type { ClienteContacto, ClienteEmpresa } from "@/lib/types";

// Elegir el cliente de la oportunidad: empresa y persona, las dos del maestro,
// con la opcion de crear cualquiera de las dos sin salir del formulario.
//
// Lo que viaja al servidor:
//
//   cliente_empresa_id     uuid de una empresa existente, o "nueva"
//   empresa_nueva          el nombre, cuando se eligio "nueva"
//   cliente_contacto_id    uuid de un contacto existente, "nuevo", o vacio
//   contacto_nuevo_*       nombre, mail, telefono y linkedin del nuevo
//
// El servidor es el que decide: si viene "nueva" crea la empresa (o reusa la
// que ya exista con ese nombre) y despues el contacto. Aca no se escribe nada
// en la base: un desplegable no puede quedar a medio guardar.
export default function ClientePicker({
  empresas,
  contactos,
  empresaId,
  contactoId,
}: {
  empresas: ClienteEmpresa[];
  contactos: ClienteContacto[];
  // Valores actuales, cuando se esta editando una oportunidad.
  empresaId?: string | null;
  contactoId?: string | null;
}) {
  const [empresa, setEmpresa] = useState(empresaId ?? "");
  const [contacto, setContacto] = useState(contactoId ?? "");

  // Los contactos que se ofrecen son los de la empresa elegida: mostrar todos
  // seria ofrecer a la persona equivocada.
  const contactosDeLaEmpresa = useMemo(
    () => contactos.filter((c) => c.empresa_id === empresa),
    [contactos, empresa]
  );

  const elegido = contactos.find((c) => c.id === contacto) ?? null;
  const empresaNueva = empresa === "nueva";
  const contactoNuevo = contacto === "nuevo";

  return (
    <>
      <div className="fg">
        <label>Compania / cliente</label>
        <select
          name="cliente_empresa_id"
          value={empresa}
          onChange={(e) => {
            setEmpresa(e.target.value);
            // Cambiar de empresa invalida el contacto: pertenecia a la otra.
            setContacto("");
          }}
          required
        >
          <option value="">Elegir empresa...</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
          <option value="nueva">+ Nueva empresa</option>
        </select>

        {empresaNueva && (
          <input
            name="empresa_nueva"
            placeholder="Nombre de la empresa"
            required
            autoFocus
          />
        )}
      </div>

      <div className="fg">
        <label>Contacto</label>
        <select
          name="cliente_contacto_id"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          disabled={!empresa}
        >
          <option value="">Sin contacto</option>
          {contactosDeLaEmpresa.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre ?? c.email ?? c.telefono}
              {c.cargo ? ` · ${c.cargo}` : ""}
            </option>
          ))}
          <option value="nuevo">+ Nuevo contacto</option>
        </select>

        {/* Los datos del contacto elegido se muestran pero no se editan aca:
            se corrigen en la base de clientes, que es donde viven. */}
        {elegido && !contactoNuevo && (
          <span className="hint">
            {[elegido.email, elegido.telefono].filter(Boolean).join(" · ") ||
              "sin mail ni telefono cargados"}
          </span>
        )}
        {!empresa && <span className="hint">Primero elegi la empresa</span>}
      </div>

      {contactoNuevo && (
        <>
          <div className="fg">
            <label>Nombre y apellido</label>
            <input name="contacto_nuevo_nombre" placeholder="Nombre del contacto" autoFocus />
          </div>
          <div className="fg">
            <label>Mail</label>
            <input
              type="email"
              name="contacto_nuevo_email"
              placeholder="nombre@empresa.com"
            />
          </div>
          <div className="fg">
            <label>Telefono</label>
            <input type="tel" name="contacto_nuevo_telefono" placeholder="+54 9 11 ..." />
          </div>
          <div className="fg">
            <span className="hint">
              El contacto queda cargado en la base de clientes y despues aparece en
              este desplegable.
            </span>
          </div>
        </>
      )}
    </>
  );
}
