import Link from "next/link";
import { etiquetaTipoZona, TIPOS_ZONA, type Zona } from "@/lib/types";

// Donde se hace el trabajo, elegido del maestro de zonas (0025).
//
// A diferencia de ClientePicker, aca no hay "+ Nueva": una zona necesita
// coordenadas, y un desplegable no las puede inventar. Se cargan una sola vez
// en Maestros -> Zonas y desde ahi las usa todo el modulo. Por eso este
// componente no tiene estado y no necesita ser cliente.
//
// El aviso de "sin ubicar" no es un error: la zona sirve igual para agrupar,
// solo que ese trabajo no se va a poder dibujar hasta que alguien le ponga la
// posicion.
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
  const elegida = zonas.find((z) => z.id === zonaId) ?? null;
  const sinUbicar = elegida !== null && elegida.lat === null;

  // Agrupadas por tipo: los puertos son muchos y las areas offshore pocas,
  // y mezclados obligan a leer la lista entera.
  const grupos = TIPOS_ZONA.map((t) => ({
    ...t,
    items: zonas.filter((z) => z.tipo === t.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fg">
      <label>{label}</label>
      <select name="zona_id" defaultValue={zonaId ?? ""}>
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
  );
}
