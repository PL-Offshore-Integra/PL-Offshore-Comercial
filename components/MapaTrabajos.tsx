"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIAS_MAPA,
  type CategoriaMapa,
  type Moneda,
  type TrabajoEnElMapa,
  type Zona,
} from "@/lib/types";

// El mapa de los trabajos. Un punto por lugar, no por trabajo: si en Bahia
// Blanca hay dos oportunidades y un trabajo terminado, es un solo circulo
// partido en dos colores con un 3 en el medio, y el globo lista los tres.
//
// Por que no un punto por trabajo, desplazado un poco para que no se tape:
// porque desplazar un punto es mentir sobre donde queda. Un lugar tiene una
// posicion y es esa.
//
// Leaflet se importa adentro del efecto y no arriba: toca `window` al
// cargarse, y este componente igual se renderiza en el servidor una vez
// —"use client" dice donde vive el estado, no que no haya SSR—. El CSS si
// puede ir arriba, que no toca nada.

type Grupo = {
  zona: Zona;
  lat: number;
  lon: number;
  porCategoria: { categoria: CategoriaMapa; color: string; label: string; trabajos: TrabajoEnElMapa[] }[];
  total: number;
};

const plata = (moneda: Moneda, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);

// El circulo del mapa, partido por categoria. Es un donut de SVG: un arco por
// categoria, en proporcion a cuantos trabajos hay de cada una.
function donutSVG(
  partes: { color: string; n: number }[],
  total: number,
  diametro: number
): string {
  const grosor = Math.max(4, Math.round(diametro * 0.28));
  const r = (diametro - grosor) / 2;
  const c = 2 * Math.PI * r;
  const centro = diametro / 2;

  let acumulado = 0;
  const arcos = partes
    .filter((p) => p.n > 0)
    .map((p) => {
      const largo = (p.n / total) * c;
      const arco = `<circle cx="${centro}" cy="${centro}" r="${r}" fill="none"
        stroke="${p.color}" stroke-width="${grosor}"
        stroke-dasharray="${largo} ${c - largo}"
        stroke-dashoffset="${-acumulado}" />`;
      acumulado += largo;
      return arco;
    })
    .join("");

  // El numero solo cuando hay mas de uno: en un punto con un solo trabajo no
  // agrega nada y ensucia.
  const numero =
    total > 1
      ? `<text x="${centro}" y="${centro}" text-anchor="middle" dominant-baseline="central"
           font-size="${Math.round(diametro * 0.34)}" font-weight="700"
           fill="#002247" font-family="Archivo, system-ui, sans-serif">${total}</text>`
      : "";

  return `<svg width="${diametro}" height="${diametro}" viewBox="0 0 ${diametro} ${diametro}"
    style="transform:rotate(-90deg)" aria-hidden="true">
      <circle cx="${centro}" cy="${centro}" r="${r + grosor / 2}" fill="#FFFFFF" opacity=".92" />
      ${arcos}
      <g style="transform:rotate(90deg);transform-origin:${centro}px ${centro}px">${numero}</g>
    </svg>`;
}

function globoHTML(grupo: Grupo): string {
  const escapar = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const bloques = grupo.porCategoria
    .filter((c) => c.trabajos.length > 0)
    .map((c) => {
      const filas = c.trabajos
        .map(
          (t) => `<li>
            <a href="${t.href}">${escapar([t.nro, t.titulo].filter(Boolean).join(" · "))}</a>
            <span>${escapar(
              [t.cliente, t.buque, t.cuando, plata(t.moneda, t.valor)]
                .filter(Boolean)
                .join(" · ")
            )}</span>
          </li>`
        )
        .join("");
      return `<div class="globo-grupo">
        <div class="globo-cat"><i style="background:${c.color}"></i>${escapar(c.label)}</div>
        <ul>${filas}</ul>
      </div>`;
    })
    .join("");

  return `<div class="globo">
    <strong>${escapar(grupo.zona.nombre)}</strong>
    ${bloques}
  </div>`;
}

