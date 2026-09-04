import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { etiquetaTipoZona, TIPOS_ZONA, type Zona } from "@/lib/types";

// El maestro de lugares. Existe para que el lugar de un trabajo sea un dato y
// no una frase: de aca sale el desplegable de la oportunidad y del proyecto, y
// de aca sale el mapa.
export default async function ZonasPage() {
  const supabase = await createClient();

  const [{ data, error }, { data: opp }, { data: proy }] = await Promise.all([
    supabase.from("zonas").select("*").order("nombre", { ascending: true }),
    supabase.from("oportunidades").select("zona_id"),
    supabase.from("proyectos").select("zona_id"),
  ]);

  const zonas = (data ?? []) as Zona[];

  // Cuantos trabajos hay en cada zona. Se cuenta aca y no con una vista: son
  // dos lecturas de una columna y evita otra migracion.
  const usos = new Map<string, { oportunidades: number; proyectos: number }>();
  const contar = (filas: { zona_id: string | null }[] | null, campo: "oportunidades" | "proyectos") => {
    for (const f of filas ?? []) {
      if (!f.zona_id) continue;
      const actual = usos.get(f.zona_id) ?? { oportunidades: 0, proyectos: 0 };
      actual[campo] += 1;
      usos.set(f.zona_id, actual);
    }
  };
  contar(opp, "oportunidades");
  contar(proy, "proyectos");

  const sinUbicar = zonas.filter((z) => z.lat === null);

  // Agrupadas por tipo, en el orden en que estan declaradas.
  const grupos = TIPOS_ZONA.map((t) => ({
    ...t,
    items: zonas.filter((z) => z.tipo === t.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudieron leer las zonas: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0025_zonas.sql</span>.
        </div>
      )}

      <div className="info-box accent mb16">
        Cada lugar donde se trabaja, una vez. La oportunidad y el proyecto lo
        eligen de aca en vez de escribirlo, asi que{" "}
        <strong>corregir una coordenada mueve todos sus trabajos en el{" "}
        <Link href="/mapa">mapa</Link></strong> — y no vuelven a existir "Bahia
        Blanca", "Bahía Blanca" e "Ing. White" como tres lugares distintos.
      </div>

      {sinUbicar.length > 0 && (
        <div className="info-box warn mb16">
          {sinUbicar.length === 1 ? "Falta ubicar" : "Faltan ubicar"}{" "}
          <strong>{sinUbicar.map((z) => z.nombre).join(", ")}</strong>. Sirven
          igual para agrupar, pero los trabajos que caigan ahi no se van a poder
          dibujar hasta que alguien cargue la posicion.
        </div>
      )}

      {!error && zonas.length === 0 && (
        <div className="empty-state">
          Todavia no hay zonas cargadas.{" "}
          <Link href="/zonas/nueva">
            <strong>Cargar la primera</strong>
          </Link>
          .
        </div>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="card">
          <div className="card-title">
            <span>
              {grupo.label} ({grupo.items.length})
            </span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Posicion</th>
                  <th>Oportunidades</th>
                  <th>Proyectos</th>
                  <th>Notas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((z) => {
                  const u = usos.get(z.id) ?? { oportunidades: 0, proyectos: 0 };
                  return (
                    <tr key={z.id}>
                      <td>
                        {z.nombre}
                        {!z.activa && (
                          <div className="text-muted cel-sub">retirada</div>
                        )}
                      </td>
                      <td className="text-mono">
                        {z.lat === null ? (
                          <span className="badge b-amber">sin ubicar</span>
                        ) : (
                          `${Number(z.lat).toFixed(3)}, ${Number(z.lon).toFixed(3)}`
                        )}
                      </td>
                      <td className="text-mono">
                        {u.oportunidades === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          u.oportunidades
                        )}
                      </td>
                      <td className="text-mono">
                        {u.proyectos === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          u.proyectos
                        )}
                      </td>
                      <td className="text-muted cel-texto">{z.notas ?? "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/zonas/${z.id}`} className="btn btn-ghost btn-sm">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="hint">
        {zonas.length} {zonas.length === 1 ? "zona" : "zonas"} en total, de las
        cuales {zonas.filter((z) => z.lat !== null).length} se pueden dibujar.
        Los tipos que no aparecen es que no tienen ninguna:{" "}
        {TIPOS_ZONA.filter((t) => !grupos.some((g) => g.id === t.id))
          .map((t) => etiquetaTipoZona(t.id))
          .join(", ") || "ninguno"}
        .
      </div>
    </div>
  );
}
