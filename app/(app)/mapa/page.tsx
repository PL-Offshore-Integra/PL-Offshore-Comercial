import Link from "next/link";
import MapaTrabajos from "@/components/MapaTrabajos";
import { fechaConHoraSiTiene } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import { leerZonas } from "@/lib/zonas";
import {
  CATEGORIAS_MAPA,
  type CategoriaMapa,
  type Moneda,
  type TrabajoEnElMapa,
  type Zona,
} from "@/lib/types";

// El mapa de los trabajos: donde se harian los posibles, donde se esta
// trabajando y donde se trabajo.
//
// Las tres categorias salen del estado, no de una columna nueva:
//
//   oportunidad   una oportunidad en curso. Las adjudicadas no cuentan dos
//                 veces: ya estan como proyecto. Las canceladas no son un
//                 lugar donde se trabaje.
//   en_curso      un proyecto por arrancar o en curso. Por arrancar entra
//                 aca porque ya es trabajo, no una posibilidad.
//   terminado     un proyecto finalizado. Es la huella que se va acumulando.
//
// Lo que no se puede dibujar no se esconde: abajo del mapa quedan listados los
// trabajos sin zona y los que estan en una zona sin coordenadas. Un mapa que
// se traga la mitad de los datos en silencio es peor que no tener mapa.

function fila(o: {
  id: string;
  nro: string | null;
  titulo: string;
  cliente: string | null;
  buque: string | null;
  valor: number | string | null;
  moneda: string | null;
  cuando: string | null;
  zona_id: string | null;
  categoria: CategoriaMapa;
  href: string;
}): TrabajoEnElMapa & { zona_id: string } {
  return {
    id: o.id,
    categoria: o.categoria,
    nro: o.nro,
    titulo: o.titulo,
    cliente: o.cliente,
    buque: o.buque,
    valor: Number(o.valor ?? 0),
    moneda: (o.moneda === "ARS" ? "ARS" : "USD") as Moneda,
    cuando: o.cuando ? fechaConHoraSiTiene(o.cuando) : null,
    href: o.href,
    zona_id: o.zona_id ?? "",
  };
}

export default async function MapaPage() {
  const supabase = await createClient();

  // Todas las zonas, incluidas las retiradas: un trabajo viejo puede estar en
  // una zona que hoy no se ofrece mas, y ese punto tiene que seguir estando.
  const [zonas, { data: opp, error: eOpp }, { data: proy, error: eProy }] = await Promise.all([
    leerZonas(false),
    supabase
      .from("oportunidades")
      .select(
        "id, nro_oportunidad, compania, cliente_final, buque, valor, moneda, fecha_inicio_estimada, zona_id"
      )
      .eq("estado", "en_curso"),
    supabase
      .from("proyectos")
      .select(
        "id, nro_proyecto, nombre, compania, cliente_final, buque, valor, moneda, fecha_inicio_estimada, zona_id, estado"
      )
      .neq("estado", "cancelado"),
  ]);

  const error = eOpp ?? eProy;

  const deOportunidades = (opp ?? []).map((o) =>
    fila({
      id: o.id,
      nro: o.nro_oportunidad,
      titulo: o.compania,
      cliente: o.cliente_final ? `para ${o.cliente_final}` : null,
      buque: o.buque,
      valor: o.valor,
      moneda: o.moneda,
      cuando: o.fecha_inicio_estimada,
      zona_id: o.zona_id,
      categoria: "oportunidad",
      href: `/oportunidades/${o.id}`,
    })
  );

  const deProyectos = (proy ?? []).map((p) =>
    fila({
      id: p.id,
      nro: p.nro_proyecto,
      titulo: p.nombre,
      cliente: p.compania,
      buque: p.buque,
      valor: p.valor,
      moneda: p.moneda,
      cuando: p.fecha_inicio_estimada,
      zona_id: p.zona_id,
      categoria: p.estado === "finalizado" ? "terminado" : "en_curso",
      href: `/proyectos/${p.id}`,
    })
  );

  const todos = [...deOportunidades, ...deProyectos];

  const porId = new Map<string, Zona>(zonas.map((z) => [z.id, z]));
  const ubicable = (t: TrabajoEnElMapa) => {
    const z = porId.get(t.zona_id);
    return Boolean(z && z.lat !== null);
  };

  const enElMapa = todos.filter(ubicable);
  const sinZona = todos.filter((t) => !t.zona_id);
  const enZonaSinUbicar = todos.filter(
    (t) => t.zona_id !== "" && porId.has(t.zona_id) && porId.get(t.zona_id)!.lat === null
  );

  // Las zonas sin coordenadas que hoy tienen trabajo esperando.
  const zonasPendientes = zonas.filter(
    (z) => z.lat === null && enZonaSinUbicar.some((t) => t.zona_id === z.id)
  );

  const etiqueta = (c: CategoriaMapa) =>
    CATEGORIAS_MAPA.find((x) => x.id === c)?.label ?? c;

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo leer: {error.message}. Si dice que la columna{" "}
          <span className="text-mono">zona_id</span> no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0025_zonas.sql</span>.
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <span>
            Trabajos en el mapa ({enElMapa.length} de {todos.length})
          </span>
          <Link href="/zonas" className="btn btn-ghost btn-sm">
            Maestro de zonas
          </Link>
        </div>
        <MapaTrabajos zonas={zonas} trabajos={enElMapa} />
      </div>

      {(sinZona.length > 0 || enZonaSinUbicar.length > 0) && (
        <div className="card">
          <div className="card-title">
            <span>Fuera del mapa ({sinZona.length + enZonaSinUbicar.length})</span>
          </div>

          {zonasPendientes.length > 0 && (
            <div className="info-box warn mb16">
              {enZonaSinUbicar.length === 1 ? "Hay un trabajo" : `Hay ${enZonaSinUbicar.length} trabajos`}{" "}
              en{" "}
              {zonasPendientes.map((z, i) => (
                <span key={z.id}>
                  {i > 0 && ", "}
                  <Link href={`/zonas/${z.id}`}>
                    <strong>{z.nombre}</strong>
                  </Link>
                </span>
              ))}
              , que todavia no tiene coordenadas. En cuanto se las cargues
              aparecen solos.
            </div>
          )}

          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Que</th>
                  <th>Nro</th>
                  <th>De quien</th>
                  <th>Por que no se dibuja</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...sinZona, ...enZonaSinUbicar].map((t) => (
                  <tr key={`${t.categoria}-${t.id}`}>
                    <td className="text-muted">{etiqueta(t.categoria)}</td>
                    <td className="text-mono cel-nro">{t.nro ?? "-"}</td>
                    <td className="cel-compania">{t.titulo}</td>
                    <td className="text-muted">
                      {t.zona_id === ""
                        ? "Sin zona elegida"
                        : `${porId.get(t.zona_id)?.nombre ?? "zona"} no tiene coordenadas`}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={t.href} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="hint">
            Los trabajos sin zona se arreglan en su propia ficha, eligiendo el
            lugar. Los que estan en una zona sin ubicar se arreglan una sola vez
            en <Link href="/zonas">Zonas</Link>, y se acomodan todos juntos.
          </span>
        </div>
      )}
    </div>
  );
}
