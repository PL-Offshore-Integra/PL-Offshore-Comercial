"use client";

import Link from "next/link";
import { useState } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import { aInputLocal } from "@/lib/fechas";
import {
  ADICIONALES,
  calcularValor,
  camposDe,
  CONTRATACIONES,
  diasDeOperacion,
  ESTADOS_OPERACION,
  IVAS,
  MONEDAS,
  type Concepto,
  type EstructuraTarifaria,
  type Moneda,
  type Operacion,
  type OperacionTarifa,
  type ProyectoTarifa,
  type Proyecto,
} from "@/lib/types";

export const ID_FORM_OPERACION = "form-operacion";

const plata = (moneda: Moneda, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(valor);

// La salida concreta: fechas con hora, buque, cliente final y su tarifa.
//
// Las fechas llevan hora y no es un adorno. En estos trabajos se cobra por dia
// fraccionado: la operacion del Golondrina de agosto fue del 20/08 07:00 al
// 21/08 12:30, y las 0.23 jornadas que pasaron de las 24 h se cobraron pro
// rata. Con fechas sin hora esa cuenta no existe.
//
// Lo que no se elige aca se hereda del proyecto —buque, cliente final, moneda,
// IVA, tipo de contratacion— porque es lo habitual, y se puede cambiar porque
// entre una salida y otra cambia.
export default function OperacionForm({
  action,
  proyecto,
  operacion,
  tarifas = [],
  nroQueSigue,
}: {
  action: (formData: FormData) => void;
  proyecto: Proyecto;
  operacion?: Operacion;
  // Editando una salida son las suyas; creandola, las del proyecto, que se
  // usan como punto de partida.
  tarifas?: (OperacionTarifa | ProyectoTarifa)[];
  nroQueSigue?: string;
}) {
  const [tipo, setTipo] = useState<EstructuraTarifaria>(
    operacion?.estructura_tarifaria ?? proyecto.estructura_tarifaria ?? "time_charter"
  );
  const [moneda, setMoneda] = useState<Moneda>(operacion?.moneda ?? proyecto.moneda ?? "USD");
  const [inicio, setInicio] = useState(aInputLocal(operacion?.fecha_inicio));
  const [fin, setFin] = useState(aInputLocal(operacion?.fecha_fin));

  const [montos, setMontos] = useState<Partial<Record<Concepto, string>>>(() => {
    const inicial: Partial<Record<Concepto, string>> = {};
    for (const t of tarifas) inicial[t.concepto] = String(t.monto);
    return inicial;
  });

  const campos = [...camposDe(tipo), ...ADICIONALES];

  // Los dias salen de las dos fechas, con sus horas. No se escriben.
  const dias = diasDeOperacion(
    inicio ? `${inicio}:00` : null,
    fin ? `${fin}:00` : null
  );

  const valor = calcularValor(
    tipo,
    Object.fromEntries(
      Object.entries(montos).map(([c, v]) => [c, Number(v) || 0])
    ) as Partial<Record<Concepto, number>>,
    dias
  );

  return (
    <form action={action} className="card" id={ID_FORM_OPERACION}>
      <input type="hidden" name="proyecto_id" value={proyecto.id} />

      <div className="form-section">La salida</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nro Operacion</label>
          {operacion?.nro_operacion ? (
            <input value={operacion.nro_operacion} readOnly />
          ) : (
            <>
              <input value={nroQueSigue ?? "—"} readOnly />
              <span className="hint">Lo asigna el sistema al guardar</span>
            </>
          )}
        </div>
        <div className="fg">
          <label>Nombre de la operacion</label>
          <input
            name="nombre"
            defaultValue={operacion?.nombre ?? ""}
            placeholder="RAIZEN AGO2026 SEAWAYS BALBOA"
            required
            autoFocus={!operacion}
          />
          <span className="hint">Como se la nombra entre ustedes</span>
        </div>
        <div className="fg">
          <label>Estado</label>
          <select name="estado" defaultValue={operacion?.estado ?? "planificada"}>
            {ESTADOS_OPERACION.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Proyecto</label>
          {/* Una operacion no cambia de proyecto: seria otra salida. */}
          <input value={`${proyecto.nro_proyecto ?? ""} · ${proyecto.nombre}`} readOnly />
          <span className="hint">{proyecto.compania ?? "sin cliente"}</span>
        </div>
        <div className="fg">
          <label>Buque</label>
          <input
            name="buque"
            defaultValue={operacion?.buque ?? proyecto.buque ?? ""}
            placeholder="Golondrina de Mar"
          />
          <span className="hint">El que salio de verdad</span>
        </div>
        <div className="fg">
          <label>Cliente final</label>
          <input
            name="cliente_final"
            defaultValue={operacion?.cliente_final ?? proyecto.cliente_final ?? ""}
            placeholder="Raizen"
          />
          <span className="hint">Para quien fue esta salida</span>
        </div>
        <div className="fg">
          <label>Zona</label>
          <input name="zona" defaultValue={operacion?.zona ?? ""} placeholder="Alfa" />
        </div>
        <div className="fg">
          <label>Buque madre</label>
          <input
            name="buque_madre"
            defaultValue={operacion?.buque_madre ?? ""}
            placeholder="Seaways Balboa"
          />
          <span className="hint">Si es un STS</span>
        </div>
      </div>

      <div className="form-section">Cuando</div>
      <div className="form-grid">
        {/* Con hora, porque de la hora sale la fraccion de dia que se cobra. */}
        <div className="fg">
          <label>Desde</label>
          <input
            type="datetime-local"
            name="fecha_inicio"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div className="fg">
          <label>Hasta</label>
          <input
            type="datetime-local"
            name="fecha_fin"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </div>
        <div className="fg">
          <label>Duracion</label>
          <div className="dato">
            {dias === null ? (
              <span className="text-muted">Falta alguna de las dos fechas</span>
            ) : (
              <strong>{dias.toFixed(2)} dias</strong>
            )}
          </div>
          <span className="hint">Sale de las dos fechas, con sus horas</span>
        </div>
      </div>

      <div className="form-section">Tarifa de esta salida</div>
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
          <select
            name="moneda"
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as Moneda)}
          >
            {MONEDAS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>IVA</label>
          <select name="iva" defaultValue={operacion?.iva ?? proyecto.iva ?? "21"}>
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
              value={montos[c.concepto] ?? ""}
              onChange={(e) =>
                setMontos((m) => ({ ...m, [c.concepto]: e.target.value }))
              }
              placeholder="0.00"
            />
            <input type="hidden" name="tarifa_concepto" value={c.concepto} />
            <input type="hidden" name="tarifa_unidad" value={c.unidad} />
            <input type="hidden" name="tarifa_detalle" value="" />
          </div>
        ))}

        <div className="fg">
          {/* No se escribe: es la misma cuenta que hace el servidor al
              guardar. */}
          <label>Valor de la salida</label>
          <div className="dato">
            <strong>{plata(moneda, valor)}</strong>
          </div>
          <span className="hint">
            {tipo === "time_charter"
              ? "Daily hire x dias + mobilization + demobilization"
              : tipo === "dia_garantizado"
                ? "Dia garantizado + lo que pasa de las 24 h pro rata + mob + demob"
                : "Lump sum + mobilization + demobilization"}
          </span>
        </div>
      </div>

      <div className="form-section">Comentarios</div>
      <div className="fg">
        <textarea name="comentarios" defaultValue={operacion?.comentarios ?? ""} rows={3} />
      </div>

      {/* En el alta el pie va aca. En la ficha lo dibuja la pagina despues de
          la documentacion, igual que en oportunidades y proyectos. */}
      {!operacion && <PieDeLaOperacion proyectoId={proyecto.id} />}
    </form>
  );
}

export function PieDeLaOperacion({ proyectoId }: { proyectoId: string }) {
  return (
    <div className="flex-between mt16">
      <Link href={`/proyectos/${proyectoId}`} className="btn btn-ghost">
        Atras
      </Link>
      <BotonGuardar form={ID_FORM_OPERACION} />
    </div>
  );
}

