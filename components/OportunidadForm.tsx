"use client";

import Link from "next/link";
import { useState } from "react";
import ClientePicker from "@/components/ClientePicker";
import {
  ADICIONALES,
  calcularValor,
  camposDe,
  CONTRATACIONES,
  ESTADOS_OPORTUNIDAD,
  MONEDAS,
  finEstimado,
  type ClienteContacto,
  type ClienteEmpresa,
  type Concepto,
  type EstructuraTarifaria,
  type Moneda,
  type Oportunidad,
  type Tarifa,
} from "@/lib/types";

const HOY = () => new Date().toISOString().slice(0, 10);

// El total se muestra en la moneda elegida, no siempre en dolares.
const plata = (moneda: Moneda, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(valor);

// Cerrar no se hace desde este formulario: se hace desde la lista, donde el
// cierre pide el resultado y, si se perdio, el comentario. Aca solo se elige
// entre los dos estados abiertos.
const ESTADOS_EDITABLES = ESTADOS_OPORTUNIDAD.filter((e) => e.id !== "cerrado");

export const ID_FORM_OPORTUNIDAD = "form-oportunidad";

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
  empresas: ClienteEmpresa[];
  contactos: ClienteContacto[];
  contadores?: Record<number, number> | null;
}) {
  const [tipo, setTipo] = useState<EstructuraTarifaria>(
    oportunidad?.estructura_tarifaria ?? "time_charter"
  );

  // Los montos viven en estado porque de ellos sale el valor total, que se
  // muestra calculado y no se escribe.
  const [montos, setMontos] = useState<Partial<Record<Concepto, string>>>(() => {
    const inicial: Partial<Record<Concepto, string>> = {};
    for (const t of tarifas) inicial[t.concepto] = String(t.monto);
    return inicial;
  });

  const [inicio, setInicio] = useState(oportunidad?.fecha_inicio_estimada ?? "");
  const [dias, setDias] = useState(
    oportunidad?.duracion_estimada_dias ? String(oportunidad.duracion_estimada_dias) : ""
  );
  const [fechaAlta, setFechaAlta] = useState(oportunidad?.fecha_creacion ?? HOY());
  const [moneda, setMoneda] = useState<Moneda>(oportunidad?.moneda ?? "USD");

  const anio = Number(fechaAlta.slice(0, 4));
  const nroQueSigue =
    contadores && Number.isInteger(anio) && anio > 1900
      ? `PL-${(contadores[anio] ?? 0) + 1}-${anio}`
      : "—";

  const campos = [...camposDe(tipo), ...ADICIONALES];

  // El fin estimado no se escribe: sale del inicio mas los dias.
  const diasNum = Number(dias) || 0;
  const fin = inicio && diasNum > 0 ? finEstimado(inicio, diasNum) : "";

  const valor = calcularValor(
    tipo,
    Object.fromEntries(
      Object.entries(montos).map(([c, v]) => [c, Number(v) || 0])
    ) as Partial<Record<Concepto, number>>,
    diasNum
  );

  const cerrada = oportunidad?.estado === "cerrado";

  return (
    <form action={action} className="card" id={ID_FORM_OPORTUNIDAD}>
      <div className="form-section">Oportunidad</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nro Oportunidad</label>
          {oportunidad?.nro_oportunidad ? (
            <>
              <input value={oportunidad.nro_oportunidad} readOnly />
              <input type="hidden" name="nro_oportunidad" value={oportunidad.nro_oportunidad} />
            </>
          ) : oportunidad ? (
            <>
              <input name="nro_oportunidad" defaultValue="" placeholder="PL-1-2026" />
              <span className="hint">Esta oportunidad quedo sin numero: se puede completar</span>
            </>
          ) : (
            <>
              <input value={nroQueSigue} readOnly />
              <span className="hint">Lo asigna el sistema al guardar</span>
            </>
          )}
        </div>
        <div className="fg">
          <label>Estado</label>
          {cerrada ? (
            <>
              <input value="Cerrado" readOnly />
              <span className="hint">Se reabre desde la lista</span>
            </>
          ) : (
            <select name="estado" defaultValue={oportunidad?.estado ?? "abierto"}>
              {ESTADOS_EDITABLES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          )}
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
        <ClientePicker
          empresas={empresas}
          contactos={contactos}
          empresaId={oportunidad?.cliente_empresa_id}
          contactoId={oportunidad?.cliente_contacto_id}
        />
      </div>

      <div className="form-section">La tarea</div>
      <div className="fg mb16">
        <label>Alcance de la tarea</label>
        <textarea
          name="descripcion_alcance"
          defaultValue={oportunidad?.descripcion_alcance ?? ""}
          rows={4}
          placeholder="Que hay que hacer, con que alcance y en que condiciones"
        />
      </div>
      <div className="form-grid">
        <div className="fg">
          <label>Buque que se podria usar</label>
          <input
            name="buque"
            defaultValue={oportunidad?.buque ?? ""}
            placeholder="Atlantic Dama"
          />
        </div>
        <div className="fg">
          <label>Inicio estimado del trabajo</label>
          <input
            type="date"
            name="fecha_inicio_estimada"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div className="fg">
          <label>Duracion estimada (dias)</label>
          <input
            type="number"
            min="1"
            step="1"
            name="duracion_estimada_dias"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            placeholder="30"
          />
        </div>
        <div className="fg">
          {/* No se escribe: es el inicio mas los dias. Arrancar el 1 y durar
              10 dias termina el 10, no el 11. */}
          <label>Fin estimado del trabajo</label>
          <input type="date" name="fecha_fin_estimada" value={fin} readOnly />
          <span className="hint">Lo calcula la duracion</span>
        </div>
      </div>

      <div className="form-section">Condiciones comerciales</div>
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
          {/* En que moneda se cotiza. Al convertir en proyecto, el proyecto la
              hereda. */}
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
            <input type="hidden" name="tarifa_cantidad" value="" />
            <input type="hidden" name="tarifa_horas" value="" />
          </div>
        ))}

        <div className="fg">
          {/* Calculado y de solo lectura. El servidor lo vuelve a calcular al
              guardar con la misma funcion, asi que lo que se ve es lo que
              queda. */}
          <label>Valor total de la propuesta</label>
          <input value={plata(moneda, valor)} readOnly />
          <span className="hint">
            {tipo === "time_charter"
              ? "Daily hire × dias + mobilization + demobilization"
              : "Lump sum + mobilization + demobilization"}
          </span>
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
      </div>

      <div className="form-section">Seguimiento</div>
      <div className="form-grid">
        <div className="fg">
          <label>Ultimo contacto</label>
          <input
            type="date"
            name="last_interacted_on"
            defaultValue={oportunidad?.last_interacted_on ?? ""}
          />
        </div>
      </div>
      <div className="fg">
        {/* Un solo campo: reemplaza a notas, referencias y proximos pasos. Es
            lo que se ve en la lista. */}
        <label>Comentarios</label>
        <textarea
          name="comentarios"
          defaultValue={oportunidad?.comentarios ?? ""}
          rows={4}
          placeholder="Proximos pasos, referencias, lo que haya que recordar"
        />
      </div>

      {!oportunidad && (
        <>
          <div className="form-section">Documentacion</div>
          <div className="fg">
            <label>Adjuntar archivos (hasta 25 MB cada uno)</label>
            <input type="file" name="archivo" multiple />
            <span className="hint">
              Opcional. Despues se pueden agregar mas desde la oportunidad.
            </span>
          </div>
        </>
      )}

      {!oportunidad && <PieDelFormulario />}
    </form>
  );
}

export function PieDelFormulario() {
  return (
    <div className="flex-between mt16">
      <Link href="/oportunidades" className="btn btn-ghost">
        Atras
      </Link>
      <button type="submit" form={ID_FORM_OPORTUNIDAD} className="btn btn-primary">
        Guardar
      </button>
    </div>
  );
}
