"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fechaLegible } from "@/lib/fechas";

// El Gantt de ocupacion de la flota: que buque esta tomado, cuando, y por
// que trabajo.
//
// POR QUE NO HAY LIBRERIA
//
//   Un Gantt es una barra posicionada por fecha. Lo unico que hace falta es
//   pasar fechas a porcentaje del ancho, y eso son cuatro cuentas. Las
//   librerias de Gantt traen su propia tipografia, sus iconos y sus sombras,
//   y el design system no admite nada de eso.
//
// DE DONDE SALE CADA BARRA (la cascada la arma la pagina, no este componente)
//
//   salida    lo que el buque realmente hizo. Si un proyecto tiene salidas
//             cargadas, se dibuja una barra por salida y no una del proyecto
//             entero: Service Management tiene 16 salidas repartidas en todo
//             2026, y una sola barra diria que el Golondrina estuvo ocupado
//             el ano entero, que es falso.
//   periodo   lo contratado, cuando todavia no hay salidas cargadas. Es el
//             contrato y sus adendas.
//   estimado  la ventana estimada, cuando no hay ni lo uno ni lo otro.
//
//   Las oportunidades van siempre como estimado y en otro tono: son posibles,
//   no ciertas. Solo las en curso; una cancelada no ocupa el buque y una
//   adjudicada ya esta dibujada como proyecto.

export type OrigenBarra = "salida" | "periodo" | "estimado";

export type BarraOcupacion = {
  id: string;
  buque: string;
  clase: "proyecto" | "oportunidad";
  origen: OrigenBarra;
  nro: string | null;
  titulo: string;
  cliente: string | null;
  // ISO. `hasta` vacio = sigue abierto; la barra se dibuja hasta el borde
  // derecho de la ventana y se marca.
  desde: string;
  hasta: string | null;
  href: string;
};

export type BuqueEnGantt = {
  nombre: string;
  // 'propio', 'gestionado', 'terceros', o 'sin maestro' cuando el nombre que
  // trae el trabajo no esta en comercial.buques.
  relacion: string;
  propio: boolean;
};

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const DIA = 24 * 60 * 60 * 1000;
const VENTANA_MESES = 12;
// Lo que se corre con cada flecha. Un trimestre: mover de a un mes obliga a
// doce clics para ver el ano que viene.
const PASO_MESES = 3;

// Una fecha suelta ("2026-10-20") no es un instante y pasarla por `new Date`
// la pone en medianoche UTC, que en hora argentina es el dia anterior a las
// 21:00. Se la lee al mediodia para que caiga siempre en su propio dia.
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
function enMs(iso: string): number {
  return SOLO_FECHA.test(iso)
    ? Date.parse(`${iso}T12:00:00Z`)
    : new Date(iso).getTime();
}

// Las barras de un buque, repartidas en carriles para que dos que se pisan no
// queden una encima de la otra. Greedy: cada barra va al primer carril donde
// entra. Es lo que hace que un conflicto se VEA como dos renglones.
function enCarriles(barras: BarraOcupacion[], finVentana: number): BarraOcupacion[][] {
  const carriles: { fin: number; items: BarraOcupacion[] }[] = [];
  const ordenadas = [...barras].sort((a, b) => enMs(a.desde) - enMs(b.desde));

  for (const b of ordenadas) {
    const desde = enMs(b.desde);
    const hasta = b.hasta ? enMs(b.hasta) : finVentana;
    const carril = carriles.find((c) => c.fin <= desde);
    if (carril) {
      carril.items.push(b);
      carril.fin = hasta;
    } else {
      carriles.push({ fin: hasta, items: [b] });
    }
  }

  return carriles.map((c) => c.items);
}

function seSuperponen(a: BarraOcupacion, b: BarraOcupacion, finVentana: number): boolean {
  const aDesde = enMs(a.desde);
  const aHasta = a.hasta ? enMs(a.hasta) : finVentana;
  const bDesde = enMs(b.desde);
  const bHasta = b.hasta ? enMs(b.hasta) : finVentana;
  return aDesde < bHasta && bDesde < aHasta;
}

