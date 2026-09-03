"use client";

import Link from "next/link";
import { useState } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import ClientePicker from "@/components/ClientePicker";
import { aInputLocal } from "@/lib/fechas";
import {
  ADICIONALES,
  camposDe,
  ESTADOS_PROYECTO,
  ESTRUCTURAS,
  IVAS,
  MONEDAS,
  type ClienteContacto,
  type ClienteEmpresa,
  type Concepto,
  type EstructuraTarifaria,
  type Oportunidad,
  type Plantilla,
  type Proyecto,
  type MontoDeTarifa,
} from "@/lib/types";

export const ID_FORM_PROYECTO = "form-proyecto";

// El formulario del proyecto sirve para tres cosas: convertir una oportunidad
// ganada (llega `oportunidad` y sus `tarifas`), cargar un proyecto desde cero
// (no llega ninguna de las dos) y editar uno ya creado (llega `proyecto`).
//
// Lo que viene de la oportunidad se puede editar: es lo que se cotizo, y lo
// que se firma casi nunca es igual.
//
// El cliente es la excepcion, y depende del origen. Si el proyecto salio de
// una oportunidad, el cliente se muestra y no se toca: cambiarselo a un
// trabajo ganado no es una edicion, es otro trabajo, y ademas dejaria la
// oportunidad diciendo otra cosa. Si el proyecto nacio sin oportunidad no hay
// ningun origen que contradecir, asi que se elige aca —del mismo maestro de
// clientes que usa la oportunidad— y se puede corregir despues.
export default function ProyectoForm({
  action,
  proyecto,
  oportunidad,
  tarifas = [],
  nroQueSigue,
  plantilla,
  empresas = [],
  contactos = [],
}: {
  action: (formData: FormData) => void;
  proyecto?: Proyecto;
  oportunidad?: Oportunidad;
  tarifas?: MontoDeTarifa[];
  nroQueSigue?: string;
  plantilla?: Plantilla;
  // El maestro de clientes: solo hace falta cuando el cliente se elige aca.
  empresas?: ClienteEmpresa[];
  contactos?: ClienteContacto[];
}) {
  const [estructura, setEstructura] = useState<EstructuraTarifaria>(
    proyecto?.estructura_tarifaria ??
      oportunidad?.estructura_tarifaria ??
      plantilla?.estructura_tarifaria ??
      "time_charter"
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

  // El origen manda sobre el cliente. Un proyecto que salio de una oportunidad
  // lo hereda; uno cargado desde cero lo elige. `oportunidad_id` es el dato
  // duro: si esta, hay origen.
  const conOrigen = Boolean(oportunidad ?? proyecto?.oportunidad_id);
  // De donde sale un default, en orden de precedencia: editando un proyecto
  // manda el proyecto; convirtiendo una oportunidad, la oportunidad; y
  // arrancando de una plantilla, la plantilla. Son mutuamente excluyentes.
  // Siempre devuelve string: los <input> no aceptan null.
  const desde = (
    delProyecto: string | null | undefined,
    deLaOportunidad: string | null | undefined,
    deLaPlantilla?: string | null | undefined
  ): string =>
    proyecto
      ? (delProyecto ?? "")
      : oportunidad
        ? (deLaOportunidad ?? "")
        : (deLaPlantilla ?? "");

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
        {conOrigen ? (
          <div className="fg">
            <label>Cliente</label>
            {/* Con oportunidad de origen el cliente se muestra y no se toca. */}
            <input value={contacto ? `${compania} · ${contacto}` : compania} readOnly />
            <span className="hint">
              {oportunidad?.nro_oportunidad
                ? `Viene de la oportunidad ${oportunidad.nro_oportunidad}`
                : "Se corrige en la oportunidad de origen"}
            </span>
          </div>
        ) : (
          // Sin oportunidad de origen el cliente se elige aca, del mismo
          // maestro y con la misma posibilidad de crearlo sin salir del
          // formulario.
          <ClientePicker
            empresas={empresas}
            contactos={contactos}
            empresaId={proyecto?.cliente_empresa_id ?? plantilla?.cliente_empresa_id}
            contactoId={proyecto?.cliente_contacto_id ?? plantilla?.cliente_contacto_id}
          />
        )}
        <div className="fg">
          {/* El otro cliente. Quien contrata no siempre es para quien es el
              trabajo: Service Management contrata el buque y el trabajo es
              para Raizen. Se edita siempre, incluso viniendo de una
              oportunidad: el cliente final se termina de saber al firmar. */}
          <label>Cliente final</label>
          <input
            name="cliente_final"
            defaultValue={desde(
              proyecto?.cliente_final,
              oportunidad?.cliente_final,
              plantilla?.cliente_final
            )}
            placeholder="Para quien es el trabajo"
          />
          <span className="hint">Si es distinto de quien contrata</span>
        </div>
      </div>

      <div className="form-section">El trabajo</div>
      <div className="fg mb16">
        <label>En que consiste</label>
        <textarea
          name="descripcion"
          defaultValue={desde(
            proyecto?.descripcion,
            oportunidad?.descripcion_alcance,
            plantilla?.descripcion
          )}
          rows={4}
        />
      </div>
      <div className="form-grid">
        <div className="fg">
          <label>Buque</label>
          <input
            name="buque"
            defaultValue={desde(proyecto?.buque, oportunidad?.buque, plantilla?.buque)}
            placeholder="Atlantic Dama"
          />
        </div>
        <div className="fg">
          <label>Alcance (categoria)</label>
          <input
            name="alcance"
            defaultValue={desde(
              proyecto?.alcance,
              oportunidad?.alcance_oportunidad,
              plantilla?.alcance
            )}
          />
        </div>
      </div>

      <div className="form-section">Fechas</div>
      <div className="form-grid">
        {/* Las dos estimadas: lo que se prometio al cotizar. Lo que paso de
            verdad son las salidas, y de ellas sale el periodo real.

            Con hora (0022), porque en estos trabajos la hora define el
            precio y no tiene sentido que en la misma pantalla una fecha la
            diga y la otra no. `aInputLocal` tolera que del lado de la
            oportunidad venga una fecha sin hora: la muestra a las 00:00. */}
        <div className="fg">
          <label>Inicio estimado</label>
          <input
            type="datetime-local"
            name="fecha_inicio_estimada"
            defaultValue={aInputLocal(
              desde(proyecto?.fecha_inicio_estimada, oportunidad?.fecha_inicio_estimada)
            )}
          />
        </div>
        <div className="fg">
          <label>Fin estimado</label>
          <input
            type="datetime-local"
            name="fecha_fin_estimada"
            defaultValue={aInputLocal(
              desde(proyecto?.fecha_fin_estimada, oportunidad?.fecha_fin_estimada)
            )}
          />
        </div>
        {/* Las fechas reales no se cargan aca desde 0018: son la primera y la
            ultima operacion del proyecto. Se muestran en la ficha, calculadas
            de las salidas. */}
      </div>

      <div className="form-section">Plata</div>
      <div className="form-grid">
        <div className="fg">
          <label>Moneda</label>
          <select name="moneda" defaultValue={proyecto?.moneda ?? oportunidad?.moneda ?? plantilla?.moneda ?? "USD"}>
            {MONEDAS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>IVA</label>
          <select name="iva" defaultValue={proyecto?.iva ?? plantilla?.iva ?? "21"}>
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
      <BotonGuardar form={ID_FORM_PROYECTO} />
    </div>
  );
}
