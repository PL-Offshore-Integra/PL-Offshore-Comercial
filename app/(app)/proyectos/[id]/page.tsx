import Link from "next/link";
import { notFound } from "next/navigation";
import ProyectoForm, { PieDelProyecto } from "@/components/ProyectoForm";
import {
  actualizarProyecto,
  borrarAdjuntoProyecto,
  borrarProyecto,
  subirAdjuntoProyecto,
} from "@/app/(app)/proyectos/actions";
import { createClient } from "@/lib/supabase/server";
import type { Proyecto, ProyectoAdjunto, ProyectoTarifa } from "@/lib/types";

function pesoLegible(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("proyectos").select("*").eq("id", id).single();
  if (!data) notFound();
  const proyecto = data as Proyecto;

  const { data: filas } = await supabase
    .from("proyecto_tarifas")
    .select("*")
    .eq("proyecto_id", id)
    .order("orden", { ascending: true });
  const tarifas = (filas ?? []) as ProyectoTarifa[];

  const { data: docs } = await supabase
    .from("proyecto_adjuntos")
    .select("*")
    .eq("proyecto_id", id)
    .order("created_at", { ascending: false });
  const adjuntos = (docs ?? []) as ProyectoAdjunto[];

  // El bucket es privado: URL firmada de corta duracion, no link permanente.
  const firmadas = new Map<string, string>();
  if (adjuntos.length) {
    const { data: urls } = await supabase.storage
      .from("comercial")
      .createSignedUrls(adjuntos.map((a) => a.path), 60 * 30);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) firmadas.set(u.path, u.signedUrl);
    }
  }

  const contratos = adjuntos.filter((a) => a.clase === "contrato");
  const otros = adjuntos.filter((a) => a.clase !== "contrato");

  const guardar = actualizarProyecto.bind(null, proyecto.id);
  const eliminar = borrarProyecto.bind(null, proyecto.id);
  const subir = subirAdjuntoProyecto.bind(null, proyecto.id);

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">
          {proyecto.nro_proyecto ?? "sin nro"} &middot; {proyecto.nombre}
        </span>
        <form action={eliminar}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>

      <ProyectoForm action={guardar} proyecto={proyecto} tarifas={tarifas} />

      <div className="card">
        <div className="form-section">Contrato firmado</div>

        {contratos.length === 0 ? (
          <div className="empty-state mb16">Todavia no se cargo el contrato.</div>
        ) : (
          <div className="table-wrap mb16">
            <table>
              <tbody>
                {contratos.map((a) => {
                  const url = firmadas.get(a.path);
                  const quitar = borrarAdjuntoProyecto.bind(null, proyecto.id, a.id, a.path);
                  return (
                    <tr key={a.id}>
                      <td>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            {a.nombre}
                          </a>
                        ) : (
                          a.nombre
                        )}
                      </td>
                      <td className="text-mono">{pesoLegible(a.tamano_bytes)}</td>
                      <td style={{ textAlign: "right" }}>
                        <form action={quitar}>
                          <button type="submit" className="btn btn-danger btn-sm">
                            Borrar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form action={subir}>
          <input type="hidden" name="clase" value="contrato" />
          <div className="form-grid" style={{ alignItems: "end" }}>
            <div className="fg">
              <label>Subir contrato (hasta 25 MB)</label>
              <input type="file" name="archivo" required />
            </div>
            <div className="fg">
              <label>&nbsp;</label>
              <button type="submit" className="btn btn-ghost">
                Subir contrato
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="form-section">Otra documentacion</div>

        {otros.length === 0 ? (
          <div className="empty-state mb16">Sin otra documentacion.</div>
        ) : (
          <div className="table-wrap mb16">
            <table>
              <tbody>
                {otros.map((a) => {
                  const url = firmadas.get(a.path);
                  const quitar = borrarAdjuntoProyecto.bind(null, proyecto.id, a.id, a.path);
                  return (
                    <tr key={a.id}>
                      <td>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            {a.nombre}
                          </a>
                        ) : (
                          a.nombre
                        )}
                      </td>
                      <td className="text-mono">{pesoLegible(a.tamano_bytes)}</td>
                      <td style={{ textAlign: "right" }}>
                        <form action={quitar}>
                          <button type="submit" className="btn btn-danger btn-sm">
                            Borrar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form action={subir}>
          <div className="form-grid" style={{ alignItems: "end" }}>
            <div className="fg">
              <label>Adjuntar archivos (hasta 25 MB)</label>
              <input type="file" name="archivo" required />
            </div>
            <div className="fg">
              <label>&nbsp;</label>
              <button type="submit" className="btn btn-ghost">
                Subir
              </button>
            </div>
          </div>
        </form>
      </div>

      {proyecto.oportunidad_id && (
        <div className="info-box accent mb16">
          Este proyecto salio de una oportunidad.{" "}
          <Link href={`/oportunidades/${proyecto.oportunidad_id}`}>
            <strong>Ver la oportunidad</strong>
          </Link>{" "}
          — ahi esta lo que se cotizo, que no cambia cuando se corrige el
          proyecto.
        </div>
      )}

      {/* El pie al final de todo, igual que en oportunidades: Guardar apunta
          al formulario de arriba por id. */}
      <PieDelProyecto />
    </div>
  );
}
