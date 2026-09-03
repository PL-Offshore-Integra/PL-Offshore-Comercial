"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ADICIONALES,
  camposDe,
  ESTADOS_PROYECTO,
  ESTRUCTURAS,
  IVAS,
  MONEDAS,
  type Concepto,
  type EstructuraTarifaria,
  type Oportunidad,
  type Proyecto,
  type ProyectoTarifa,
  type Tarifa,
} from "@/lib/types";

export const ID_FORM_PROYECTO = "form-proyecto";

// El formulario del proyecto sirve para las dos cosas: convertir una
// oportunidad ganada (llega `oportunidad` y `tarifas` de ella) y editar un
// proyecto ya creado (llega `proyecto`).
//
// Lo que viene de la oportunidad se puede editar: es lo que se cotizo, y lo
// que se firma casi nunca es igual. Lo unico que no se toca es el cliente:
// cambiarle el cliente a un trabajo ganado no es una edicion, es otro trabajo.
export default function ProyectoForm({
  action,
  proyecto,
  oportunidad,
  tarifas = [],
  nroQueSigue,
}: {
  action: (formData: FormData) => void;
  proyecto?: Proyecto;
  oportunidad?: Oportunidad;
  tarifas?: (Tarifa | ProyectoTarifa)[];
  nroQueSigue?: string;
}) {
  const [estructura, setEstructura] = useState<EstructuraTarifaria>(
    proyecto?.estructura_tarifaria ?? oportunidad?.estructura_tarifaria ?? "time_charter"
  );
  const campos = camposDe(estructura);

  const montoDe = (concepto: Concepto) => {
    const t = tarifas.find((x) => x.concepto === concepto);
    return t ? String(t.monto) : "";
  };

  // De donde sale cada default: del proyecto si se esta editando, y si no de
  // la oportunidad que se esta convirtiendo.
  const compania = proyecto?.compania ?? oportunidad?.compania ?? "—";
  const contacto = proyecto?.contacto ?? oportunidad?.contacto ?? null;
  // Editando un proyecto manda el valor del proyecto; convirtiendo una
  // oportunidad, el de la oportunidad. Siempre devuelve string: los <input> no
  // aceptan null.
  const desde = (
    delProyecto: string | null | undefined,
    deLaOportunidad: string | null | undefined
  ): string => (proyecto ? (delProyecto ?? "") : (deLaOportunidad ?? ""));

  return (
    <form action={action} className="card" id={ID_FORM_PROYECTO}>
      {oportunidad && (
        <input type="hidden" name="oportunidad_id" value={oportunidad.id} />
      )}

      <div className="form-section">Proyecto</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nro Proyecto</label>
          {proyecto?.nro_proyecto ? (
            <input value={proyecto.nro_proyecto} readOnly />
          ) : (
            <>
              <input value={nroQueSigue ?? "—"} readOnly />
              <span className="hint">Lo asigna el sistema al guardar</span>
            </>
          )}
        </div>
        <div className="fg">
          <label>Nombre del proyecto</label>
          <input
            name="nombre"
            defaultValue={proyecto?.nombre ?? ""}
            placeholder="Como se lo va a llamar en la operacion"
            required
            autoFocus={!proyecto}
          />
        </div>
        <div className="fg">
          <label>Estado</label>
          <select name="estado" defaultValue={proyecto?.estado ?? "por_arrancar"}>
            {ESTADOS_PROYECTO.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Cliente</label>
          {/* Del cliente para abajo no se edita: sale de la oportunidad. */}
          <input value={contacto ? `${compania} · ${contacto}` : compania} readOnly />
          <span className="hint">
            {oportunidad?.nro_oportunidad
              ? `Viene de la oportunidad ${oportunidad.nro_oportunidad}`
              : "Se corrige en la oportunidad de origen"}
          </span>
        </div>
      </div>

      <div className="form-section">El trabajo</div>
      <div className="fg mb16">
        <label>En que consiste</label>
        <textarea
          name="descripcion"
          defaultValue={desde(proyecto?.descripcion, oportunidad?.descripcion_alcance)}
          rows={4}
        />
      </div>
      <div className="form-grid">
        <div className="fg">
          <label>Buque</label>
          <input
            name="buque"
            defaultValue={desde(proyecto?.buque, oportunidad?.buque)}
            placeholder="Atlantic Dama"
          />
        </div>
        <div className="fg">
          <label>Alcance (categoria)</label>
          <input
            name="alcance"
            defaultValue={desde(proyecto?.alcance, oportunidad?.alcance_oportunidad)}
          />
        </div>
      </div>

      <div className="form-section">Fechas</div>
      <div className="form-grid">
        {/* Cuatro fechas: las dos estimadas vienen de la cotizacion y quedan
            como registro de lo que se prometio; las reales se cargan cuando
            pasan, que casi nunca es lo mismo. */}
        <div className="fg">
          <label>Inicio estimado</label>
          <input
            type="date"
            name="fecha_inicio_estimada"
            defaultValue={desde(
              proyecto?.fecha_inicio_estimada,
              oportunidad?.fecha_inicio_estimada
            )}
          />
        </div>
        <div className="fg">
          <label>Fin estimado</label>
          <input
            type="date"
            name="fecha_fin_estimada"
            defaultValue={desde(
              proyecto?.fecha_fin_estimada,
              oportunidad?.fecha_fin_estimada
            )}
          />
        </div>
        <div className="fg">
          <label>Inicio real</label>
          <input
            type="date"
            name="fecha_inicio_real"
            defaultValue={proyecto?.fecha_inicio_real ?? ""}
          />
          <span className="hint">Cuando arranco de verdad</span>
        </div>
        <div className="fg">
          <label>Fin real</label>
          <input
            type="date"
            name="fecha_fin_real"
            defaultValue={proyecto?.fecha_fin_real ?? ""}
          />
          <span className="hint">Cuando termino de verdad</span>
        </div>
      </div>

      <div className="form-section">Plata</div>
      <div className="form-grid">
        <div className="fg">
          <label>Moneda</label>
          <select name="moneda" defaultValue={proyecto?.moneda ?? "USD"}>
            {MONEDAS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>IVA</label>
          <select name="iva" defaultValue={proyecto?.iva ?? "21"}>
            {IVAS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        <div className="fg">
          <label>Estructura tarifaria</label>
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

        {[...campos, ...ADICIONALES].map((c) => (
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
          </div>
        ))}

        <div className="fg">
          <label>Valor total acordado</label>
          <input
            type="number"
            step="0.01"
            name="valor"
            defaultValue={proyecto?.valor ?? oportunidad?.valor ?? 0}
          />
        </div>
      </div>

      <div className="form-section">Notas</div>
      <div className="fg">
        <textarea name="notas" defaultValue={proyecto?.notas ?? ""} rows={3} />
      </div>

      {/* En el alta el pie va aca. En la ficha lo dibuja la pagina despues de
          la documentacion, igual que en oportunidades. */}
      {!proyecto && <PieDelProyecto />}
    </form>
  );
}

export function PieDelProyecto({ volverA = "/proyectos" }: { volverA?: string }) {
  return (
    <div className="flex-between mt16">
      <Link href={volverA} className="btn btn-ghost">
        Atras
      </Link>
      <button type="submit" form={ID_FORM_PROYECTO} className="btn btn-primary">
        Guardar
      </button>
    </div>
  );
}
