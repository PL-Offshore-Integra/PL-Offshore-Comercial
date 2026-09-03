import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_PROYECTO, type Proyecto } from "@/lib/types";

function plata(valor: number, moneda: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);
}

function fecha(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .order("created_at", { ascending: false });

  const proyectos = (data ?? []) as Proyecto[];

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
          <span className="text-mono">supabase/migrations/0012_proyectos.sql</span>.
        </div>
      )}

      {!error && proyectos.length === 0 && (
        <div className="empty-state">
          Todavia no hay proyectos. Un proyecto nace de una oportunidad: marcala{" "}
          <strong>Ganado</strong> en{" "}
          <Link href="/oportunidades">Oportunidades</Link> y se abre la
          conversion.
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
            <table>
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Buque</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Valor</th>
                  <th>IVA</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((p) => (
                  <tr key={p.id}>
                    <td className="text-mono">{p.nro_proyecto ?? "-"}</td>
                    <td className="cel-compania">{p.nombre}</td>
                    <td>{p.compania ?? "-"}</td>
                    <td className="text-muted">{p.buque ?? "-"}</td>
                    {/* Se muestra la fecha real si existe, y si no la
                        estimada: lo que paso le gana a lo que se estimaba. */}
                    <td className="text-mono">
                      {fecha(p.fecha_inicio_real ?? p.fecha_inicio_estimada)}
                      {!p.fecha_inicio_real && p.fecha_inicio_estimada && (
                        <span className="text-muted"> est.</span>
                      )}
                    </td>
                    <td className="text-mono">
                      {fecha(p.fecha_fin_real ?? p.fecha_fin_estimada)}
                      {!p.fecha_fin_real && p.fecha_fin_estimada && (
                        <span className="text-muted"> est.</span>
                      )}
                    </td>
                    <td className="text-mono">{plata(p.valor, p.moneda)}</td>
                    <td className="text-mono">{p.iva === "21" ? "21%" : "Exento"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/proyectos/${p.id}`} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
