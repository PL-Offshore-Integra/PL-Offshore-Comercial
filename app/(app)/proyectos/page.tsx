import Link from "next/link";
import { fechaLegible } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_PROYECTO, type ProyectoConOperaciones } from "@/lib/types";

function plata(valor: number, moneda: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);
}


export default async function ProyectosPage() {
  const supabase = await createClient();
  // Se lee la vista y no la tabla: trae de una lo que dicen las operaciones de
  // cada proyecto —cuantas, cuando arranco la primera, cuando termino la
  // ultima y cuanto suma lo ejecutado— sin una consulta por fila.
  const { data, error } = await supabase
    .from("proyectos_con_operaciones")
    .select("*")
    .order("created_at", { ascending: false });

  const proyectos = (data ?? []) as ProyectoConOperaciones[];

  // Agrupados por estado, en el orden en que avanza un trabajo.
  const grupos = ESTADOS_PROYECTO.map((e) => ({
    ...e,
    items: proyectos.filter((p) => p.estado === e.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudieron leer los proyectos: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0018_operaciones.sql</span>.
        </div>
      )}

      {!error && proyectos.length === 0 && (
        <div className="empty-state">
          Todavia no hay proyectos. Un proyecto puede llegar por dos caminos:
          marcando una oportunidad como <strong>adjudicada</strong> en{" "}
          <Link href="/oportunidades">Oportunidades</Link>, o{" "}
          <Link href="/proyectos/nuevo">
            <strong>cargandolo desde cero</strong>
          </Link>{" "}
          cuando el trabajo no paso por una cotizacion.
        </div>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="card">
          <div className="card-title">
            <span className={`badge ${grupo.color}`}>
              {grupo.label} ({grupo.items.length})
            </span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Buque</th>
                  <th>Salidas</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Valor</th>
                  <th>IVA</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((p) => {
                  // Lo que paso le gana a lo que se estimaba: si hay
                  // operaciones cargadas, las fechas salen de la primera y de
                  // la ultima salida. Si no, de la estimacion, marcada como
                  // tal.
                  const inicio = p.arranco ?? p.fecha_inicio_estimada;
                  const fin = p.termino ?? p.fecha_fin_estimada;
                  const salidas = Number(p.operaciones ?? 0);
                  const ejecutado = Number(p.valor_ejecutado ?? 0);
                  return (
                    <tr key={p.id}>
                      <td className="text-mono cel-nro">{p.nro_proyecto ?? "-"}</td>
                      <td className="cel-compania">{p.nombre}</td>
                      {/* Los dos clientes en una celda: quien contrata arriba y
                          para quien es el trabajo debajo. Una columna aparte
                          sumaria ancho para un dato que casi siempre se lee
                          junto al otro. */}
                      <td>
                        {p.compania ?? "-"}
                        {p.cliente_final && (
                          <div className="text-muted cel-sub">para {p.cliente_final}</div>
                        )}
                      </td>
                      <td className="text-muted">{p.buque ?? "-"}</td>
                      <td className="text-mono">
                        {salidas === 0 ? <span className="text-muted">—</span> : salidas}
                      </td>
                      <td className="text-mono">
                        {fechaLegible(inicio)}
                        {!p.arranco && p.fecha_inicio_estimada && (
                          <span className="text-muted"> est.</span>
                        )}
                      </td>
                      <td className="text-mono">
                        {fechaLegible(fin)}
                        {!p.termino && p.fecha_fin_estimada && (
                          <span className="text-muted"> est.</span>
                        )}
                      </td>
                      {/* Arriba lo acordado, debajo lo que suman las salidas.
                          Son dos numeros distintos y los dos importan: uno es
                          el trato, el otro lo que se hizo. */}
                      <td className="text-mono cel-valor">
                        {plata(p.valor, p.moneda)}
                        {salidas > 0 && (
                          <div className="text-muted cel-sub">
                            {plata(ejecutado, p.moneda)} hecho
                          </div>
                        )}
                      </td>
                      <td className="text-mono">{p.iva === "21" ? "21%" : "Exento"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/proyectos/${p.id}`} className="btn btn-ghost btn-sm">
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
    </div>
  );
}