// Los dos avisos que da la pantalla, que no son lo mismo:
//
//   pisadas      dos trabajos CIERTOS sobre el mismo buque a la vez. Es un
//                problema: el buque no se puede partir en dos.
//   sobreFirme   una oportunidad en curso que cae encima de trabajo firme
//                del mismo buque. No es un error —se cotiza con el buque
//                tomado todo el tiempo— pero es lo que hay que saber antes
//                de prometer una fecha.
//
// Dos oportunidades que se pisan entre si NO se marcan: cotizar dos cosas
// para la misma ventana es el trabajo de todos los dias; tomarlas las dos no.
function avisos(
  barras: BarraOcupacion[],
  finVentana: number,
): { pisadas: Set<string>; sobreFirme: Set<string> } {
  const firmes = barras.filter((b) => b.clase === "proyecto");
  const posibles = barras.filter((b) => b.clase === "oportunidad");
  const pisadas = new Set<string>();
  const sobreFirme = new Set<string>();

  for (let i = 0; i < firmes.length; i++) {
    for (let j = i + 1; j < firmes.length; j++) {
      if (seSuperponen(firmes[i], firmes[j], finVentana)) {
        pisadas.add(firmes[i].id);
        pisadas.add(firmes[j].id);
      }
    }
  }

  for (const o of posibles) {
    if (firmes.some((f) => seSuperponen(o, f, finVentana))) sobreFirme.add(o.id);
  }

  return { pisadas, sobreFirme };
}

