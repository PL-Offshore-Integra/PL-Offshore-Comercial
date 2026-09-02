import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Oportunidad } from "@/lib/types";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" });

const ESTADIO_ORDEN: { estadio: string; color: string }[] = [
  { estadio: "Investigando", color: "b-gray" },
  { estadio: "Lead", color: "b-blue" },
  { estadio: "Contacto", color: "b-blue" },
  { estadio: "Pedido de Cotizacion", color: "b-amber" },
  { estadio: "Qualified", color: "b-teal" },
  { estadio: "Propuesta Enviada", color: "b-orange" },
  { estadio: "Ganado", color: "b-green" },
  { estadio: "Perdido", color: "b-red" },
  { estadio: "Cancelado", color: "b-gray" },
];

export default async function OportunidadesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("oportunidades")
    .select("*")
    .order("fecha_creacion", { ascending: false });

  const oportunidades = (data ?? []) as Oportunidad[];
  const grupos = ESTADIO_ORDEN.map(({ estadio, color }) => ({
    estadio,
    color,
    items: oportunidades.filter((o) => o.estadio === estadio),
  })).filter((g) => g.items.length > 0);

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

      {grupos.map((grupo) => (
        <div key={grupo.estadio} className="card">
          <div className="card-title">
            <span className={`badge ${grupo.color}`}>
              {grupo.estadio} ({grupo.items.length})
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Compania</th>
                  <th>Tarea</th>
                  <th>Buque</th>
                  <th>Contacto</th>
                  {/* Sin columna de ganancia: seria valor - costo, y el costo
                      no se pide, queda en 0. Repetia el valor al lado del
                      valor. */}
                  <th>Valor</th>
                  <th>Cierre esperado</th>
                  <th>Proximos pasos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((o) => (
                  <tr key={o.id} className="click">
                    <td className="text-mono">{o.nro_oportunidad ?? "-"}</td>
                    <td>{o.compania}</td>
                    {/* Nombre de proyecto salio del formulario: para las filas
                        nuevas lo que identifica el trabajo es en que consiste.
                        Las del tracker original siguen mostrando el suyo. */}
                    <td>
                      {o.descripcion_alcance ??
                        o.nombre_proyecto ??
                        o.alcance_oportunidad ??
                        "-"}
                    </td>
                    <td className="text-muted">{o.buque ?? "-"}</td>
                    <td className="text-muted">{o.contacto ?? o.contacto_email ?? "-"}</td>
                    <td className="text-mono">{currency.format(o.valor)}</td>
                    <td className="text-mono">{o.fecha_esperada_cierre ?? "-"}</td>
                    <td className="text-muted">{o.proximos_pasos ?? "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/oportunidades/${o.id}`} className="btn btn-ghost btn-sm">
                        Editar
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
