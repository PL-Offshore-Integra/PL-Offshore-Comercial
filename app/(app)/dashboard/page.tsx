import { createClient } from "@/lib/supabase/server";
import type { Oportunidad } from "@/lib/types";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" });

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("oportunidades").select("*");
  const oportunidades = (data ?? []) as Oportunidad[];

  const porEmpresa = new Map<string, number>();
  const porProyecto = new Map<string, number>();
  let total = 0;

  for (const o of oportunidades) {
    const ganancia = o.valor - o.costo;
    total += ganancia;
    porEmpresa.set(o.empresa, (porEmpresa.get(o.empresa) ?? 0) + ganancia);
    porProyecto.set(o.nombre_proyecto, (porProyecto.get(o.nombre_proyecto) ?? 0) + ganancia);
  }

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo cargar Supabase todavia: {error.message}.
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Ganancia total</div>
          <div className="stat-value">{currency.format(total)}</div>
        </div>
      </div>

      <div className="form-grid">
        <div className="card">
          <div className="card-title">Por empresa propia</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {[...porEmpresa.entries()].map(([empresa, ganancia]) => (
                  <tr key={empresa}>
                    <td>{empresa}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {currency.format(ganancia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Por proyecto</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {[...porProyecto.entries()].map(([proyecto, ganancia]) => (
                  <tr key={proyecto}>
                    <td>{proyecto}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {currency.format(ganancia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
