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
import { plantillaDesdeProyecto } from "@/app/(app)/plantillas/actions";
import { leerMaestroClientes } from "@/lib/clientes";
import { leerZonasPara } from "@/lib/zonas";
import { diasLegibles, fechaHoraLegible, fechaLegible, hoyEnArgentina } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";
import {
  diasDeOperacion,
  estadoDeFactura,
  ESTADOS_OPERACION,
  etiquetaFactura,
  netoDeFactura,
  type FacturaListada,
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

  // La zona si se elige siempre, venga de una oportunidad o no: el lugar puede
  // cambiar entre lo que se cotizo y lo que se firmo.
  const zonas = await leerZonasPara(proyecto.zona_id);

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

  // Las facturas del proyecto (0028). Un proyecto puede tener varias, y no
  // todas cuelgan de una salida.
  const { data: fact } = await supabase
    .from("facturas_listado")
    .select("*")
    .eq("proyecto_id", id)
    .order("fecha_emision", { ascending: false });
  const facturas = (fact ?? []) as FacturaListada[];

  const hoy = hoyEnArgentina();
  const facturado = facturas.reduce((a, f) => a + Number(f.importe ?? 0), 0);
  const cobrado = facturas
    .filter((f) => f.cobro_moneda !== null)
    .reduce((a, f) => a + netoDeFactura(f), 0);

  const guardar = actualizarProyecto.bind(null, proyecto.id);
  const eliminar = borrarProyecto.bind(null, proyecto.id);
  const subir = subirAdjuntoProyecto.bind(null, proyecto.id);
  const aPlantilla = plantillaDesdeProyecto.bind(null, proyecto.id);

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">
          {proyecto.nro_proyecto ?? "sin nro"} &middot; {proyecto.nombre}
        </span>
        <div className="fila-acciones">
          {/* El atajo: un proyecto bien cargado ya tiene todo lo que una
              plantilla necesita, asi que se copia en vez de tipearse. */}
          <form action={aPlantilla}>
            <BotonGuardar className="btn btn-ghost btn-sm" enviando="Guardando...">
              Guardar como plantilla
            </BotonGuardar>
          </form>
          <form action={eliminar}>
            <button type="submit" className="btn btn-danger btn-sm">
              Eliminar
            </button>
          </form>
        </div>
      </div>

      <ProyectoForm
        action={guardar}
        proyecto={proyecto}
        tarifas={tarifas}
        empresas={empresas}
        contactos={contactos}
        zonas={zonas}
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
                      <td className="text-mono">{dias === null ? "—" : diasLegibles(dias)}</td>
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

      {/* La facturacion del proyecto (0028). Un proyecto puede tener varias
          facturas, y no todas corresponden a una salida: un charter largo se
          factura por mes. */}
      <div className="card">
        <div className="card-title">
          <span>
            Facturacion ({facturas.length})
            {facturas.length > 0 && (
              <span className="text-muted">
                {" "}
                · {plata(facturado, proyecto.moneda)} facturado ·{" "}
                {plata(cobrado, proyecto.moneda)} cobrado
              </span>
            )}
          </span>
          <Link
            href={`/facturacion/nueva?proyecto=${proyecto.id}&volver=proyecto`}
            className="btn btn-amarillo btn-sm"
          >
            Nueva factura
          </Link>
        </div>

        {facturas.length === 0 ? (
          <div className="empty-state">
            Todavia no se facturo nada de este proyecto. Cada factura puede
            colgar de una salida —y ahi trae sus importes— o ser por periodo.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Salida</th>
                  <th>Emision</th>
                  <th>Vencimiento</th>
                  <th>Neto</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => {
                  const et = etiquetaFactura(estadoDeFactura(f, hoy));
                  return (
                    <tr key={f.id}>
                      <td className="text-mono cel-nro">
                        {f.nro_factura ?? <span className="text-muted">sin nro</span>}
                      </td>
                      <td className="text-muted">
                        {f.salida
                          ? [f.nro_operacion, f.salida].filter(Boolean).join(" · ")
                          : "por periodo"}
                      </td>
                      <td className="text-mono">{fechaLegible(f.fecha_emision)}</td>
                      <td className="text-mono">
                        {f.vencimiento ? (
                          fechaLegible(f.vencimiento)
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-mono cel-valor">
                        {plata(netoDeFactura(f), f.moneda)}
                      </td>
                      <td>
                        <span className={`badge ${et.color}`}>{et.label}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/facturacion/${f.id}`}
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
