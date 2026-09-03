import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONTRATACIONES, type PlantillaListada } from "@/lib/types";

export default async function PlantillasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plantillas_listado")
    .select("*")
    .order("activa", { ascending: false })
    .order("nombre", { ascending: true });

  const plantillas = (data ?? []) as PlantillaListada[];

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudieron leer las plantillas: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0020_plantillas.sql</span>.
        </div>
      )}

      <div className="info-box accent mb16">
        Una plantilla es el punto de partida de un proyecto que se repite: el
        cliente habitual, el buque, el tipo de contratacion y las tarifas. Se
        elige al crear un proyecto y de ahi los numeros pasan a vivir en el
        proyecto. <strong>Cambiar una plantilla no toca los proyectos ya
        creados</strong>, que son acuerdos cerrados.
      </div>

      {!error && plantillas.length === 0 && (
        <div className="empty-state">
          Todavia no hay plantillas.{" "}
          <Link href="/plantillas/nueva">
            <strong>Crear una</strong>
          </Link>
          , o abrir un proyecto que ya este bien cargado y usar{" "}
          <strong>Guardar como plantilla</strong>, que copia su cliente, su
          buque y sus tarifas.
        </div>
      )}

      {plantillas.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Plantilla</th>
                  <th>Cliente habitual</th>
                  <th>Buque</th>
                  <th>Contratacion</th>
                  <th>Tarifas</th>
                  <th>Moneda</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plantillas.map((p) => {
                  const tipo = CONTRATACIONES.find(
                    (c) => c.id === p.estructura_tarifaria
                  );
                  return (
                    <tr key={p.id}>
                      <td className="cel-compania">
                        {p.nombre}
                        {p.descripcion && (
                          <div className="text-muted cel-sub">{p.descripcion}</div>
                        )}
                      </td>
                      <td>
                        {p.compania ?? <span className="text-muted">sin cliente fijo</span>}
                        {p.cliente_final && (
                          <div className="text-muted cel-sub">para {p.cliente_final}</div>
                        )}
                      </td>
                      <td className="text-muted">{p.buque ?? "—"}</td>
                      <td>{tipo?.label ?? p.estructura_tarifaria}</td>
                      <td className="text-mono">
                        {Number(p.tarifas) === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          Number(p.tarifas)
                        )}
                      </td>
                      <td className="text-mono">{p.moneda}</td>
                      <td>
                        <span className={`badge ${p.activa ? "b-green" : "b-gray"}`}>
                          {p.activa ? "Activa" : "Retirada"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="fila-acciones">
                          <Link
                            href={`/proyectos/nuevo?plantilla=${p.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Usar
                          </Link>
                          <Link href={`/plantillas/${p.id}`} className="btn btn-ghost btn-sm">
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
