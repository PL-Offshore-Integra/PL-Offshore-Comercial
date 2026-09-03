import Link from "next/link";
import { notFound } from "next/navigation";
import ProyectoForm, { PieDelProyecto } from "@/components/ProyectoForm";
import {
  actualizarProyecto,
  borrarAdjuntoProyecto,
  borrarProyecto,
  subirAdjuntoProyecto,
} from "@/app/(app)/proyectos/actions";
import { BotonGuardar } from "@/components/BotonGuardar";
import { leerMaestroClientes } from "@/lib/clientes";
import { fechaHoraLegible } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  diasDeOperacion,
  ESTADOS_OPERACION,
  type Operacion,
  type Proyecto,
  type ProyectoAdjunto,
  type ProyectoTarifa,
} from "@/lib/types";

function pesoLegible(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function plata(valor: number, moneda: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);
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

  // Un proyecto sin oportunidad de origen elige su cliente aca, asi que
  // necesita el maestro. Uno que vino de una oportunidad lo hereda y lo
  // muestra de solo lectura: no hay nada que elegir.
  const { empresas, contactos } = proyecto.oportunidad_id
    ? { empresas: [], contactos: [] }
    : await leerMaestroClientes();

  // Las salidas del proyecto, de la mas reciente a la mas vieja.
  const { data: sal } = await supabase
    .from("operaciones")
    .select("*")
    .eq("proyecto_id", id)
    .order("fecha_inicio", { ascending: false, nullsFirst: false });
  const operaciones = (sal ?? []) as Operacion[];

  const ejecutado = operaciones
    .filter((o) => o.estado !== "cancelada")
    .reduce((a, o) => a + Number(o.valor ?? 0), 0);

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

      <ProyectoForm
        action={guardar}
        proyecto={proyecto}
        tarifas={tarifas}
        empresas={empresas}
        contactos={contactos}
      />

      {/* Las salidas. Es el tercer eje del modelo: el proyecto dice para quien
          se trabaja, la operacion cuando se salio y cuanto se cobra. */}
      <div className="card">
        <div className="card-title">
          <span>
            Salidas ({operaciones.length})
            {operaciones.length > 0 && (
              <span className="text-muted">
                {" "}
                · {plata(ejecutado, proyecto.moneda)} ejecutado
              </span>
            )}
          </span>
          <Link
            href={`/proyectos/${proyecto.id}/operaciones/nueva`}
            className="btn btn-amarillo btn-sm"
          >
            Nueva salida
          </Link>
        </div>

        {operaciones.length === 0 ? (
          <div className="empty-state">
            Todavia no hay salidas cargadas. Cada trabajo concreto —con sus
            fechas, su buque y su tarifa— es una salida de este proyecto.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Salida</th>
                  <th>Estado</th>
                  <th>Buque</th>
                  <th>Cliente final</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Dias</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {operaciones.map((o) => {
                  const etiqueta =
                    ESTADOS_OPERACION.find((e) => e.id === o.estado) ?? ESTADOS_OPERACION[0];
                  const dias = diasDeOperacion(o.fecha_inicio, o.fecha_fin);
                  return (
                    <tr key={o.id}>
                      <td className="text-mono cel-nro">{o.nro_operacion ?? "-"}</td>
                      <td className="cel-compania">{o.nombre}</td>
                      <td>
                        <span className={`badge ${etiqueta.color}`}>{etiqueta.label}</span>
                      </td>
                      <td className="text-muted">{o.buque ?? "—"}</td>
                      <td className="text-muted">{o.cliente_final ?? "—"}</td>
                      <td className="text-mono">{fechaHoraLegible(o.fecha_inicio)}</td>
                      <td className="text-mono">{fechaHoraLegible(o.fecha_fin)}</td>
                      <td className="text-mono">{dias === null ? "—" : dias.toFixed(2)}</td>
                      <td className="text-mono cel-valor">{plata(o.valor, o.moneda)}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/proyectos/${proyecto.id}/operaciones/${o.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              <BotonGuardar className="btn btn-ghost" enviando="Subiendo...">
                Subir contrato
              </BotonGuardar>
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
              <BotonGuardar className="btn btn-ghost" enviando="Subiendo...">
                Subir
              </BotonGuardar>
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
