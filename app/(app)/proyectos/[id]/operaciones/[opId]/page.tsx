import Link from "next/link";
import { notFound } from "next/navigation";
import OperacionForm, { PieDeLaOperacion } from "@/components/OperacionForm";
import {
  actualizarOperacion,
  borrarAdjuntoOperacion,
  borrarOperacion,
} from "@/app/(app)/operaciones/actions";
import SubirAdjuntos from "@/components/SubirAdjuntos";
import { pesoLegible } from "@/lib/adjuntos";
import { createClient } from "@/lib/supabase/server";
import { leerZonasPara } from "@/lib/zonas";
import type { Operacion, OperacionAdjunto, OperacionTarifa, Proyecto } from "@/lib/types";

// Los dos documentos que se arman por salida y se le mandan al cliente para
// que de el OK. Hoy los hace Maximo en Excel y los pasa a PDF; al menos van a
// tener donde vivir, junto a la salida que describen.
const CLASES: { id: "calculo" | "sof"; titulo: string; label: string }[] = [
  { id: "calculo", titulo: "Calculo de la tarifa", label: "Subir calculo" },
  { id: "sof", titulo: "Statement of facts", label: "Subir SOF" },
];

export default async function OperacionPage({
  params,
}: {
  params: Promise<{ id: string; opId: string }>;
}) {
  const { id, opId } = await params;
  const supabase = await createClient();

  const { data: proy } = await supabase.from("proyectos").select("*").eq("id", id).single();
  if (!proy) notFound();
  const proyecto = proy as Proyecto;

  const { data } = await supabase.from("operaciones").select("*").eq("id", opId).single();
  if (!data) notFound();
  const operacion = data as Operacion;

  // La operacion tiene que ser de este proyecto: si no, la URL esta armada a
  // mano y mostrarla mezclaria dos trabajos.
  if (operacion.proyecto_id !== proyecto.id) notFound();

  const { data: filas } = await supabase
    .from("operacion_tarifas")
    .select("*")
    .eq("operacion_id", opId)
    .order("orden", { ascending: true });
  const tarifas = (filas ?? []) as OperacionTarifa[];

  const { data: docs } = await supabase
    .from("operacion_adjuntos")
    .select("*")
    .eq("operacion_id", opId)
    .order("created_at", { ascending: false });
  const adjuntos = (docs ?? []) as OperacionAdjunto[];

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

  const guardar = actualizarOperacion.bind(null, operacion.id);
  const eliminar = borrarOperacion.bind(null, operacion.id);
  // El cupo de 20 MB es por salida: el calculo, el statement of facts y el
  // resto suman contra el mismo tope, asi que los tres cuadros reciben el
  // total de lo cargado.
  const pesaCargado = adjuntos.reduce((suma, a) => suma + (a.tamano_bytes ?? 0), 0);

  // Con la zona de esta salida incluida aunque se haya retirado del maestro.
  const zonas = await leerZonasPara(operacion.zona_id);

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">
          {operacion.nro_operacion ?? "sin nro"} &middot; {operacion.nombre}
        </span>
        <div className="fila-acciones">
          {/* El documento que se le manda al cliente para que de el OK: la
              planilla del calculo, con el diseño del modulo. */}
          <Link
            href={`/proyectos/${proyecto.id}/operaciones/${operacion.id}/calculo`}
            className="btn btn-amarillo btn-sm"
          >
            Calculo para el cliente
          </Link>
          <form action={eliminar}>
            <button type="submit" className="btn btn-danger btn-sm">
              Eliminar
            </button>
          </form>
        </div>
      </div>

      <OperacionForm
        action={guardar}
        proyecto={proyecto}
        operacion={operacion}
        tarifas={tarifas}
        zonas={zonas}
      />

      {CLASES.map((clase) => {
        const suyos = adjuntos.filter((a) => a.clase === clase.id);
        return (
          <div className="card" key={clase.id}>
            <div className="form-section">{clase.titulo}</div>

            {suyos.length === 0 ? (
              <div className="empty-state mb16">Todavia no se cargo.</div>
            ) : (
              <div className="table-wrap mb16">
                <table>
                  <tbody>
                    {suyos.map((a) => {
                      const url = firmadas.get(a.path);
                      const quitar = borrarAdjuntoOperacion.bind(null, a.id, a.path);
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

            <SubirAdjuntos
              entidad="operacion"
              id={operacion.id}
              clase={clase.id}
              usado={pesaCargado}
              etiqueta={clase.label}
            />
          </div>
        );
      })}

      <div className="card">
        <div className="form-section">Otra documentacion</div>
        {adjuntos.filter((a) => a.clase === "otro").length === 0 ? (
          <div className="empty-state mb16">Sin otra documentacion.</div>
        ) : (
          <div className="table-wrap mb16">
            <table>
              <tbody>
                {adjuntos
                  .filter((a) => a.clase === "otro")
                  .map((a) => {
                    const url = firmadas.get(a.path);
                    const quitar = borrarAdjuntoOperacion.bind(null, a.id, a.path);
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
        <SubirAdjuntos
          entidad="operacion"
          id={operacion.id}
          clase="otro"
          usado={pesaCargado}
        />
      </div>

      <div className="info-box accent mb16">
        Esta salida es del proyecto{" "}
        <Link href={`/proyectos/${proyecto.id}`}>
          <strong>
            {proyecto.nro_proyecto} · {proyecto.nombre}
          </strong>
        </Link>
        .
      </div>

      {/* El pie al final de todo, igual que en oportunidades y proyectos. */}
      <PieDeLaOperacion proyectoId={proyecto.id} />
    </div>
  );
}
