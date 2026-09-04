import Link from "next/link";
import { notFound } from "next/navigation";
import ZonaForm from "@/components/ZonaForm";
import { actualizarZona, borrarZona } from "@/app/(app)/zonas/actions";
import { createClient } from "@/lib/supabase/server";
import { type Zona } from "@/lib/types";

export default async function ZonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("zonas").select("*").eq("id", id).single();
  if (!data) notFound();
  const zona = data as Zona;

  // Los trabajos que apuntan aca. Se muestran para que borrar la zona no sea
  // una sorpresa: el FK es `on delete set null`, asi que no se pierde ningun
  // trabajo, pero quedan sin lugar.
  const [{ data: opp }, { data: proy }] = await Promise.all([
    supabase
      .from("oportunidades")
      .select("id, nro_oportunidad, compania, estado")
      .eq("zona_id", id)
      .order("nro_oportunidad", { ascending: true }),
    supabase
      .from("proyectos")
      .select("id, nro_proyecto, nombre, estado")
      .eq("zona_id", id)
      .order("nro_proyecto", { ascending: true }),
  ]);

  const oportunidades = (opp ?? []) as {
    id: string;
    nro_oportunidad: string | null;
    compania: string;
    estado: string;
  }[];
  const proyectos = (proy ?? []) as {
    id: string;
    nro_proyecto: string | null;
    nombre: string;
    estado: string;
  }[];

  const guardar = actualizarZona.bind(null, zona.id);
  const eliminar = borrarZona.bind(null, zona.id);

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">{zona.nombre}</span>
        <form action={eliminar}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>

      <ZonaForm
        action={guardar}
        zona={zona}
        usos={{ oportunidades: oportunidades.length, proyectos: proyectos.length }}
      />

      {(oportunidades.length > 0 || proyectos.length > 0) && (
        <div className="card">
          <div className="form-section">Que hay en esta zona</div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Que</th>
                  <th>Nro</th>
                  <th>De quien</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {oportunidades.map((o) => (
                  <tr key={o.id}>
                    <td className="text-muted">Oportunidad</td>
                    <td className="text-mono cel-nro">{o.nro_oportunidad ?? "-"}</td>
                    <td>{o.compania}</td>
                    <td className="text-muted">{o.estado.replace(/_/g, " ")}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/oportunidades/${o.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
                {proyectos.map((p) => (
                  <tr key={p.id}>
                    <td className="text-muted">Proyecto</td>
                    <td className="text-mono cel-nro">{p.nro_proyecto ?? "-"}</td>
                    <td>{p.nombre}</td>
                    <td className="text-muted">{p.estado.replace(/_/g, " ")}</td>
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
          <span className="hint">
            Eliminar la zona no borra nada de esto: los trabajos quedan sin
            lugar y hay que volver a elegirselo. Para sacarla de circulacion sin
            perder la historia, destildá <strong>Activa</strong> arriba.
          </span>
        </div>
      )}
    </div>
  );
}
