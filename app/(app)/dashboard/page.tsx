import { createClient } from "@/lib/supabase/server";
import type { Oportunidad } from "@/lib/types";

const currency = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);

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
  // Se agrupa por moneda ademas de por empresa y cliente: desde 0015 una
  // oportunidad puede estar en pesos, y sumar pesos con dolares daria un
  // numero que no significa nada. Un cliente con las dos monedas aparece en
  // dos filas.
  const porEmpresa = new Map<string, { clave: string; moneda: string; total: number }>();
  const porCliente = new Map<string, { clave: string; moneda: string; total: number }>();

  const acumular = (
    mapa: Map<string, { clave: string; moneda: string; total: number }>,
    clave: string,
    moneda: string,
    valor: number
  ) => {
    const k = `${clave}·${moneda}`;
    const actual = mapa.get(k) ?? { clave, moneda, total: 0 };
    actual.total += valor;
    mapa.set(k, actual);
  };

  for (const o of oportunidades) {
    acumular(porEmpresa, o.empresa, o.moneda, o.valor);
    acumular(porCliente, o.compania, o.moneda, o.valor);
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
                {[...porEmpresa.entries()].map(([k, fila]) => (
                  <tr key={k}>
                    <td>{fila.clave}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {currency(fila.moneda, fila.total)}
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
                {[...porCliente.entries()].map(([k, fila]) => (
                  <tr key={k}>
                    <td>{fila.clave}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {currency(fila.moneda, fila.total)}
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
