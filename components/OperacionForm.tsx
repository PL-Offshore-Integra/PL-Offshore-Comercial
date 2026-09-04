"use client";

import Link from "next/link";
import { useState } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import ZonaPicker from "@/components/ZonaPicker";
import { aInputLocal, diasLegibles } from "@/lib/fechas";
import {
  calcularValor,
  camposConAdicionales,
  comisionTotal,
  CONTRATACIONES,
  desgloseValor,
  diasDeOperacion,
  ESTADOS_OPERACION,
  IVAS,
  MONEDAS,
  type Concepto,
  type EstructuraTarifaria,
  type Moneda,
  type MontoDeTarifa,
  type Operacion,
  type Proyecto,
  type Zona,
} from "@/lib/types";

export const ID_FORM_OPERACION = "form-operacion";

const plata = (moneda: Moneda, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(valor);

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

// El nombre de la salida se arma solo, con la convencion que ya usan para las
// carpetas: cliente + mes/anio + buque madre. La de agosto se llama "RAIZEN
// AGO2026 SEAWAYS BALBOA", y sale entera de tres campos que igual hay que
// llenar. Se puede pisar a mano.
function nombreSugerido(cliente: string, desde: string, buqueMadre: string): string {
  const partes: string[] = [];
  if (cliente) partes.push(cliente.toUpperCase());
  if (desde.length >= 7) {
    const mes = MESES[Number(desde.slice(5, 7)) - 1];
    if (mes) partes.push(`${mes}${desde.slice(0, 4)}`);
  }
  if (buqueMadre) partes.push(buqueMadre.toUpperCase());
  return partes.join(" ");
}

// La salida concreta.
//
// El formulario esta ordenado como la planilla que se llena en Excel, y a
// proposito: los mismos casilleros, en el mismo orden y con los mismos
// nombres —ZONA, BUQUE MADRE, CLIENTE, ALIJADORES, SUPPLY, FECHA desde, FECHA
// hasta—. Eso es lo unico que cambia de una salida a otra.
//
// Todo lo demas es constante y vive en el proyecto: la empresa que contrata
// (Service Management), el servicio (Ship to Ship), las tarifas, la moneda, el
// IVA y el tipo de contratacion. Baja precargado y queda al final, donde no
// compite con los siete de arriba.
//
// Las fechas llevan hora y no es un adorno: se cobra por dia fraccionado. La
// operacion de agosto fue del 20/08 07:00 al 21/08 12:30, y las 0,23 jornadas
// que pasaron de las 24 h se cobraron pro rata.
export default function OperacionForm({
  action,
  proyecto,
  operacion,
  tarifas = [],
  nroQueSigue,
  zonas = [],
}: {
  action: (formData: FormData) => void;
  proyecto: Proyecto;
  operacion?: Operacion;
  // Editando una salida son las suyas; creandola, las del proyecto, que se
  // usan como punto de partida.
  tarifas?: MontoDeTarifa[];
  nroQueSigue?: string;
  // El maestro de zonas: la ZONA de la planilla se elige de ahi (0027).
  zonas?: Zona[];
}) {
  const [tipo, setTipo] = useState<EstructuraTarifaria>(
    operacion?.estructura_tarifaria ?? proyecto.estructura_tarifaria ?? "time_charter"
  );
  const [moneda, setMoneda] = useState<Moneda>(operacion?.moneda ?? proyecto.moneda ?? "USD");
  const [inicio, setInicio] = useState(aInputLocal(operacion?.fecha_inicio));
  const [fin, setFin] = useState(aInputLocal(operacion?.fecha_fin));

  // El cliente y el buque madre viven en estado porque de ellos sale el nombre
  // sugerido.
  const [cliente, setCliente] = useState(
    operacion?.cliente_final ?? proyecto.cliente_final ?? ""
  );
  const [buqueMadre, setBuqueMadre] = useState(operacion?.buque_madre ?? "");
  const [nombre, setNombre] = useState(operacion?.nombre ?? "");
  // Una vez que alguien lo escribe a mano, deja de sugerirse.
  const [nombreAMano, setNombreAMano] = useState(Boolean(operacion));

  const [montos, setMontos] = useState<Partial<Record<Concepto, string>>>(() => {
    const inicial: Partial<Record<Concepto, string>> = {};
    for (const t of tarifas) inicial[t.concepto] = String(t.monto);
    return inicial;
  });

  const campos = camposConAdicionales(tipo);

  const dias = diasDeOperacion(inicio ? `${inicio}:00` : null, fin ? `${fin}:00` : null);

  const montosNumericos = Object.fromEntries(
    Object.entries(montos).map(([c, v]) => [c, Number(v) || 0])
  ) as Partial<Record<Concepto, number>>;

  const valor = calcularValor(tipo, montosNumericos, dias);
  const desglose = desgloseValor(tipo, montosNumericos, dias);
  // Lo que se le paga al broker por esta salida. Aparte del valor: uno entra y
  // el otro sale (0024).
  const comision = comisionTotal(tipo, montosNumericos, dias);

  const sugerido = nombreSugerido(cliente, inicio, buqueMadre);
  const nombreFinal = nombreAMano || !sugerido ? nombre : sugerido;

  return (
    <form action={action} className="card" id={ID_FORM_OPERACION}>
      <input type="hidden" name="proyecto_id" value={proyecto.id} />

      {/* Los siete casilleros de la planilla, en su orden. */}
      <div className="form-section">Operacion</div>
      <div className="form-grid">
        {/* La ZONA de la planilla, elegida del maestro y no tipeada (0027).
            Es el casillero que mas cambia de una salida a otra: el Golondrina
            opera en Alfa, en Delta o en KM 171. */}
        <ZonaPicker
          zonas={zonas}
          zonaId={operacion?.zona_id}
          label="Zona"
          ayuda="Donde se hizo esta salida"
        />
        <div className="fg">
          <label>Buque madre</label>
          <input
            name="buque_madre"
            value={buqueMadre}
            onChange={(e) => setBuqueMadre(e.target.value)}
            placeholder="Seaways Balboa"
          />
        </div>
        <div className="fg">
          <label>Cliente</label>
          <input
            name="cliente_final"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Raizen"
          />
          <span className="hint">Para quien es esta salida</span>
        </div>
        <div className="fg">
          <label>Alijadores</label>
          <input
            name="alijador"
            defaultValue={operacion?.alijador ?? ""}
            placeholder="Palena Star"
          />
        </div>
        <div className="fg">
          <label>Supply</label>
          <input
            name="buque"
            defaultValue={operacion?.buque ?? proyecto.buque ?? ""}
            placeholder="Golondrina de Mar"
          />
          <span className="hint">El buque nuestro</span>
        </div>
        <div className="fg">
          <label>Fecha desde</label>
          <input
            type="datetime-local"
            name="fecha_inicio"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />
        </div>
        <div className="fg">
          <label>Fecha hasta</label>
          <input
            type="datetime-local"
            name="fecha_fin"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            required
          />
        </div>
        <div className="fg">
          <label>Duracion</label>
          <div className="dato">
            {dias === null ? (
              <span className="text-muted">Faltan las fechas</span>
            ) : (
              <strong>{diasLegibles(dias)} dias</strong>
            )}
          </div>
          <span className="hint">Sale de las dos fechas, con sus horas</span>
        </div>
      </div>

      {/* El desglose, con los mismos renglones que la planilla, para poder
          controlar uno contra el otro. */}
      <div className="form-section">El calculo</div>
      <div className="table-wrap mb16">
        <table className="tabla-calculo">
          <tbody>
            {desglose.map((l) => (
              <tr
                key={l.label}
                className={l.esTotal ? "fila-total" : l.aparte ? "fila-aparte" : undefined}
              >
                <td>{l.label}</td>
                <td className="text-mono text-muted">
                  {l.dias === undefined ? "" : `${diasLegibles(l.dias)} dias`}
                </td>
                <td className="text-mono cel-valor" style={{ textAlign: "right" }}>
                  {plata(moneda, l.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="fg mb16">
        <span className="hint">
          Las tarifas vienen del proyecto y se pueden corregir mas abajo. El
          total no se escribe: lo recalcula el servidor al guardar, con esta
          misma cuenta.
        </span>
      </div>

      <div className="form-section">Como se la nombra</div>
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
          <label>Nombre de la salida</label>
          <input
            name="nombre"
            value={nombreFinal}
            onChange={(e) => {
              setNombreAMano(true);
              setNombre(e.target.value);
            }}
            placeholder="RAIZEN AGO2026 SEAWAYS BALBOA"
            required
          />
          <span className="hint">
            {nombreAMano
              ? "Escrito a mano"
              : "Se arma con cliente + mes + buque madre; se puede pisar"}
          </span>
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
      </div>

      {/* Lo constante, que baja del proyecto. Al final para que no compita con
          los siete casilleros de arriba. */}
      <div className="form-section">Tarifas y condiciones</div>
      <div className="fg mb16">
        <span className="hint">
          Heredadas del proyecto. Cambiarlas aca vale solo para esta salida.
        </span>
      </div>
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
              onChange={(e) => setMontos((m) => ({ ...m, [c.concepto]: e.target.value }))}
              placeholder="0.00"
            />
            <input type="hidden" name="tarifa_concepto" value={c.concepto} />
            <input type="hidden" name="tarifa_unidad" value={c.unidad} />
            <input type="hidden" name="tarifa_detalle" value="" />
          </div>
        ))}

        <div className="fg">
          <label>Valor de la salida</label>
          <div className="dato">
            <strong>{plata(moneda, valor)}</strong>
          </div>
        </div>

        {tipo === "broker" && (
          <div className="fg">
            <label>Total de comision</label>
            <div className="dato">{plata(moneda, comision)}</div>
            <span className="hint">Dias × comision. No entra en el valor.</span>
          </div>
        )}
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
