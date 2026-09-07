"use client";

import Link from "next/link";
import { BotonGuardar } from "@/components/BotonGuardar";
import { type BrokerContacto } from "@/lib/types";

export const ID_FORM_CONTACTO = "form-contacto";

// Un contacto del mailing list.
//
// El mail es lo unico obligatorio: es lo que lo identifica y es lo unico que
// la planilla de origen tiene siempre bien. El resto se completa si se sabe.
export default function ContactoForm({
  action,
  contacto,
}: {
  action: (formData: FormData) => void;
  contacto?: BrokerContacto;
}) {
  const v = (campo: keyof BrokerContacto) => {
    const dato = contacto?.[campo];
    return dato === null || dato === undefined ? "" : String(dato);
  };

  return (
    <form action={action} className="card" id={ID_FORM_CONTACTO}>
      <div className="form-section">Quien es</div>
      <div className="form-grid">
        <div className="fg">
          <label>Mail</label>
          <input
            name="email"
            type="email"
            defaultValue={v("email")}
            placeholder="nombre.apellido@empresa.com"
            required
            autoFocus={!contacto}
          />
          <span className="hint">Lo que identifica al contacto. Unico en la lista.</span>
        </div>
        <div className="fg">
          <label>Nombre</label>
          <input name="nombre" defaultValue={v("nombre")} placeholder="Daniel" />
        </div>
        <div className="fg">
          <label>Apellido</label>
          <input name="apellido" defaultValue={v("apellido")} placeholder="Vrenner" />
        </div>
      </div>

      <div className="form-section">De donde</div>
      <div className="form-grid">
        <div className="fg">
          <label>Empresa</label>
          <input name="empresa" defaultValue={v("empresa")} placeholder="Akali Marine" />
          <span className="hint">
            Si esta vacia es porque la planilla no la pudo deducir del mail. Se
            completa a mano.
          </span>
        </div>
        <div className="fg">
          <label>Pais</label>
          <input name="pais" defaultValue={v("pais")} placeholder="Singapur" />
        </div>
        <div className="fg">
          <label>Dominio</label>
          <input name="dominio" defaultValue={v("dominio")} placeholder="akalimarine.com" />
          <span className="hint">Si se deja vacio, se toma del mail.</span>
        </div>
        <div className="fg">
          <label>Sigue en la lista</label>
          <label className="fila-check">
            <input type="checkbox" name="activo" defaultChecked={contacto?.activo ?? true} />
            <span>Activo</span>
          </label>
          <span className="hint">
            Destildalo para dejar de escribirle sin perder el contacto.
          </span>
        </div>
      </div>

      <div className="form-section">Notas</div>
      <div className="fg">
        <textarea
          name="notas"
          defaultValue={v("notas")}
          rows={3}
          placeholder="Que buques maneja, que anda buscando, cuando fue el ultimo contacto"
        />
      </div>

      <div className="flex-between mt16">
        <Link href="/broker/contactos" className="btn btn-ghost">
          Atras
        </Link>
        <BotonGuardar form={ID_FORM_CONTACTO} />
      </div>
    </form>
  );
}