export default function OcupacionFlota({
  buques,
  barras,
  hoy,
}: {
  buques: BuqueEnGantt[];
  barras: BarraOcupacion[];
  // El dia de hoy lo manda el servidor, en hora argentina. Calcularlo aca
  // daria una linea de "hoy" distinta segun la maquina del que mira, y ademas
  // el primer dibujado no coincidiria con el del servidor.
  hoy: string;
}) {
  // La ventana arranca tres meses antes del mes corriente: lo que acaba de
  // pasar todavia importa, y lo que viene es casi todo lo que se mira.
  const mesDeHoy = useMemo(() => {
    const d = new Date(enMs(hoy));
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 3, 1, 12));
  }, [hoy]);

  const [desplazamiento, setDesplazamiento] = useState(0);
  const [verOportunidades, setVerOportunidades] = useState(true);

  const inicio = useMemo(
    () =>
      new Date(
        Date.UTC(
          mesDeHoy.getUTCFullYear(),
          mesDeHoy.getUTCMonth() + desplazamiento,
          1,
          12,
        ),
      ),
    [mesDeHoy, desplazamiento],
  );

  // Los doce meses de la ventana, con su ancho real: febrero es mas angosto
  // que marzo, y si todos midieran lo mismo las barras caerian corridas.
  const meses = useMemo(() => {
    const out: { label: string; anio: number; inicio: number; dias: number }[] = [];
    for (let i = 0; i < VENTANA_MESES; i++) {
      const m = new Date(
        Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1, 12),
      );
      const siguiente = new Date(
        Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i + 1, 1, 12),
      );
      out.push({
        label: MESES[m.getUTCMonth()],
        anio: m.getUTCFullYear(),
        inicio: m.getTime(),
        dias: Math.round((siguiente.getTime() - m.getTime()) / DIA),
      });
    }
    return out;
  }, [inicio]);

  const desdeVentana = meses[0].inicio;
  const hastaVentana = meses[11].inicio + meses[11].dias * DIA;
  const diasVentana = (hastaVentana - desdeVentana) / DIA;

  const pct = (ms: number) => ((ms - desdeVentana) / DIA / diasVentana) * 100;

  const visibles = useMemo(
    () =>
      barras.filter((b) => {
        if (!verOportunidades && b.clase === "oportunidad") return false;
        const d = enMs(b.desde);
        const h = b.hasta ? enMs(b.hasta) : hastaVentana;
        return d < hastaVentana && h > desdeVentana;
      }),
    [barras, verOportunidades, desdeVentana, hastaVentana],
  );

  // Los avisos se calculan por buque: dos trabajos a la vez sobre buques
  // distintos no son un conflicto, son dos buques trabajando.
  const { choques, encima } = useMemo(() => {
    const choques = new Set<string>();
    const encima = new Set<string>();
    for (const b of buques) {
      const suyas = visibles.filter((x) => x.buque === b.nombre);
      const r = avisos(suyas, hastaVentana);
      for (const id of r.pisadas) choques.add(id);
      for (const id of r.sobreFirme) encima.add(id);
    }
    return { choques, encima };
  }, [buques, visibles, hastaVentana]);

  // Un trabajo firme sin fecha de fin se dibuja hasta el borde derecho, asi
  // que se come todo lo que venga despues. Se avisa, porque si no el Gantt
  // parece estar diciendo algo que en realidad es un dato que falta.
  const abiertas = visibles.filter((b) => b.clase === "proyecto" && !b.hasta);

  const propios = buques.filter((b) => b.propio);
  const ajenos = buques.filter((b) => !b.propio);

  const hoyPct = pct(enMs(hoy));
  const hoyEntra = hoyPct >= 0 && hoyPct <= 100;

  const tituloVentana = `${meses[0].label} ${meses[0].anio} — ${meses[11].label} ${meses[11].anio}`;

  const barra = (b: BarraOcupacion) => {
    const d = Math.max(enMs(b.desde), desdeVentana);
    const h = Math.min(b.hasta ? enMs(b.hasta) : hastaVentana, hastaVentana);
    const izq = pct(d);
    // Un trabajo de un dia tiene que seguir siendo visible: media jornada de
    // ancho minimo.
    const ancho = Math.max(pct(h) - izq, (0.5 / diasVentana) * 100);
    const abierta = !b.hasta;
    const pisa = choques.has(b.id);
    const sobre = encima.has(b.id);

    const clases = [
      "gantt-barra",
      b.clase === "oportunidad" ? "es-posible" : "es-firme",
      b.origen === "estimado" && b.clase === "proyecto" ? "es-estimada" : "",
      pisa ? "pisada" : "",
      sobre ? "sobre-firme" : "",
      abierta ? "abierta" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const cuando = `${fechaLegible(b.desde)} → ${
      b.hasta ? fechaLegible(b.hasta) : "sin fin cargado"
    }`;
    const detalle = [
      b.nro,
      b.titulo,
      b.cliente,
      cuando,
      b.origen === "estimado" ? "fecha estimada" : null,
      pisa ? "se pisa con otro trabajo firme del mismo buque" : null,
      sobre ? "cae sobre trabajo ya tomado de este buque" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <Link
        key={b.id}
        href={b.href}
        className={clases}
        style={{ left: `${izq}%`, width: `${ancho}%` }}
        title={detalle}
      >
        {/* En una barra angosta el numero sale cortado en una letra y un
            punto, que no dice nada y ensucia. Debajo de ese ancho la barra va
            muda y el detalle queda en el title. */}
        {ancho >= 4 && (
          <span className="gantt-barra-texto">{b.nro ?? b.titulo}</span>
        )}
      </Link>
    );
  };

  const banda = (lista: BuqueEnGantt[]) =>
    lista.map((bq) => {
      const suyas = visibles.filter((b) => b.buque === bq.nombre);
      const carriles = enCarriles(suyas, hastaVentana);
      // Un buque sin trabajo en la ventana igual ocupa un renglon: que este
      // libre es justamente lo que se quiere ver.
      const filas = carriles.length > 0 ? carriles : [[]];

      return (
        <div key={bq.nombre} className="gantt-fila">
          <div className="gantt-buque">
            <strong>{bq.nombre}</strong>
            {suyas.length === 0 ? (
              <span className="gantt-buque-sub">sin trabajo en la ventana</span>
            ) : (
              <span className="gantt-buque-sub">
                {suyas.length === 1 ? "1 trabajo" : `${suyas.length} trabajos`}
              </span>
            )}
          </div>
          <div className="gantt-pista">
            {meses.map((m, i) => (
              <div
                key={`${m.anio}-${m.label}`}
                className="gantt-linea"
                style={{ left: `${pct(m.inicio)}%` }}
                aria-hidden={i === 0 ? true : undefined}
              />
            ))}
            {hoyEntra && (
              <div className="gantt-hoy" style={{ left: `${hoyPct}%` }} aria-hidden />
            )}
            {filas.map((carril, i) => (
              <div key={i} className="gantt-carril">
                {carril.map(barra)}
              </div>
            ))}
          </div>
        </div>
      );
    });

  return (
    <div className="card">
      <div className="card-title">
        <span>Ocupacion · {tituloVentana}</span>
        <div className="flex-gap">
          <label className="fila-check">
            <input
              type="checkbox"
              checked={verOportunidades}
              onChange={(e) => setVerOportunidades(e.target.checked)}
            />
            Ver oportunidades
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDesplazamiento((d) => d - PASO_MESES)}
          >
            Antes
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDesplazamiento(0)}
            disabled={desplazamiento === 0}
          >
            Hoy
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDesplazamiento((d) => d + PASO_MESES)}
          >
            Despues
          </button>
        </div>
      </div>

      <div className="gantt-ref">
        <span className="gantt-chip">
          <i className="m-firme" /> Trabajo firme
        </span>
        <span className="gantt-chip">
          <i className="m-estimada" /> Firme, con fecha estimada
        </span>
        <span className="gantt-chip">
          <i className="m-posible" /> Oportunidad en curso
        </span>
        <span className="gantt-chip">
          <i className="m-pisada" /> Dos trabajos firmes a la vez
        </span>
        <span className="gantt-chip">
          <i className="m-encima" /> Oportunidad sobre buque ya tomado
        </span>
      </div>

      {/* El resumen en palabras. El dibujo se lee de un vistazo, pero lo que
          hay que hacer algo al respecto conviene que este escrito. */}
      {abiertas.length > 0 && (
        <div className="info-box warn mb16">
          <strong>
            {abiertas.length === 1
              ? "Un trabajo firme no tiene fecha de fin"
              : `${abiertas.length} trabajos firmes no tienen fecha de fin`}
          </strong>{" "}
          — {abiertas.map((b) => b.nro ?? b.titulo).join(", ")}. Sin fin, el
          buque figura tomado hasta el borde del Gantt, y cualquier oportunidad
          posterior va a aparecer como que cae encima. Es lo que hay cargado,
          no una conclusion: cargale el fin y el dibujo se acomoda.
        </div>
      )}

      {(choques.size > 0 || encima.size > 0) && (
        <div className="info-box warn mb16">
          {choques.size > 0 && (
            <div>
              <strong>{choques.size} trabajos firmes se pisan</strong> sobre un
              mismo buque. Un buque no se puede partir en dos: hay que correr
              una fecha o cambiar de buque.
            </div>
          )}
          {encima.size > 0 && (
            <div className={choques.size > 0 ? "mt8" : undefined}>
              <strong>
                {encima.size === 1
                  ? "1 oportunidad en curso cae"
                  : `${encima.size} oportunidades en curso caen`}
              </strong>{" "}
              sobre fechas en las que el buque ya esta tomado. No es un error
              —se cotiza igual— pero conviene saberlo antes de prometer una
              fecha.
            </div>
          )}
        </div>
      )}

      <div className="gantt">
        <div className="gantt-cab">
          <div className="gantt-buque" />
          <div className="gantt-pista gantt-meses">
            {meses.map((m) => (
              <div
                key={`${m.anio}-${m.label}`}
                className="gantt-mes"
                style={{ left: `${pct(m.inicio)}%`, width: `${(m.dias / diasVentana) * 100}%` }}
              >
                {m.label}
                {m.label === "Ene" && <span className="gantt-anio">{m.anio}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="gantt-banda-titulo">Flota propia</div>
        {banda(propios)}

        {ajenos.length > 0 && (
          <>
            <div className="gantt-banda-titulo">
              Buques de terceros · gestionados y brokereados
            </div>
            {banda(ajenos)}
          </>
        )}
      </div>
    </div>
  );
}
