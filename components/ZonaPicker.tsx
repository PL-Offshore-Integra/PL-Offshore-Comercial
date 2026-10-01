"use client";

import Link from "next/link";
import { useState } from "react";
import { etiquetaTipoZona, TIPOS_ZONA, type Zona } from "@/lib/types";

// Donde se hace el trabajo, elegido del maestro de zonas (0025).
//
// El desplegable deja cargar un lugar que no esta, igual que ClientePicker
// con las empresas. Antes no: la idea era que una zona necesita coordenadas y
// un desplegable no las puede inventar. Lo que mostro el uso es que el
// maestro nunca va a tener el 100% de los puertos —faltaban Las Toninas y
// Villa Gesell— y que la alternativa real no era ir a cargarla a Zonas: era
// dejar el campo vacio y perder el dato.
//
// Asi que se invierte: el lugar se crea sin coordenadas y queda "sin ubicar".
// Eso no es un error ni un registro a medias —la zona sirve igual para
// agrupar, filtrar y contar—, solo que ese trabajo no se dibuja en el mapa
// hasta que alguien le ponga la posicion en Zonas. El aviso lo dice.
//
// Aca no se escribe nada en la base: viaja `zona_id = "nueva"` mas el nombre
// y el tipo, y la crea el servidor (resolverZona). Un desplegable no puede
// quedar a medio guardar.
export default function ZonaPicker({
  zonas,
  zonaId,
  label = "Zona del trabajo",
  ayuda,
}: {
  zonas: Zona[];
  zonaId?: string | null;
  label?: string;
  ayuda?: string;
}) {
  const [zona, setZona] = useState(zonaId ?? "");
  const nueva = zona === "nueva";

  const elegida = zonas.find((z) => z.id === zona) ?? null;
  const sinUbicar = elegida !== null && elegida.lat === null;

  // Agrupadas por tipo: los puertos son muchos y las areas offshore pocas,
  // y mezclados obligan a leer la lista entera.
  const grupos = TIPOS_ZONA.map((t) => ({
    ...t,
    items: zonas.filter((z) => z.tipo === t.id),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="fg">
        <label>{label}</label>
        <select name="zona_id" value={zona} onChange={(e) => setZona(e.target.value)}>
          <option value="">Sin definir</option>
          {grupos.map((g) => (
            <optgroup key={g.id} label={g.label}>
              {g.items.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                  {z.lat === null ? " (sin ubicar)" : ""}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="nueva">+ Nuevo lugar</option>
        </select>
        <span className="hint">
          {sinUbicar ? (
            <>
              {etiquetaTipoZona(elegida.tipo)} sin coordenadas: no se dibuja en el{" "}
              <Link href="/mapa">mapa</Link> hasta que se le cargue la posicion en{" "}
              <Link href="/zonas">Zonas</Link>.
            </>
          ) : (
            (ayuda ?? "Lo que lo pone en el mapa")
          )}
        </span>
      </div>

      {nueva && (
        <>
          <div className="fg">
            <label>Nombre del lugar</label>
            <input
              name="zona_nueva_nombre"
              placeholder="Las Toninas"
              required
              autoFocus
            />
          </div>
          <div className="fg">
            <label>Que es</label>
            {/* Puerto primero porque es lo que casi siempre falta. El tipo no
                es decoracion: es como se agrupa el desplegable y como se
                pinta el punto en el mapa. */}
            <select name="zona_nueva_tipo" defaultValue="puerto">
              {TIPOS_ZONA.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <span className="hint">
              Queda cargado sin coordenadas. Sirve igual para agrupar y
              filtrar; para que aparezca en el <Link href="/mapa">mapa</Link>,
              ponele la posicion en <Link href="/zonas">Zonas</Link>.
            </span>
          </div>
        </>
      )}
    </>
  );
}
