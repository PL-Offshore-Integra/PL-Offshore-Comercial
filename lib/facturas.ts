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
