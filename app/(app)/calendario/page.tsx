import { createClient } from "@/lib/supabase/server";
import type { Evento } from "@/lib/types";
import { createEvento } from "./actions";

function diasRestantes(fecha: string): string {
  const dias = Math.ceil(
    (new Date(fecha).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );
  if (dias < 0) return "ya paso";
  if (dias <= 30) return `${dias} dias`;
  if (dias <= 60) return "a menos de 60 dias";
  return "mas de 60 dias";
}

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("eventos").select("*").order("fecha");
  const eventos = (data ?? []) as Evento[];

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo cargar Supabase todavia: {error.message}.
        </div>
      )}

      <div className="card">
        <div className="card-title">Proximos eventos</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Lugar</th>
                <th>Cuanto falta</th>
                <th>Terra Mare</th>
                <th>Clean Sea</th>
                <th>Parana Logistica</th>
                <th>Referencias</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id}>
                  <td className="text-mono">{e.fecha}</td>
                  <td style={{ fontWeight: 600 }}>{e.evento}</td>
                  <td>{e.lugar ?? "-"}</td>
                  <td className="text-muted">{diasRestantes(e.fecha)}</td>
                  <td>{e.participa_terra_mare ? <span className="badge b-blue">Si</span> : "-"}</td>
                  <td>{e.participa_clean_sea ? <span className="badge b-green">Si</span> : "-"}</td>
                  <td>{e.participa_parana_logistica ? <span className="badge b-amber">Si</span> : "-"}</td>
                  <td>
                    {e.referencias ? (
                      <a href={e.referencias} target="_blank" rel="noreferrer" className="tag">
                        link
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-title">Nuevo evento</div>
        <form action={createEvento}>
          <div className="form-grid">
            <div className="fg">
              <label>Fecha</label>
              <input type="date" name="fecha" required />
            </div>
            <div className="fg">
              <label>Evento</label>
              <input name="evento" required />
            </div>
            <div className="fg">
              <label>Lugar</label>
              <input name="lugar" />
            </div>
            <div className="fg">
              <label>Referencias (URL)</label>
              <input name="referencias" />
            </div>
          </div>
          <div className="flex-gap mb16">
            <label className="flex-gap" style={{ fontSize: 14 }}>
              <input type="checkbox" name="participa_terra_mare" /> Terra Mare
            </label>
            <label className="flex-gap" style={{ fontSize: 14 }}>
              <input type="checkbox" name="participa_clean_sea" /> Clean Sea
            </label>
            <label className="flex-gap" style={{ fontSize: 14 }}>
              <input type="checkbox" name="participa_parana_logistica" /> Parana Logistica
            </label>
          </div>
          <button type="submit" className="btn btn-primary">
            Agregar evento
          </button>
        </form>
      </div>
    </div>
  );
}
