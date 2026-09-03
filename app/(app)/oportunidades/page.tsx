import Link from "next/link";
import EstadoOportunidadControl from "@/components/CerrarOportunidad";
import {
  cambiarEstadoOportunidad,
  cerrarOportunidad,
  reabrirOportunidad,
} from "@/app/(app)/oportunidades/actions";
import { createClient } from "@/lib/supabase/server";
import { etiquetaEstado, type Oportunidad } from "@/lib/types";

// Cada fila se muestra en su moneda: una cotizada en pesos no se puede
// imprimir con el signo del dolar.
const plata = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);

// dd/mm/aaaa, que es como se leen las fechas aca.
function fecha(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

function recortar(texto: string | null, largo = 90) {
  if (!texto) return "—";
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > largo ? `${limpio.slice(0, largo)}…` : limpio;
}

export default async function OportunidadesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("oportunidades")
    .select("*")
    .order("fecha_creacion", { ascending: false });

  const oportunidades = (data ?? []) as Oportunidad[];

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo cargar Supabase todavia: {error.message}. Configura .env.local y corre las
          migraciones en supabase/migrations.
        </div>
      )}

      {!error && oportunidades.length === 0 && (
        <div className="empty-state">Todavia no hay oportunidades cargadas.</div>
      )}

      {/* Un solo listado continuo, ordenado por fecha de alta. Antes venia
          partido en una tarjeta por estadio, que con nueve estadios eran nueve
          tablas. */}
      {oportunidades.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Estado</th>
                  <th>Compania</th>
                  <th>Tarea</th>
                  <th>Buque</th>
                  <th>Contacto</th>
                  <th>Valor</th>
                  <th>Cierre esperado</th>
                  <th>Comentarios</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {oportunidades.map((o) => {
                  const etiqueta = etiquetaEstado(o.estado, o.resultado);
                  return (
                    <tr key={o.id}>
                      <td className="text-mono cel-nro">{o.nro_oportunidad ?? "-"}</td>
                      <td>
                        <span className={`badge ${etiqueta.color}`}>{etiqueta.label}</span>
                      </td>
                      <td className="cel-compania">{o.compania}</td>
                      <td>
                        <span className="cel-texto">
                          {recortar(o.descripcion_alcance ?? o.nombre_proyecto, 60)}
                        </span>
                      </td>
                      <td className="text-muted">{o.buque ?? "—"}</td>
                      <td className="text-muted">{o.contacto ?? o.contacto_email ?? "—"}</td>
                      <td className="text-mono cel-valor">{plata(o.moneda, o.valor)}</td>
                      <td className="text-mono">{fecha(o.fecha_esperada_cierre)}</td>
                      <td className="text-muted">
                        <span className="cel-texto">{recortar(o.comentarios)}</span>
                      </td>
                      <td>
                        <div className="fila-acciones">
                          <EstadoOportunidadControl
                            estado={o.estado}
                            resultado={o.resultado}
                            etiqueta={`${o.nro_oportunidad ?? "esta oportunidad"} · ${o.compania}`}
                            comentarios={o.comentarios}
                            cambiarEstado={cambiarEstadoOportunidad.bind(null, o.id)}
                            cerrar={cerrarOportunidad.bind(null, o.id)}
                            reabrir={reabrirOportunidad.bind(null, o.id)}
                          />
                          {/* Ver abre la ficha de lectura; Editar, el
                              formulario. Mirar una oportunidad no tiene por
                              que pasar por la pantalla de edicion. */}
                          <Link href={`/oportunidades/${o.id}`} className="btn btn-ghost btn-sm">
                            Ver
                          </Link>
                          <Link
                            href={`/oportunidades/${o.id}/editar`}
                            className="btn btn-ghost btn-sm"
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
