import { notFound } from "next/navigation";
import OportunidadForm, { TarifasEditor } from "@/components/OportunidadForm";
import { createClient } from "@/lib/supabase/server";
import {
  borrarAdjunto,
  deleteOportunidad,
  ganarOportunidad,
  guardarTarifas,
  perderOportunidad,
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
  const tarifar = guardarTarifas.bind(null, oportunidad.id);
  const ganar = ganarOportunidad.bind(null, oportunidad.id);
  const perder = perderOportunidad.bind(null, oportunidad.id);
  const subir = subirAdjunto.bind(null, oportunidad.id);

  const cerrada = oportunidad.estadio === "Ganado" || oportunidad.estadio === "Perdido";

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">
          {oportunidad.compania} &middot; {oportunidad.nombre_proyecto}
        </span>
        <form action={remove}>
          <button type="submit" className="btn btn-danger btn-sm">
            Eliminar
          </button>
        </form>
      </div>

      <OportunidadForm action={update} oportunidad={oportunidad} />

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

      <TarifasEditor
        action={tarifar}
        tarifas={tarifas}
        estructura={oportunidad.estructura_tarifaria ?? "diaria"}
      />

      {cerrada ? (
        <div className="card">
          <div className="form-section">Cierre</div>
          {oportunidad.estadio === "Ganado" ? (
            <div className="info-box accent">
              Ganada. El proyecto ya existe en el maestro de Integra
              {oportunidad.proyecto_id && (
                <>
                  {" "}
                  (<span className="text-mono">{oportunidad.proyecto_id}</span>)
                </>
              )}
              . Falta que <strong>Finanzas le asigne el centro de costo y lo
              publique</strong>: hasta entonces no aparece en Compras, Viveres ni
              Reparaciones.
            </div>
          ) : (
            <div className="info-box danger">
              Perdida. Motivo: <strong>{oportunidad.motivo_perdida}</strong>
              {oportunidad.competidor && <> &middot; Competidor: {oportunidad.competidor}</>}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="form-section">Cerrar la oportunidad</div>

          <form action={ganar} className="mb16">
            <div className="info-box accent mb16">
              Ganar <strong>crea el proyecto</strong> en el maestro de Integra, sin
              centro de costo y sin publicar. El presupuesto lo carga Finanzas: el
              valor cotizado es precio, no costo.
            </div>
            <div className="form-grid">
              <div className="fg">
                <label>Codigo del proyecto</label>
                <input name="proyecto_codigo" placeholder="PRY-2027-004" />
              </div>
              <div className="fg">
                <label>Nombre del proyecto</label>
                <input
                  name="proyecto_nombre"
                  defaultValue={oportunidad.nombre_proyecto}
                  required
                />
              </div>
              <div className="fg">
                <label>&nbsp;</label>
                <button type="submit" className="btn btn-primary">
                  Crear proyecto y marcar Ganado
                </button>
              </div>
            </div>
          </form>

          <form action={perder}>
            <div className="info-box warn mb16">
              El motivo es obligatorio. Es el unico dato que hoy no queda registrado
              en ningun lado cuando una cotizacion se cae.
            </div>
            <div className="form-grid">
              <div className="fg">
                <label>Motivo de la perdida</label>
                <input
                  name="motivo_perdida"
                  placeholder="Precio, disponibilidad de buque, plazo..."
                  required
                />
              </div>
              <div className="fg">
                <label>Competidor</label>
                <input name="competidor" placeholder="Opcional" />
              </div>
              <div className="fg">
                <label>&nbsp;</label>
                <button type="submit" className="btn btn-danger">
                  Marcar Perdido
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
