import { notFound } from "next/navigation";
import OportunidadForm, { PieDelFormulario } from "@/components/OportunidadForm";
import { leerMaestroClientes } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";
import {
  borrarAdjunto,
  deleteOportunidad,
  subirAdjunto,
  updateOportunidad,
} from "@/app/(app)/oportunidades/actions";
import type { Adjunto, Oportunidad, Tarifa } from "@/lib/types";

function pesoLegible(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EditarOportunidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("oportunidades").select("*").eq("id", id).single();

  if (!data) notFound();

  const oportunidad = data as Oportunidad;

  const { data: filas } = await supabase
    .from("oportunidad_tarifas")
    .select("*")
    .eq("oportunidad_id", id)
    .order("orden", { ascending: true });
  const tarifas = (filas ?? []) as Tarifa[];

  const { data: docs } = await supabase
    .from("oportunidad_adjuntos")
    .select("*")
    .eq("oportunidad_id", id)
    .order("created_at", { ascending: false });
  const adjuntos = (docs ?? []) as Adjunto[];

  // El bucket es privado: cada archivo se sirve con una URL firmada de corta
  // duracion, no con un link permanente.
  const firmadas = new Map<string, string>();
  if (adjuntos.length) {
    const { data: urls } = await supabase.storage
      .from("comercial")
      .createSignedUrls(adjuntos.map((a) => a.path), 60 * 30);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) firmadas.set(u.path, u.signedUrl);
    }
  }

  const update = updateOportunidad.bind(null, oportunidad.id);
  const remove = deleteOportunidad.bind(null, oportunidad.id);
  const subir = subirAdjunto.bind(null, oportunidad.id);

  const { empresas, contactos } = await leerMaestroClientes();

  const cerrada = oportunidad.estadio === "Ganado" || oportunidad.estadio === "Perdido";

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">
          {oportunidad.nro_oportunidad ?? "sin nro"} &middot; {oportunidad.compania}
          {oportunidad.nombre_proyecto && <> &middot; {oportunidad.nombre_proyecto}</>}
        </span>
        <form action={remove}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>

      <OportunidadForm
        action={update}
        oportunidad={oportunidad}
        tarifas={tarifas}
        empresas={empresas}
        contactos={contactos}
      />

      <div className="card">
        <div className="form-section">Documentacion</div>

        {adjuntos.length === 0 ? (
          <div className="empty-state mb16">Sin documentacion adjunta.</div>
        ) : (
          <div className="table-wrap mb16">
            <table>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Peso</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {adjuntos.map((a) => {
                  const url = firmadas.get(a.path);
                  const quitar = borrarAdjunto.bind(null, oportunidad.id, a.id, a.path);
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
              <label>Adjuntar archivo (hasta 25 MB)</label>
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

      {/* El pie del formulario va al final de todo, debajo de la
          documentacion. Guardar apunta al formulario de arriba por id: no se
          pueden anidar formularios, y la tarjeta de documentacion tiene los
          suyos. */}
      <PieDelFormulario />

      {/* Cerrar y reabrir se hace desde los botones de la lista. Aca solo se
          muestra como quedo, y solo si esta cerrada. */}
      {cerrada && (
        <div className="card">
          <div className="form-section">Cierre</div>
          {oportunidad.estadio === "Ganado" ? (
            <div className="info-box accent">
              Ganada.{" "}
              {oportunidad.proyecto_id ? (
                <>
                  El proyecto existe en el maestro de Integra (
                  <span className="text-mono">{oportunidad.proyecto_id}</span>). Falta
                  que <strong>Finanzas le asigne el centro de costo y lo publique</strong>.
                </>
              ) : (
                <>
                  No se creo ningun proyecto en Integra: ganar solo marca la
                  oportunidad. El alta del proyecto la hace Finanzas.
                </>
              )}
            </div>
          ) : (
            <div className="info-box danger">
              Perdida. Motivo: <strong>{oportunidad.motivo_perdida}</strong>
              {oportunidad.competidor && <> &middot; Competidor: {oportunidad.competidor}</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