export default function MapaTrabajos({
  zonas,
  trabajos,
}: {
  zonas: Zona[];
  trabajos: TrabajoEnElMapa[];
}) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  // `any` a proposito: los tipos de Leaflet solo existen despues del import
  // dinamico, y tiparlos aca obligaria a importar el modulo arriba, que es
  // justo lo que no se puede.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const leaflet = useRef<any>(null);
  const mapa = useRef<any>(null);
  const capa = useRef<any>(null);
  const [listo, setListo] = useState(false);

  const [visibles, setVisibles] = useState<Record<CategoriaMapa, boolean>>({
    oportunidad: true,
    en_curso: true,
    terminado: true,
  });

  // Un grupo por zona ubicada, con sus trabajos partidos por categoria.
  const grupos = useMemo<Grupo[]>(() => {
    const porZona = new Map<string, TrabajoEnElMapa[]>();
    for (const t of trabajos) {
      const actual = porZona.get(t.zona_id);
      if (actual) actual.push(t);
      else porZona.set(t.zona_id, [t]);
    }

    return zonas
      .filter((z) => z.lat !== null && z.lon !== null && porZona.has(z.id))
      .map((z) => {
        const suyos = porZona.get(z.id) ?? [];
        const porCategoria = CATEGORIAS_MAPA.map((c) => ({
          categoria: c.id,
          color: c.color,
          label: c.label,
          trabajos: suyos.filter((t) => t.categoria === c.id),
        }));
        return {
          zona: z,
          lat: Number(z.lat),
          lon: Number(z.lon),
          porCategoria,
          total: suyos.length,
        };
      });
  }, [zonas, trabajos]);

  // 1) Crear el mapa, una sola vez.
  useEffect(() => {
    let vivo = true;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!vivo || !contenedor.current || mapa.current) return;

      leaflet.current = L;
      mapa.current = L.map(contenedor.current, {
        // El scroll de la rueda mueve la pagina, no el mapa: si no, bajar por
        // la pantalla se convierte en un zoom involuntario.
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([-42, -63], 4);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa.current);

      capa.current = L.layerGroup().addTo(mapa.current);
      setListo(true);
    })();

    return () => {
      vivo = false;
      if (mapa.current) {
        mapa.current.remove();
        mapa.current = null;
        capa.current = null;
      }
    };
  }, []);

  // 2) Dibujar los puntos, y volver a dibujarlos cuando se filtra.
  useEffect(() => {
    const L = leaflet.current;
    if (!listo || !L || !capa.current) return;

    capa.current.clearLayers();
    const posiciones: [number, number][] = [];

    for (const g of grupos) {
      const partes = g.porCategoria
        .filter((c) => visibles[c.categoria])
        .map((c) => ({ color: c.color, n: c.trabajos.length }));
      const total = partes.reduce((a, p) => a + p.n, 0);
      if (total === 0) continue;

      const d = 24 + Math.min(total - 1, 4) * 4;
      const icono = L.divIcon({
        html: donutSVG(partes, total, d),
        className: "marcador-mapa",
        iconSize: [d, d],
        iconAnchor: [d / 2, d / 2],
        popupAnchor: [0, -d / 2],
      });

      const visto: Grupo = {
        ...g,
        porCategoria: g.porCategoria.filter((c) => visibles[c.categoria]),
        total,
      };

      L.marker([g.lat, g.lon], { icon: icono, title: g.zona.nombre })
        .bindPopup(globoHTML(visto), { maxWidth: 320, minWidth: 240 })
        .addTo(capa.current);

      posiciones.push([g.lat, g.lon]);
    }

    if (posiciones.length === 1) {
      mapa.current.setView(posiciones[0], 6);
    } else if (posiciones.length > 1) {
      mapa.current.fitBounds(posiciones, { padding: [48, 48], maxZoom: 8 });
    }
  }, [listo, grupos, visibles]);

  // Cuantos hay de cada categoria, para la referencia. Se cuenta sobre todos
  // los ubicados, no sobre los visibles: es lo que hay, no lo que se ve.
  const cuentas = CATEGORIAS_MAPA.map((c) => ({
    ...c,
    n: grupos.reduce(
      (a, g) => a + (g.porCategoria.find((x) => x.categoria === c.id)?.trabajos.length ?? 0),
      0
    ),
  }));

  return (
    <div>
      <div className="mapa-referencia">
        {cuentas.map((c) => (
          <label key={c.id} className={`chip-mapa ${visibles[c.id] ? "" : "apagado"}`}>
            <input
              type="checkbox"
              checked={visibles[c.id]}
              onChange={(e) => setVisibles((v) => ({ ...v, [c.id]: e.target.checked }))}
            />
            <i style={{ background: c.color }} />
            <span>{c.label}</span>
            <b>{c.n}</b>
          </label>
        ))}
      </div>

      <div ref={contenedor} className="mapa" />

      {grupos.length === 0 && (
        <div className="empty-state mt16">
          Todavia no hay ningun trabajo con zona ubicada, asi que el mapa esta
          vacio. Se llena eligiendo <strong>donde se haria</strong> en una
          oportunidad, o <strong>donde se hace</strong> en un proyecto.
        </div>
      )}

      <span className="hint">
        Un punto por lugar, partido por categoria y con la cantidad en el medio.
        Los proyectos por arrancar cuentan como en curso: ya son trabajo, no una
        posibilidad. Los cancelados no se dibujan.
      </span>
    </div>
  );
}
