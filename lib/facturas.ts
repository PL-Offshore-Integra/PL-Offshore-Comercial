import { diasEntre } from "@/lib/fechas";
import {
  estadoDeFactura,
  netoDeFactura,
  type FacturaListada,
  type Moneda,
} from "@/lib/types";

// Los numeros del tablero de la planilla, calculados de las facturas.
//
// Se agrupan por moneda y no se suman entre si: sumar dolares con pesos da un
// numero que no existe. La planilla es toda en USD, asi que en la practica hay
// un solo grupo, pero el dia que se facture en pesos el total no va a mentir.
export type TotalesDeCobranza = {
  moneda: Moneda;
  facturas: number;
  facturado: number;
  comisiones: number;
  neto: number;
  // Lo cobrado, separado por la moneda en la que entro la plata: se factura en
  // dolares y se puede cobrar en pesos al TC acordado.
  cobrado: number;
  cobradoEnUSD: number;
  cobradoEnARS: number;
  // Emitido y sin cobrar, partido en dos: lo que todavia esta en plazo y lo
  // que ya se paso de la fecha.
  enPlazo: number;
  vencido: number;
  porcentajeCobrado: number;
  // Cuanto tarda en entrar la plata desde que se termino el trabajo. Si la
  // factura no cuelga de una salida se mide desde la emision.
  promedioDiasAlCobro: number | null;
};

export function diasAlCobro(f: FacturaListada): number | null {
  if (!f.cobro_fecha) return null;
  const base = f.salida_hasta?.slice(0, 10) ?? f.fecha_emision;
  return diasEntre(base, f.cobro_fecha);
}

export function totalesDeCobranza(
  facturas: FacturaListada[],
  hoy: string
): TotalesDeCobranza[] {
  const monedas = [...new Set(facturas.map((f) => f.moneda))];

  return monedas.map((moneda) => {
    const suyas = facturas.filter((f) => f.moneda === moneda);
    const suma = (fs: FacturaListada[]) =>
      fs.reduce((a, f) => a + netoDeFactura(f), 0);

    const cobradas = suyas.filter((f) => f.cobro_moneda !== null);
    const plazos = cobradas
      .map((f) => diasAlCobro(f))
      .filter((d): d is number => d !== null);

    const facturado = suyas.reduce((a, f) => a + Number(f.importe ?? 0), 0);
    const cobrado = suma(cobradas);

    return {
      moneda,
      facturas: suyas.length,
      facturado,
      comisiones: suyas.reduce((a, f) => a + Number(f.comision ?? 0), 0),
      neto: suma(suyas),
      cobrado,
      cobradoEnUSD: suma(cobradas.filter((f) => f.cobro_moneda === "USD")),
      cobradoEnARS: suma(cobradas.filter((f) => f.cobro_moneda === "ARS")),
      enPlazo: suma(suyas.filter((f) => estadoDeFactura(f, hoy) === "en_plazo")),
      vencido: suma(suyas.filter((f) => estadoDeFactura(f, hoy) === "vencida")),
      porcentajeCobrado: facturado > 0 ? cobrado / facturado : 0,
      promedioDiasAlCobro: plazos.length
        ? Math.round(plazos.reduce((a, d) => a + d, 0) / plazos.length)
        : null,
    };
  });
}

// ── LOS CUATRO ESTADOS DE LA PLATA ────────────────────────────────────────
//
// Es la torta del tablero de la planilla, en el orden en que hay que hacer
// algo al respecto: lo cobrado ya esta, lo que esta en plazo se espera, lo que
// falta facturar depende de nosotros y lo vencido hay que ir a buscarlo.
//
// El orden tambien decide los colores que quedan pegados en la barra: verde y
// rojo nunca terminan uno al lado del otro, que es el par que un daltonico no
// distingue (ΔE 4,1 en deuteranopia, medido con el validador).
export const ESTADOS_DE_COBRANZA = [
  { id: "cobrado", label: "Cobrado", color: "#0CA30C" },
  { id: "en_plazo", label: "En plazo", color: "#8A939C" },
  { id: "sin_facturar", label: "Sin facturar", color: "#FAB219" },
  { id: "vencido", label: "Vencido", color: "#D03B3B" },
] as const;

export type EstadoDeCobranza = (typeof ESTADOS_DE_COBRANZA)[number]["id"];

export type BarraDeCobranza = {
  nombre: string;
  total: number;
  partes: { estado: EstadoDeCobranza; monto: number }[];
};

// Una barra por buque, mas una del total, todas en la misma moneda y con la
// misma escala: asi se ve de un vistazo que buque pesa mas, que es lo que
// hacia el grafico de barras de la planilla.
//
// `sinFacturar` son las salidas cargadas que todavia no tienen factura, con su
// valor calculado. Es plata que existe pero todavia no se pidio.
export function cobranzaPorBuque(
  facturas: FacturaListada[],
  sinFacturar: { buque: string | null; moneda: Moneda; valor: number }[],
  hoy: string,
  moneda: Moneda
): BarraDeCobranza[] {
  const suyas = facturas.filter((f) => f.moneda === moneda);
  const suyasSin = sinFacturar.filter((s) => s.moneda === moneda);

  const buques = [
    ...new Set([
      ...suyas.map((f) => f.buque ?? "Sin buque"),
      ...suyasSin.map((s) => s.buque ?? "Sin buque"),
    ]),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const barra = (nombre: string | null): BarraDeCobranza => {
    const fs = nombre === null ? suyas : suyas.filter((f) => (f.buque ?? "Sin buque") === nombre);
    const ss =
      nombre === null ? suyasSin : suyasSin.filter((s) => (s.buque ?? "Sin buque") === nombre);

    const monto = (fs2: FacturaListada[]) => fs2.reduce((a, f) => a + netoDeFactura(f), 0);

    const partes = [
      { estado: "cobrado" as const, monto: monto(fs.filter((f) => f.cobro_moneda !== null)) },
      {
        estado: "en_plazo" as const,
        monto: monto(fs.filter((f) => estadoDeFactura(f, hoy) === "en_plazo")),
      },
      { estado: "sin_facturar" as const, monto: ss.reduce((a, s) => a + s.valor, 0) },
      {
        estado: "vencido" as const,
        monto: monto(fs.filter((f) => estadoDeFactura(f, hoy) === "vencida")),
      },
    ];

    return {
      nombre: nombre ?? "Total",
      total: partes.reduce((a, p) => a + p.monto, 0),
      partes,
    };
  };

  // Con un solo buque la barra del total repetiria la misma linea.
  const porBuque = buques.map((b) => barra(b));
  return porBuque.length > 1 ? [barra(null), ...porBuque] : porBuque;
}
