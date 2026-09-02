"use client";

import Link from "next/link";
import { useState } from "react";
import ClientePicker from "@/components/ClientePicker";
import type { ClienteContacto, ClienteEmpresa } from "@/lib/types";
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
// Ganado y Perdido de la lista, y Perdido es el que pide el motivo. Dejarlos
// en el desplegable seria ofrecer un camino que la base rechaza.
const ESTADIOS_ABIERTOS = ESTADIOS.filter(
  (e) => e.estadio !== "Ganado" && e.estadio !== "Perdido"
);

const HOY = () => new Date().toISOString().slice(0, 10);

export default function OportunidadForm({
  action,
  oportunidad,
  tarifas = [],
  contadores = null,
  empresas,
  contactos,
}: {
  action: (formData: FormData) => void;
  oportunidad?: Oportunidad;
  tarifas?: Tarifa[];
  // El maestro de clientes, para los dos desplegables.
  empresas: ClienteEmpresa[];
  contactos: ClienteContacto[];
  // Cuantas oportunidades lleva cada anio, para poder mostrar el numero que
  // sigue antes de guardar. Solo se usa en el alta. null = no se pudo leer.
  contadores?: Record<number, number> | null;
}) {
  // La estructura vive en estado porque de ella dependen los casilleros de
  // monto: elegir "Daily Hire + Mobilization + Demobilization" tiene que hacer
  // aparecer esos tres en el momento, sin recargar.
  const [estructura, setEstructura] = useState<EstructuraTarifaria>(
    oportunidad?.estructura_tarifaria ?? "diaria"
  );
  const campos = camposDe(estructura);

  // La fecha de alta esta en estado porque el numero depende de ella: el anio
  // del numero es el de la fecha que se carga, no el del reloj. Si alguien
  // pone una fecha del anio pasado, el numero acompana.
  const [fechaAlta, setFechaAlta] = useState(oportunidad?.fecha_creacion ?? HOY());

  const anio = Number(fechaAlta.slice(0, 4));
  const nroQueSigue =
    contadores && Number.isInteger(anio) && anio > 1900
      ? `Ploffshore-${(contadores[anio] ?? 0) + 1}-${anio}`
      : "—";

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
          {oportunidad?.nro_oportunidad ? (
            // Una oportunidad ya numerada tampoco se edita: cambiarle el
            // numero a mano rompe la correspondencia con lo que se le mando
            // al cliente. Viaja escondido para no borrarlo en el update.
            <>
              <input value={oportunidad.nro_oportunidad} readOnly />
              <input type="hidden" name="nro_oportunidad" value={oportunidad.nro_oportunidad} />
            </>
          ) : oportunidad ? (
            // Excepcion: una fila vieja que quedo sin numero. El trigger solo
            // actua al insertar, asi que el unico modo de completarla es a
            // mano.
            <>
              <input name="nro_oportunidad" defaultValue="" placeholder="Ploffshore-1-2026" />
              <span className="hint">Esta oportunidad quedo sin numero: se puede completar</span>
            </>
          ) : (
            // En el alta va SIN name: lo que se ve es el numero que sigue,
            // pero el que queda es el que asigna la base al insertar. Si se
            // mandara este valor y otra persona guardo primero, entrarian dos
            // oportunidades con el mismo numero.
            <>
              <input value={nroQueSigue} readOnly />
              <span className="hint">Lo asigna el sistema al guardar</span>
            </>
          )}
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
      </div>

      <div className="form-section">Cliente y contacto</div>
      <div className="form-grid">
        {/* Empresa y persona salen del maestro de clientes, con la opcion de
            crear cualquiera de las dos ahi mismo. Los campos de texto que
            habia antes (nombre, mail, telefono, linkedin sueltos en la
            oportunidad) se cargan una vez en el cliente y se reusan. */}
        <ClientePicker
          empresas={empresas}
          contactos={contactos}
          empresaId={oportunidad?.cliente_empresa_id}
          contactoId={oportunidad?.cliente_contacto_id}
        />
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
        {/* El buque vive aca y no arriba: es parte de lo que la tarea
            necesita, no de la identidad de la oportunidad. */}
        <div className="fg">
          <label>Buque que se podria usar</label>
          <input
            name="buque"
            defaultValue={oportunidad?.buque ?? ""}
            placeholder="Atlantic Dama"
          />
        </div>
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
            value={fechaAlta}
            onChange={(e) => setFechaAlta(e.target.value)}
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

      {/* Atras sale sin guardar: es un link y no un boton dentro del form,
          asi no puede disparar el submit por accidente. */}
      <div className="flex-between mt16">
        <Link href="/oportunidades" className="btn btn-ghost">
          Atras
        </Link>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </div>
    </form>
  );
}
