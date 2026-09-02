import { createClient } from "@/lib/supabase/server";
import type { Oportunidad } from "@/lib/types";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" });

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("oportunidades").select("*");
  const oportunidades = (data ?? []) as Oportunidad[];

  // Se agrupa por VALOR COTIZADO, no por ganancia. La ganancia es
  // valor - costo, y el costo salio del formulario: queda en 0, asi que
  // "ganancia" mostraba el precio disfrazado de resultado. Mientras el costo
  // no venga de algun lado —Finanzas es el candidato— el unico numero real
  // que tiene una oportunidad es lo que se cotizo.
  //
  // Nombre de proyecto dejo de pedirse en el formulario (0004), asi que
  // agrupar por ahi dejaria casi todo en una fila vacia. El corte pasa a ser
  // el cliente.
  const porEmpresa = new Map<string, number>();
  const porCliente = new Map<string, number>();

  for (const o of oportunidades) {
    porEmpresa.set(o.empresa, (porEmpresa.get(o.empresa) ?? 0) + o.valor);
    porCliente.set(o.compania, (porCliente.get(o.compania) ?? 0) + o.valor);
  }

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo cargar Supabase todavia: {error.message}.
        </div>
      )}

      <div className="form-grid">
        <div className="card">
          <div className="card-title">Cotizado por empresa propia</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {[...porEmpresa.entries()].map(([empresa, cotizado]) => (
                  <tr key={empresa}>
                    <td>{empresa}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {currency.format(cotizado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Cotizado por cliente</div>
          <div className="table-wrap">
            <table>
              <tbody>
                {[...porCliente.entries()].map(([cliente, cotizado]) => (
                  <tr key={cliente}>
                    <td>{cliente}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {currency.format(cotizado)}
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
