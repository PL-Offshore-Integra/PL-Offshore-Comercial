import Link from "next/link";
import { notFound } from "next/navigation";
import BuqueForm from "@/components/BuqueForm";
import { actualizarBuque, borrarBuque } from "@/app/(app)/buques/actions";
import { createClient } from "@/lib/supabase/server";
import { etiquetaTipoBuque, precioBuque, type Buque } from "@/lib/types";

export default async function BuquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("buques").select("*").eq("id", id).single();
  if (!data) notFound();
  const buque = data as Buque;

  // Los trabajos que nombran a este buque. Se buscan por texto porque el
  // buque de un trabajo todavia es texto libre: no hay FK contra este maestro
  // hasta que se enganchen los formularios. Mientras tanto esto muestra que
  // tan bien coincide lo que se escribio a mano con lo que dice el maestro.
  const [{ data: opp }, { data: proy }, { data: ops }] = await Promise.all([
    supabase
      .from("oportunidades")
      .select("id, nro_oportunidad, compania, estado")
      .ilike("buque", buque.nombre)
      .order("nro_oportunidad", { ascending: true }),
    supabase
      .from("proyectos")
      .select("id, nro_proyecto, nombre, estado")
      .ilike("buque", buque.nombre)
      .order("nro_proyecto", { ascending: true }),
    supabase
      .from("operaciones")
      .select("id, nro_operacion, nombre, proyecto_id, estado")
      .ilike("buque", buque.nombre)
      .order("nro_operacion", { ascending: true }),
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
  const salidas = (ops ?? []) as {
    id: string;
    nro_operacion: string | null;
    nombre: string;
    proyecto_id: string;
    estado: string;
  }[];

  const guardar = actualizarBuque.bind(null, buque.id);
  const eliminar = borrarBuque.bind(null, buque.id);

  const precio = precioBuque(buque);
  const titular = [
    etiquetaTipoBuque(buque.tipo),
    buque.bollard_pull_t !== null ? `${buque.bollard_pull_t} t de tiro` : null,
    buque.anio,
    precio ? `${precio} AIWI` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">{buque.nombre}</span>
        <form action={eliminar}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>

      {titular && <div className="info-box accent mb16">{titular}</div>}

      {buque.fuente && (
        <div className="hint mb16">
          Los datos de esta ficha salieron de{" "}
          <span className="text-mono">{buque.fuente}</span>, en{" "}
          <span className="text-mono">08. COMMERCIAL/Broker</span>.
        </div>
      )}

      <BuqueForm action={guardar} buque={buque} />

      {(oportunidades.length > 0 || proyectos.length > 0 || salidas.length > 0) && (
        <div className="card">
          <div className="form-section">Donde aparece este buque</div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Que</th>
                  <th>Nro</th>
                  <th>De que se trata</th>
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
                      <Link href={`/oportunidades/${o.id}`} className="btn btn-ghost btn-sm">
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
                {salidas.map((s) => (
                  <tr key={s.id}>
                    <td className="text-muted">Salida</td>
                    <td className="text-mono cel-nro">{s.nro_operacion ?? "-"}</td>
                    <td>{s.nombre}</td>
                    <td className="text-muted">{s.estado.replace(/_/g, " ")}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/proyectos/${s.proyecto_id}/operaciones/${s.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="hint">
            Esto se busca por el nombre escrito a mano en cada trabajo, no por
            una referencia a este maestro: el dia que se enganchen los
            formularios deja de depender de que el texto coincida. Eliminar el
            buque no toca ninguno de estos trabajos, justamente porque todavia
            no dependen de el; para sacarlo de circulacion sin perder la ficha,
            destildá <strong>Activo</strong> arriba.
          </span>
        </div>
      )}
    </div>
  );
}
