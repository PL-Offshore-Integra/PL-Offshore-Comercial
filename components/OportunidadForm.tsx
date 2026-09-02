"use client";

import { useState } from "react";
import {
  camposDe,
  ESTADIOS,
  ESTRUCTURAS,
  type Concepto,
  type EstructuraTarifaria,
  type Oportunidad,
  type Tarifa,
} from "@/lib/types";

// Los dos estadios cerrados no se eligen a mano: se llega por los botones
// Ganar y Perder de la ficha, que son los que crean el proyecto o exigen el
// motivo. Dejarlos en el desplegable seria ofrecer un camino que la base
// rechaza.
const ESTADIOS_ABIERTOS = ESTADIOS.filter(
  (e) => e.estadio !== "Ganado" && e.estadio !== "Perdido"
);

export default function OportunidadForm({
  action,
  oportunidad,
  tarifas = [],
}: {
  action: (formData: FormData) => void;
  oportunidad?: Oportunidad;
  tarifas?: Tarifa[];
}) {
  // La estructura vive en estado porque de ella dependen los casilleros de
  // monto: elegir "Daily Hire + Mobilization + Demobilization" tiene que hacer
  // aparecer esos tres en el momento, sin recargar.
  const [estructura, setEstructura] = useState<EstructuraTarifaria>(
    oportunidad?.estructura_tarifaria ?? "diaria"
  );
  const campos = camposDe(estructura);

  const montoDe = (concepto: Concepto) => {
    const t = tarifas.find((x) => x.concepto === concepto);
    return t ? String(t.monto) : "";
  };

  return (
    <form action={action} className="card">
      <div className="form-section">Oportunidad</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nro Oportunidad</label>
          <input
            name="nro_oportunidad"
            defaultValue={oportunidad?.nro_oportunidad ?? ""}
            readOnly={!oportunidad}
            placeholder={oportunidad ? "" : "se genera solo al guardar"}
          />
        </div>
        <div className="fg">
          <label>Compania / cliente</label>
          <input name="compania" defaultValue={oportunidad?.compania} required />
        </div>

        <div className="fg">
          <label>Estadio</label>
          <select name="estadio" defaultValue={oportunidad?.estadio ?? "Investigando"}>
            {ESTADIOS_ABIERTOS.map((e) => (
              <option key={e.estadio} value={e.estadio}>
                {e.estadio} ({Math.round(e.probabilidad * 100)}%)
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Cliente final</label>
          <input
            name="cliente_final"
            defaultValue={oportunidad?.cliente_final ?? ""}
            placeholder="Para quien es el trabajo"
          />
        </div>
        <div className="fg">
          <label>Buque que se podria usar</label>
          <input
            name="buque"
            defaultValue={oportunidad?.buque ?? ""}
            placeholder="Atlantic Dama"
          />
        </div>
      </div>

      <div className="form-section">Contacto</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nombre y apellido</label>
          <input name="contacto" defaultValue={oportunidad?.contacto ?? ""} />
        </div>
        <div className="fg">
          <label>Mail</label>
          <input
            type="email"
            name="contacto_email"
            defaultValue={oportunidad?.contacto_email ?? ""}
            placeholder="nombre@empresa.com"
          />
        </div>
        <div className="fg">
          <label>Telefono de contacto</label>
          <input
            type="tel"
            name="contacto_telefono"
            defaultValue={oportunidad?.contacto_telefono ?? ""}
            placeholder="+54 9 11 ..."
          />
        </div>
        <div className="fg">
          <label>Linkedin</label>
          <input
            name="contacto_linkedin"
            defaultValue={oportunidad?.contacto_linkedin ?? ""}
            placeholder="linkedin.com/in/..."
          />
        </div>
      </div>

      <div className="form-section">La tarea</div>
      <div className="fg mb16">
        <label>En que consiste</label>
        <textarea
          name="descripcion_alcance"
          defaultValue={oportunidad?.descripcion_alcance ?? ""}
          rows={4}
          placeholder="Que hay que hacer, con que alcance y en que condiciones"
        />
      </div>
      <div className="form-grid">
        <div className="fg">
          <label>Alcance (categoria)</label>
          <input
            name="alcance_oportunidad"
            defaultValue={oportunidad?.alcance_oportunidad ?? ""}
            placeholder="Crewing, Supply Chain, Project Management..."
          />
        </div>
        <div className="fg">
          <label>Inicio estimado del trabajo</label>
          <input
            type="date"
            name="fecha_inicio_estimada"
            defaultValue={oportunidad?.fecha_inicio_estimada ?? ""}
          />
        </div>
        <div className="fg">
          <label>Fin estimado del trabajo</label>
          <input
            type="date"
            name="fecha_fin_estimada"
            defaultValue={oportunidad?.fecha_fin_estimada ?? ""}
          />
        </div>
      </div>

      <div className="form-section">Numeros y seguimiento</div>
      <div className="form-grid">
        <div className="fg">
          <label>Estructura de cotizacion</label>
          <select
            name="estructura_tarifaria"
            value={estructura}
            onChange={(e) => setEstructura(e.target.value as EstructuraTarifaria)}
          >
            {ESTRUCTURAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        {/* Los casilleros de monto salen de la estructura elegida: cambiarla
            cambia que se pide. El concepto y la unidad viajan escondidos
            porque son lo que se guarda; la persona solo escribe el numero.
            Los cuatro campos vacios mantienen alineados los arrays que arma
            el server con getAll(). */}
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
            <input type="hidden" name="tarifa_detalle" value="" />
            <input type="hidden" name="tarifa_cantidad" value="" />
            <input type="hidden" name="tarifa_horas" value="" />
          </div>
        ))}

        <div className="fg">
          <label>Valor total de la propuesta</label>
          <input type="number" step="0.01" name="valor" defaultValue={oportunidad?.valor ?? 0} />
        </div>
        <div className="fg">
          <label>Fecha de alta</label>
          <input
            type="date"
            name="fecha_creacion"
            defaultValue={oportunidad?.fecha_creacion ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="fg">
          <label>Fecha esperada de cierre de la venta</label>
          <input
            type="date"
            name="fecha_esperada_cierre"
            defaultValue={oportunidad?.fecha_esperada_cierre ?? ""}
          />
        </div>
        <div className="fg">
          <label>Ultimo contacto</label>
          <input type="date" name="last_interacted_on" defaultValue={oportunidad?.last_interacted_on ?? ""} />
        </div>
      </div>

      <div className="form-section">Seguimiento</div>
      <div className="fg mb16">
        <label>Proximos Pasos</label>
        <input name="proximos_pasos" defaultValue={oportunidad?.proximos_pasos ?? ""} />
      </div>
      <div className="fg mb16">
        <label>Notas</label>
        <textarea name="notas" defaultValue={oportunidad?.notas ?? ""} rows={4} />
      </div>
      <div className="fg">
        <label>Referencias</label>
        <input name="referencias" defaultValue={oportunidad?.referencias ?? ""} />
      </div>

      <div className="flex-between mt16" style={{ justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </div>
    </form>
  );
}
