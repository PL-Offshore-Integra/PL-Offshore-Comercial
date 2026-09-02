"use client";

import { useState } from "react";
import {
  CONCEPTOS,
  ESTADIOS,
  ESTRUCTURAS,
  PRESET_TARIFAS,
  UNIDADES,
  type Concepto,
  type EstructuraTarifaria,
  type Oportunidad,
  type Tarifa,
  type Unidad,
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
}: {
  action: (formData: FormData) => void;
  oportunidad?: Oportunidad;
}) {
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
          <label>Nombre del proyecto</label>
          <input name="nombre_proyecto" defaultValue={oportunidad?.nombre_proyecto} required />
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
          <label>Nombre de la persona</label>
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
          <label>Telefono</label>
          <input
            type="tel"
            name="contacto_telefono"
            defaultValue={oportunidad?.contacto_telefono ?? ""}
            placeholder="+54 9 11 ..."
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

      <div className="form-section">Numeros y seguimiento comercial</div>
      <div className="form-grid">
        <div className="fg">
          <label>Estructura de cobro</label>
          <select
            name="estructura_tarifaria"
            defaultValue={oportunidad?.estructura_tarifaria ?? "diaria"}
          >
            {ESTRUCTURAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Valor</label>
          <input type="number" step="0.01" name="valor" defaultValue={oportunidad?.valor ?? 0} />
        </div>
        <div className="fg">
          <label>Costo</label>
          <input type="number" step="0.01" name="costo" defaultValue={oportunidad?.costo ?? 0} />
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

// ============================================================
// Conceptos tarifarios
//
// Un `valor` unico no alcanza para expresar como cobra la empresa:
// movilizacion + desmovilizacion + dia garantizado + tarifa diferencial
// pasadas las 24 h son cuatro numeros distintos. Cargados aca, el ingreso de
// cada operacion se puede calcular antes de que exista la factura.
// ============================================================

type Fila = {
  concepto: Concepto | "";
  detalle: string;
  unidad: Unidad;
  monto: string;
  cantidad: string;
  horas: string;
};

function filaVacia(concepto: Concepto | ""): Fila {
  const def = CONCEPTOS.find((c) => c.id === concepto);
  return {
    concepto,
    detalle: "",
    unidad: def?.unidad ?? "global",
    monto: "",
    cantidad: "",
    horas: concepto === "tarifa_diferencial" ? "24" : "",
  };
}

function desdeTarifa(t: Tarifa): Fila {
  return {
    concepto: t.concepto,
    detalle: t.detalle ?? "",
    unidad: t.unidad,
    monto: String(t.monto ?? ""),
    cantidad: t.cantidad === null ? "" : String(t.cantidad),
    horas: t.aplica_desde_horas === null ? "" : String(t.aplica_desde_horas),
  };
}

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
});

export function TarifasEditor({
  action,
  tarifas,
  estructura,
}: {
  action: (formData: FormData) => void;
  tarifas: Tarifa[];
  estructura: EstructuraTarifaria;
}) {
  const [filas, setFilas] = useState<Fila[]>(
    tarifas.length ? tarifas.map(desdeTarifa) : PRESET_TARIFAS[estructura].map(filaVacia)
  );

  const set = (i: number, campo: keyof Fila, valor: string) =>
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));

  const cambiarConcepto = (i: number, valor: string) =>
    setFilas((prev) =>
      prev.map((f, idx) => {
        if (idx !== i) return f;
        const def = CONCEPTOS.find((c) => c.id === valor);
        return {
          ...f,
          concepto: valor as Concepto | "",
          unidad: def?.unidad ?? f.unidad,
          horas: valor === "tarifa_diferencial" ? f.horas || "24" : "",
        };
      })
    );

  const total = filas.reduce((acc, f) => {
    const m = Number(f.monto);
    const c = f.cantidad === "" ? 1 : Number(f.cantidad);
    if (!Number.isFinite(m)) return acc;
    return acc + m * (Number.isFinite(c) ? c : 1);
  }, 0);

  const sugeridas = PRESET_TARIFAS[estructura];

  return (
    <form action={action} className="card">
      <div className="form-section">Conceptos tarifarios &middot; como se cobra</div>

      <div className="info-box accent mb16">
        Esto es lo que despues permite <strong>calcular</strong> el ingreso de cada
        operacion, antes de que exista la factura. Sin conceptos cargados la
        oportunidad tiene un precio, pero ninguna operacion se puede valorizar.
      </div>

      {filas.length === 0 && (
        <div className="empty-state mb16">Sin conceptos cargados.</div>
      )}

      {filas.map((f, i) => (
        <div key={i} className="form-grid" style={{ alignItems: "end" }}>
          <div className="fg">
            <label>Concepto</label>
            <select
              name="tarifa_concepto"
              value={f.concepto}
              onChange={(e) => cambiarConcepto(i, e.target.value)}
            >
              <option value="">&mdash; elegir &mdash;</option>
              {CONCEPTOS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="fg">
            <label>Detalle</label>
            <input
              name="tarifa_detalle"
              value={f.detalle}
              onChange={(e) => set(i, "detalle", e.target.value)}
              placeholder={
                f.concepto === "tarifa_diferencial" ? "pasadas las 24 h" : "opcional"
              }
            />
          </div>

          <div className="fg">
            <label>Unidad</label>
            <select
              name="tarifa_unidad"
              value={f.unidad}
              onChange={(e) => set(i, "unidad", e.target.value)}
            >
              {UNIDADES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div className="fg">
            <label>Cantidad</label>
            <input
              name="tarifa_cantidad"
              type="number"
              step="0.5"
              min="0"
              value={f.cantidad}
              onChange={(e) => set(i, "cantidad", e.target.value)}
            />
          </div>

          <div className="fg">
            <label>Monto</label>
            <input
              name="tarifa_monto"
              type="number"
              step="0.01"
              min="0"
              value={f.monto}
              onChange={(e) => set(i, "monto", e.target.value)}
            />
          </div>

          <div className="fg">
            <label>Aplica desde (h)</label>
            <input
              name="tarifa_horas"
              type="number"
              min="0"
              value={f.horas}
              onChange={(e) => set(i, "horas", e.target.value)}
              disabled={f.concepto !== "tarifa_diferencial"}
            />
          </div>

          <div className="fg">
            <label>&nbsp;</label>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setFilas((prev) => prev.filter((_, idx) => idx !== i))}
            >
              Quitar
            </button>
          </div>
        </div>
      ))}

      <div className="flex-gap mt16">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setFilas((prev) => [...prev, filaVacia("")])}
        >
          Agregar concepto
        </button>
        {sugeridas.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFilas(sugeridas.map(filaVacia))}
          >
            Cargar los sugeridos
          </button>
        )}
      </div>

      <div className="flex-between mt16">
        <span className="text-mono text-muted">
          Suma de conceptos: {currency.format(total)}
        </span>
        <button type="submit" className="btn btn-primary">
          Guardar conceptos
        </button>
      </div>
    </form>
  );
}
