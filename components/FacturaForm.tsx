"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import { fechaHoraLegible, sumarDias } from "@/lib/fechas";
import {
  EMPRESAS_PROPIAS,
  MONEDAS,
  type Factura,
  type Moneda,
  type Proyecto,
} from "@/lib/types";

export const ID_FORM_FACTURA = "form-factura";

// Lo que la factura necesita saber de una salida para proponerse sola.
export type SalidaFacturable = {
  id: string;
  nro_operacion: string | null;
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  valor: number;
  comision_total: number;
  moneda: Moneda;
  facturada: boolean;
};

const plata = (moneda: Moneda, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(valor);

// La factura de un proyecto.
//
// Elegir la salida es el atajo: trae el importe, la comision, la moneda y
// propone el vencimiento con los dias de pago del cliente. Es lo que en la
// planilla se copiaba a mano de la fila del viaje.
//
// Se puede no elegir ninguna: un charter de 48 dias se factura por mes y esas
// facturas no son un viaje.
export default function FacturaForm({
  action,
  proyecto,
  factura,
  salidas = [],
  diasDePago,
  volverA = "facturacion",
  operacionInicial,
}: {
  action: (formData: FormData) => void;
  proyecto: Proyecto;
  factura?: Factura;
  salidas?: SalidaFacturable[];
  // Del maestro de clientes. Service Management paga a 90 dias.
  diasDePago?: number | null;
  volverA?: "proyecto" | "facturacion";
  // Se llega desde "Pendiente de facturar" con la salida ya decidida: el
  // formulario nace con sus numeros puestos, como si la hubieran elegido.
  operacionInicial?: string | null;
}) {
  const hoy = new Date().toISOString().slice(0, 10);

  // De donde sale cada valor inicial: de la factura si se esta editando, y si
  // no de la salida con la que se entro.
  const inicial = factura
    ? null
    : (salidas.find((s) => s.id === operacionInicial) ?? null);

  const [salidaId, setSalidaId] = useState(
    factura?.operacion_id ?? inicial?.id ?? ""
  );
  const [importe, setImporte] = useState(
    factura ? String(factura.importe) : inicial ? String(inicial.valor) : ""
  );
  const [comision, setComision] = useState(
    factura ? String(factura.comision) : inicial ? String(inicial.comision_total) : ""
  );
  const [moneda, setMoneda] = useState<Moneda>(
    factura?.moneda ?? inicial?.moneda ?? proyecto.moneda ?? "USD"
  );

  const [emision, setEmision] = useState(factura?.fecha_emision ?? hoy);
  const [vencimiento, setVencimiento] = useState(
    factura?.vencimiento ??
      (inicial && diasDePago
        ? sumarDias(inicial.fecha_fin?.slice(0, 10) ?? hoy, diasDePago)
        : "")
  );

  const [cobroMoneda, setCobroMoneda] = useState<string>(factura?.cobro_moneda ?? "");
  const [cobroFecha, setCobroFecha] = useState(factura?.cobro_fecha ?? "");
  const [tcPagado, setTcPagado] = useState(
    factura?.tc_pagado !== null && factura?.tc_pagado !== undefined
      ? String(factura.tc_pagado)
      : ""
  );
  const [tcDiaCobro, setTcDiaCobro] = useState(
    factura?.tc_dia_cobro !== null && factura?.tc_dia_cobro !== undefined
      ? String(factura.tc_dia_cobro)
      : ""
  );

  const numero = (v: string) => Number(v.replace(",", ".")) || 0;
  const neto = numero(importe) - numero(comision);
  const cobrada = cobroMoneda === "USD" || cobroMoneda === "ARS";

  // Las tres cuentas de la planilla: la diferencia de cambio, lo que entro en
  // pesos y el plazo que tardo en cobrarse.
  const dif =
    tcPagado !== "" && tcDiaCobro !== "" ? numero(tcDiaCobro) - numero(tcPagado) : null;
  const enPesos = cobroMoneda === "ARS" && tcPagado !== "" ? neto * numero(tcPagado) : null;

  const elegida = salidas.find((s) => s.id === salidaId) ?? null;

  // Elegir una salida trae sus numeros. Despues se pueden pisar: lo que se
  // factura no siempre es exactamente lo que se calculo.
  const aplicarSalida = (id: string) => {
    setSalidaId(id);
    const s = salidas.find((x) => x.id === id);
    if (!s) return;
    setImporte(String(s.valor));
    setComision(String(s.comision_total));
    setMoneda(s.moneda);
    // El vencimiento de la planilla: fecha de fin del viaje + los dias del
    // cliente.
    const base = s.fecha_fin?.slice(0, 10) ?? emision;
    if (diasDePago) setVencimiento(sumarDias(base, diasDePago));
  };

  // El aviso de cobro incompleto, con la misma mecanica que las coordenadas de
  // una zona: se le cuelga al campo como validez propia para que lo frene el
  // checkValidity() de BotonGuardar y el navegador muestre el motivo. El
  // servidor lo valida igual.
  const refCobroFecha = useRef<HTMLInputElement>(null);
  const refTc = useRef<HTMLInputElement>(null);

  const faltaFecha = cobrada && cobroFecha === "";
  const faltaMoneda = !cobrada && cobroFecha !== "";
  const faltaTc = cobroMoneda === "ARS" && tcPagado === "";

  useEffect(() => {
    refCobroFecha.current?.setCustomValidity(
      faltaFecha
        ? "Si la factura esta cobrada hace falta la fecha de cobro."
        : faltaMoneda
          ? "Hay fecha de cobro pero no se dijo en que moneda entro la plata."
          : ""
    );
    refTc.current?.setCustomValidity(
      faltaTc ? "Cobrada en pesos: falta el TC pagado para saber cuanta plata entro." : ""
    );
  }, [faltaFecha, faltaMoneda, faltaTc]);

  return (
    <form action={action} className="card" id={ID_FORM_FACTURA}>
      <input type="hidden" name="proyecto_id" value={proyecto.id} />
      <input type="hidden" name="volver_a" value={volverA} />

      <div className="form-section">Que se factura</div>
      <div className="form-grid">
        <div className="fg">
          <label>Proyecto</label>
          {/* Una factura no se muda de proyecto: seria otra factura. */}
          <input value={`${proyecto.nro_proyecto ?? ""} · ${proyecto.nombre}`} readOnly />
          <span className="hint">{proyecto.compania ?? "sin cliente"}</span>
        </div>
        <div className="fg">
          <label>Salida</label>
          <select
            name="operacion_id"
            value={salidaId}
            onChange={(e) => aplicarSalida(e.target.value)}
          >
            <option value="">Sin salida puntual</option>
            {salidas.map((s) => (
              <option key={s.id} value={s.id}>
                {[s.nro_operacion, s.nombre].filter(Boolean).join(" · ")}
                {s.facturada && s.id !== factura?.operacion_id ? " (ya facturada)" : ""}
              </option>
            ))}
          </select>
          <span className="hint">
            {elegida
              ? `${fechaHoraLegible(elegida.fecha_inicio)} a ${fechaHoraLegible(elegida.fecha_fin)}`
              : "Elegirla trae el importe y propone el vencimiento. Se puede dejar vacia: un charter largo se factura por mes."}
          </span>
        </div>
        <div className="fg">
          <label>Nro de factura</label>
          <input
            name="nro_factura"
            defaultValue={factura?.nro_factura ?? ""}
            placeholder="A-0001-00012345"
          />
          <span className="hint">Se puede cargar despues</span>
        </div>
        <div className="fg">
          <label>Factura</label>
          <select
            name="empresa_facturadora"
            defaultValue={factura?.empresa_facturadora ?? "Parana Logistica"}
          >
            {EMPRESAS_PROPIAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <span className="hint">Cual de las empresas de Integra emite</span>
        </div>
      </div>

      <div className="form-section">Plazos</div>
      <div className="form-grid">
        <div className="fg">
          <label>Fecha de emision</label>
          <input
            type="date"
            name="fecha_emision"
            value={emision}
            onChange={(e) => setEmision(e.target.value)}
            required
          />
        </div>
        <div className="fg">
          <label>Vencimiento</label>
          <input
            type="date"
            name="vencimiento"
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
          />
          <span className="hint">
            {diasDePago
              ? `${proyecto.compania ?? "El cliente"} paga a ${diasDePago} dias`
              : "Sin condicion de pago cargada para este cliente: se pone a mano"}
          </span>
        </div>
      </div>

      <div className="form-section">Importes</div>
      <div className="form-grid">
        <div className="fg">
          <label>Importe facturado</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="importe"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="fg">
          <label>Comisiones</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="comision"
            value={comision}
            onChange={(e) => setComision(e.target.value)}
            placeholder="0.00"
          />
          <span className="hint">Lo que se le paga al broker por esta factura</span>
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
          <label>Importe neto</label>
          <input value={plata(moneda, neto)} readOnly />
          <span className="hint">Importe menos comisiones</span>
        </div>
      </div>

      <div className="form-section">Cobranza</div>
      <div className="form-grid">
        <div className="fg">
          <label>Cobrada</label>
          <select
            name="cobro_moneda"
            value={cobroMoneda}
            onChange={(e) => setCobroMoneda(e.target.value)}
          >
            <option value="">Todavia no</option>
            <option value="USD">Si, en dolares</option>
            <option value="ARS">Si, en pesos</option>
          </select>
          <span className="hint">
            En que moneda entro la plata, que no es siempre la de la factura
          </span>
        </div>
        <div className="fg">
          <label>Fecha de cobro</label>
          <input
            ref={refCobroFecha}
            type="date"
            name="cobro_fecha"
            value={cobroFecha}
            onChange={(e) => setCobroFecha(e.target.value)}
          />
        </div>
        <div className="fg">
          <label>TC pagado</label>
          <input
            ref={refTc}
            type="number"
            step="0.0001"
            min="0"
            name="tc_pagado"
            value={tcPagado}
            onChange={(e) => setTcPagado(e.target.value)}
            placeholder="1442"
          />
          <span className="hint">El tipo de cambio al que se acordo pagar</span>
        </div>
        <div className="fg">
          <label>TC del dia de cobro</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            name="tc_dia_cobro"
            value={tcDiaCobro}
            onChange={(e) => setTcDiaCobro(e.target.value)}
            placeholder="1450"
          />
          <span className="hint">
            {dif === null
              ? "Para ver la diferencia de cambio"
              : `Diferencia de cambio: ${dif > 0 ? "+" : ""}${dif.toLocaleString("es-AR", { maximumFractionDigits: 4 })}`}
          </span>
        </div>
        {enPesos !== null && (
          <div className="fg">
            <label>Total en pesos</label>
            <input
              value={new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
              }).format(enPesos)}
              readOnly
            />
            <span className="hint">Neto por el TC pagado</span>
          </div>
        )}
      </div>

      {(faltaFecha || faltaMoneda || faltaTc) && (
        <div className="info-box warn mb16">
          {faltaFecha && "Si la factura esta cobrada hace falta la fecha de cobro."}
          {faltaMoneda &&
            "Hay fecha de cobro pero no se dijo en que moneda entro la plata: elegi USD o ARS, o borra la fecha."}
          {faltaTc &&
            "Cobrada en pesos sin tipo de cambio no permite saber cuanta plata entro: falta el TC pagado."}
        </div>
      )}

      <div className="form-section">Notas</div>
      <div className="fg">
        <textarea name="notas" defaultValue={factura?.notas ?? ""} rows={3} />
      </div>

      <PieDeLaFactura volverA={volverA === "proyecto" ? `/proyectos/${proyecto.id}` : "/facturacion"} />
    </form>
  );
}

export function PieDeLaFactura({ volverA = "/facturacion" }: { volverA?: string }) {
  return (
    <div className="flex-between mt16">
      <Link href={volverA} className="btn btn-ghost">
        Atras
      </Link>
      <BotonGuardar form={ID_FORM_FACTURA} />
    </div>
  );
}
