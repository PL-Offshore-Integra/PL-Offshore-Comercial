"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import {
  ADICIONALES,
  camposDe,
  CONTRATACIONES,
  IVAS,
  MONEDAS,
  type ClienteContacto,
  type ClienteEmpresa,
  type Concepto,
  type EstructuraTarifaria,
  type Moneda,
  type Plantilla,
  type PlantillaTarifa,
} from "@/lib/types";

export const ID_FORM_PLANTILLA = "form-plantilla";

// El punto de partida de un proyecto que se repite.
//
// El cliente se elige solo de los que ya estan: una plantilla se arma con
// clientes existentes, y crear una empresa desde aca seria crearla sin
// ninguna oportunidad ni proyecto que la justifique. Para eso esta el
// formulario de la oportunidad.
export default function PlantillaForm({
  action,
  plantilla,
  tarifas = [],
  empresas,
  contactos,
}: {
  action: (formData: FormData) => void;
  plantilla?: Plantilla;
  tarifas?: PlantillaTarifa[];
  empresas: ClienteEmpresa[];
  contactos: ClienteContacto[];
}) {
  const [tipo, setTipo] = useState<EstructuraTarifaria>(
    plantilla?.estructura_tarifaria ?? "time_charter"
  );
  const [empresa, setEmpresa] = useState(plantilla?.cliente_empresa_id ?? "");

  const contactosDeLaEmpresa = useMemo(
    () => contactos.filter((c) => c.empresa_id === empresa),
    [contactos, empresa]
  );

  const montoDe = (concepto: Concepto) => {
    const t = tarifas.find((x) => x.concepto === concepto);
    return t ? String(t.monto) : "";
  };

  const campos = [...camposDe(tipo), ...ADICIONALES];

  return (
    <form action={action} className="card" id={ID_FORM_PLANTILLA}>
      <div className="form-section">La plantilla</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nombre</label>
          <input
            name="nombre"
            defaultValue={plantilla?.nombre ?? ""}
            placeholder="Service Management / STS"
            required
            autoFocus={!plantilla}
          />
          <span className="hint">Como se la va a elegir al crear un proyecto</span>
        </div>
        <div className="fg">
          <label>Se ofrece al crear un proyecto</label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            <input
              type="checkbox"
              name="activa"
              defaultChecked={plantilla ? plantilla.activa : true}
              style={{ width: "auto", height: "auto" }}
            />
            <span>Activa</span>
          </label>
          <span className="hint">Desmarcala para retirarla sin borrarla</span>
        </div>
      </div>
      <div className="fg mb16">
        <label>Que trabajo describe</label>
        <textarea
          name="descripcion"
          defaultValue={plantilla?.descripcion ?? ""}
          rows={3}
          placeholder="Operacion STS con el Golondrina de Mar como supply"
        />
      </div>

      <div className="form-section">Cliente habitual</div>
      <div className="form-grid">
        <div className="fg">
          <label>Compania</label>
          <select
            name="cliente_empresa_id"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          >
            <option value="">Sin cliente fijo</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <span className="hint">
            {empresas.length === 0
              ? "Todavia no hay empresas cargadas"
              : "Se puede dejar vacio: la plantilla describe el trabajo, no el cliente"}
          </span>
        </div>
        <div className="fg">
          <label>Contacto</label>
          <select
            name="cliente_contacto_id"
            defaultValue={plantilla?.cliente_contacto_id ?? ""}
            disabled={!empresa}
            key={empresa}
          >
            <option value="">Sin contacto</option>
            {contactosDeLaEmpresa.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre ?? c.email ?? c.telefono}
              </option>
            ))}
          </select>
          {!empresa && <span className="hint">Primero elegi la compania</span>}
        </div>
        <div className="fg">
          <label>Cliente final habitual</label>
          <input
            name="cliente_final"
            defaultValue={plantilla?.cliente_final ?? ""}
            placeholder="Para quien suele ser el trabajo"
          />
        </div>
      </div>

      <div className="form-section">El trabajo</div>
      <div className="form-grid">
        <div className="fg">
          <label>Buque habitual</label>
          <input
            name="buque"
            defaultValue={plantilla?.buque ?? ""}
            placeholder="Golondrina de Mar"
          />
        </div>
        <div className="fg">
          <label>Alcance</label>
          <input name="alcance" defaultValue={plantilla?.alcance ?? ""} />
        </div>
      </div>

      <div className="form-section">Condiciones y tarifas</div>
      <div className="form-grid">
        <div className="fg">
          <label>Tipo de contratacion</label>
          <select
            name="estructura_tarifaria"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as EstructuraTarifaria)}
          >
            {CONTRATACIONES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Moneda</label>
          <select name="moneda" defaultValue={plantilla?.moneda ?? "USD"}>
            {MONEDAS.map((m: { id: Moneda; label: string }) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>IVA</label>
          <select name="iva" defaultValue={plantilla?.iva ?? "21"}>
            {IVAS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        {campos.map((c) => (
          <div className="fg" key={c.concepto}>
            <label>{c.label}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="tarifa_monto"
              defaultValue={montoDe(c.concepto)}
              placeholder="0.00"
            />
            <input type="hidden" name="tarifa_concepto" value={c.concepto} />
            <input type="hidden" name="tarifa_unidad" value={c.unidad} />
          </div>
        ))}
      </div>
      <div className="fg">
        <span className="hint">
          Estos numeros son el arranque de cada proyecto que use la plantilla.
          Cambiarlos aca NO toca los proyectos ya creados: un acuerdo cerrado no
          cambia porque alguien corrigio una plantilla.
        </span>
      </div>

      <div className="form-section">Notas</div>
      <div className="fg">
        <textarea name="notas" defaultValue={plantilla?.notas ?? ""} rows={3} />
      </div>

      <PieDeLaPlantilla />
    </form>
  );
}

export function PieDeLaPlantilla() {
  return (
    <div className="flex-between mt16">
      <Link href="/plantillas" className="btn btn-ghost">
        Atras
      </Link>
      <BotonGuardar form={ID_FORM_PLANTILLA} />
    </div>
  );
}
