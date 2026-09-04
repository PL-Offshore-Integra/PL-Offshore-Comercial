import {
  ESTADOS_DE_COBRANZA,
  type BarraDeCobranza,
  type EstadoDeCobranza,
} from "@/lib/facturas";
import type { Moneda } from "@/lib/types";

// El grafico del tablero: una barra apilada por buque con los cuatro estados
// de la plata, todas en la misma escala.
//
// POR QUE BARRAS Y NO LA TORTA DE LA PLANILLA
//
//   La pregunta es de parte-sobre-total y ademas hay que comparar buques entre
//   si. Una torta contesta la primera a medias —obliga a leer angulos— y la
//   segunda no: dos tortas al lado no se comparan. Con barras apiladas a la
//   misma escala se lee derecho cuanto hay, de quien, y en que estado.
//
// POR QUE HTML Y NO SVG
//
//   La primera version era SVG con viewBox. Al escalarse a lo ancho de la
//   tarjeta se llevaba la tipografia con el: "Golondrina de Mar" salia en 8px
//   y encima cortado. Con divs el texto es texto —tamaño real, tokens del
//   modulo— y los anchos en porcentaje escalan solos. Visto en pantalla, no
//   supuesto.
//
// LOS COLORES
//
//   Los cuatro son estados, no series, asi que salen de la paleta de estado:
//   verde cobrado, ambar sin facturar, rojo vencido, y gris "en plazo", que es
//   el estado en el que no hay nada que hacer. El orden esta fijado en
//   ESTADOS_DE_COBRANZA y no es decorativo: verde y rojo nunca quedan pegados,
//   porque es el par que no se distingue en deuteranopia (ΔE 4,1 medido). En
//   el orden que se usa el peor par adyacente da 13,6, arriba del umbral.
//
//   El color nunca es la unica pista: la referencia dice el monto de cada
//   estado, cada segmento se nombra al pasar por encima y la pantalla de
//   Facturacion tiene la tabla completa. Es lo que exige el ambar, que sobre
//   blanco no llega a 3:1 de contraste.

const plata = (moneda: Moneda, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);

const del = (estado: EstadoDeCobranza) =>
  ESTADOS_DE_COBRANZA.find((e) => e.id === estado) ?? ESTADOS_DE_COBRANZA[1];

export default function GraficoCobranza({
  barras,
  moneda,
  totalesPorEstado,
  elegido = null,
  alElegir,
}: {
  barras: BarraDeCobranza[];
  moneda: Moneda;
  totalesPorEstado: { estado: EstadoDeCobranza; monto: number }[];
  // El estado filtrado, para atenuar el resto.
  elegido?: EstadoDeCobranza | null;
  // Si viene, cada segmento y cada chip se puede tocar para filtrar.
  alElegir?: (estado: EstadoDeCobranza) => void;
}) {
  // Todas las barras contra el mismo maximo: es lo que permite comparar un
  // buque con otro de un vistazo.
  const escala = Math.max(...barras.map((b) => b.total), 1);

  return (
    <div>
      {/* La referencia va arriba y con el monto de cada estado: con cuatro
          series tiene que estar siempre, y aca ademas es lo que sostiene al
          ambar. */}
      <div className="grafico-ref">
        {totalesPorEstado.map((t) => {
          const e = del(t.estado);
          const activo = elegido === t.estado;
          const contenido = (
            <>
              <i style={{ background: e.color }} />
              <span>{e.label}</span>
              <b>{plata(moneda, t.monto)}</b>
            </>
          );
          // La referencia tambien filtra: es donde primero se le apunta.
          return alElegir ? (
            <button
              key={t.estado}
              type="button"
              className={`grafico-chip ${activo ? "activo" : ""}`}
              aria-pressed={activo}
              onClick={() => alElegir(t.estado)}
            >
              {contenido}
            </button>
          ) : (
            <span key={t.estado} className="grafico-chip">
              {contenido}
            </span>
          );
        })}
      </div>

      {barras.map((barra) => {
        const conMonto = barra.partes.filter((p) => p.monto > 0);
        return (
          <div key={barra.nombre} className="barra-fila">
            <div className="barra-cabeza">
              <span className="barra-nombre">{barra.nombre}</span>
              <b className="barra-total">{plata(moneda, barra.total)}</b>
            </div>
            <div className="barra-pista">
              {conMonto.map((parte) => {
                const porcentaje = (parte.monto / escala) * 100;
                const e = del(parte.estado);
                const atenuado = elegido !== null && elegido !== parte.estado;

                const adentro = (
                  <>
                    {/* Etiqueta directa adentro del segmento: con cuatro
                        series el color no alcanza para identificar. Solo
                        cuando entra: abajo del 11% el numero sale cortado y
                        es peor que no estar. La tinta la decide el fondo —el
                        ambar es demasiado claro para texto blanco—. */}
                    {porcentaje >= 11 && (
                      <span
                        className="barra-etiqueta"
                        style={{ color: e.id === "sin_facturar" ? "#0B0B0B" : "#FFFFFF" }}
                      >
                        {plata(moneda, parte.monto)}
                      </span>
                    )}
                    {/* El globo al pasar por encima: dice de que buque es, que
                        estado y cuanto, que es lo que un segmento angosto no
                        puede escribir adentro. */}
                    <span className="barra-tip" aria-hidden="true">
                      <b>{e.label}</b>
                      {plata(moneda, parte.monto)}
                      <span>{barra.nombre}</span>
                    </span>
                  </>
                );

                const estilo = { width: `${porcentaje}%`, background: e.color };
                const clases = `barra-seg ${atenuado ? "atenuado" : ""}`;
                const titulo = `${barra.nombre} · ${e.label}: ${plata(moneda, parte.monto)}`;

                return alElegir ? (
                  <button
                    key={parte.estado}
                    type="button"
                    className={clases}
                    style={estilo}
                    title={titulo}
                    aria-pressed={elegido === parte.estado}
                    onClick={() => alElegir(parte.estado)}
                  >
                    {adentro}
                  </button>
                ) : (
                  <div key={parte.estado} className={clases} style={estilo} title={titulo}>
                    {adentro}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
