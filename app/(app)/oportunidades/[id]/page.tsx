import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  camposDe,
  CONTRATACIONES,
  etiquetaEstado,
  type Adjunto,
  type Oportunidad,
  type Tarifa,
} from "@/lib/types";

// La oportunidad de solo lectura. Es lo que abre el boton Ver de la lista:
// mirar una oportunidad no tiene por que pasar por la pantalla de edicion,
// donde cualquier tecla suelta cambia un dato.

const plata = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);

function fecha(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fg">
      <label>{label}</label>
      <div className="dato">{children}</div>
    </div>
  );
}

export default async function VerOportunidadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("oportunidades").select("*").eq("id", id).single();
  if (!data) notFound();
  const o = data as Oportunidad;

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

  const firmadas = new Map<string, string>();
  if (adjuntos.length) {
    const { data: urls } = await supabase.storage
      .from("comercial")
      .createSignedUrls(adjuntos.map((a) => a.path), 60 * 30);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) firmadas.set(u.path, u.signedUrl);
    }
  }

  const { data: proy } = await supabase
    .from("proyectos")
    .select("id, nro_proyecto")
    .eq("oportunidad_id", id)
    .maybeSingle();
  const proyecto = proy as { id: string; nro_proyecto: string | null } | null;

  const etiqueta = etiquetaEstado(o.estado);
  const tipo = CONTRATACIONES.find((c) => c.id === o.estructura_tarifaria);
  // Los conceptos se muestran en el orden del tipo de contratacion, y despues
  // lo que haya quedado de otro tipo (por ejemplo si se cambio de Time a
  // Voyage y habia montos cargados).
  const orden = camposDe(o.estructura_tarifaria).map((c) => c.concepto);
  const conMonto = [...tarifas].sort(
    (a, b) => (orden.indexOf(a.concepto) + 99) % 99 - ((orden.indexOf(b.concepto) + 99) % 99)
  );

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">
          {o.nro_oportunidad ?? "sin nro"} &middot; {o.compania}
        </span>
        <span className={`badge ${etiqueta.color}`}>{etiqueta.label}</span>
      </div>

      <div className="card">
        <div className="form-section">La tarea</div>
        <div className="fg mb16">
          <label>Alcance de la tarea</label>
          <div className="dato dato-parrafo">{o.descripcion_alcance ?? "—"}</div>
        </div>
        <div className="form-grid">
          <Dato label="Buque">{o.buque ?? "—"}</Dato>
          <Dato label="Cliente final">{o.cliente_final ?? "—"}</Dato>
          <Dato label="Inicio estimado">{fecha(o.fecha_inicio_estimada)}</Dato>
          <Dato label="Duracion estimada">
            {o.duracion_estimada_dias ? `${o.duracion_estimada_dias} dias` : "—"}
          </Dato>
          <Dato label="Fin estimado">{fecha(o.fecha_fin_estimada)}</Dato>
        </div>

        <div className="form-section">Condiciones comerciales</div>
        <div className="form-grid">
          <Dato label="Tipo de contratacion">{tipo?.label ?? o.estructura_tarifaria}</Dato>
          <Dato label="Valor total">
            <strong>{plata(o.moneda, o.valor)}</strong>
          </Dato>
          {/* La comision no se suma al valor: es lo que se le paga al broker.
              Solo aparece cuando hay broker (0024). */}
          {o.estructura_tarifaria === "broker" && (
            <Dato label="Total de comision">{plata(o.moneda, o.comision_total)}</Dato>
          )}
          <Dato label="Delivery port">{o.delivery_port ?? "—"}</Dato>
          <Dato label="Re-delivery port">{o.redelivery_port ?? "—"}</Dato>
        </div>

        {conMonto.length > 0 && (
          <div className="table-wrap mb16">
            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Unidad</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {conMonto.map((t) => (
                  <tr key={t.id}>
                    <td>{etiquetaConcepto(t.concepto)}</td>
                    <td className="text-muted">{t.unidad === "dia" ? "por dia" : "global"}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {plata(o.moneda, Number(t.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-section">Contacto</div>
        <div className="form-grid">
          <Dato label="Compania">{o.compania}</Dato>
          <Dato label="Contacto">{o.contacto ?? "—"}</Dato>
          <Dato label="Mail">
            {o.contacto_email ? (
              <a href={`mailto:${o.contacto_email}`}>{o.contacto_email}</a>
            ) : (
              "—"
            )}
          </Dato>
          <Dato label="Telefono">
            {o.contacto_telefono ? (
              <a href={`tel:${o.contacto_telefono}`}>{o.contacto_telefono}</a>
            ) : (
              "—"
            )}
          </Dato>
        </div>

        <div className="form-section">Seguimiento</div>
        <div className="form-grid">
          <Dato label="Fecha de alta">{fecha(o.fecha_creacion)}</Dato>
          <Dato label="Cierre esperado de la venta">{fecha(o.fecha_esperada_cierre)}</Dato>
          <Dato label="Ultimo contacto">{fecha(o.last_interacted_on)}</Dato>
        </div>
        <div className="fg">
          <label>Comentarios</label>
          <div className="dato dato-parrafo">{o.comentarios ?? "—"}</div>
        </div>
      </div>

      <div className="card">
        <div className="form-section">Documentacion</div>
        {adjuntos.length === 0 ? (
          <div className="empty-state">Sin documentacion adjunta.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <tbody>
                {adjuntos.map((a) => {
                  const url = firmadas.get(a.path);
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {o.estado === "cancelado" && (
        <div className="info-box danger mb16">Cancelada. {o.comentarios}</div>
      )}

      {o.estado === "adjudicado" && (
        <div className="info-box accent mb16">
          {proyecto ? (
            <>
              Adjudicada y convertida en el proyecto{" "}
              <strong>{proyecto.nro_proyecto}</strong>.{" "}
              <Link href={`/proyectos/${proyecto.id}`}>
                <strong>Abrir el proyecto</strong>
              </Link>
            </>
          ) : (
            <>
              Adjudicada, pero todavia no se convirtio en proyecto.{" "}
              <Link href={`/proyectos/nuevo?oportunidad=${o.id}`}>
                <strong>Convertirla ahora</strong>
              </Link>
            </>
          )}
        </div>
      )}

      <div className="flex-between mt16">
        <Link href="/oportunidades" className="btn btn-ghost">
          Atras
        </Link>
        <Link href={`/oportunidades/${o.id}/editar`} className="btn btn-primary">
          Editar
        </Link>
      </div>
    </div>
  );
}

function etiquetaConcepto(concepto: string): string {
  for (const tipo of CONTRATACIONES) {
    const campo = tipo.campos.find((c) => c.concepto === concepto);
    if (campo) return campo.label;
  }
  if (concepto === "accommodation") return "Accommodation (por persona/dia)";
  return concepto;
}
