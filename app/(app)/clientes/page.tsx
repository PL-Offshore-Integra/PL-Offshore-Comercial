import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/types";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fecha(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("compania", { ascending: true });

  const filas = (data ?? []) as Cliente[];

  // La vista devuelve una fila por contacto. Acá se agrupan por compañía,
  // que es como se busca un cliente: primero la empresa, después la persona.
  const porCompania = new Map<string, Cliente[]>();
  for (const f of filas) {
    const actual = porCompania.get(f.compania) ?? [];
    actual.push(f);
    porCompania.set(f.compania, actual);
  }
  const companias = [...porCompania.entries()];

  const totalContactos = filas.filter(
    (f) => f.contacto || f.contacto_email || f.contacto_telefono
  ).length;
  const sinDatos = filas.length - totalContactos;

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo leer la base de clientes: {error.message}. Si dice que la
          relación no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0003_oportunidades_pl.sql</span>.
        </div>
      )}

      <div className="info-box accent mb16">
        Esta pantalla no se carga a mano: sale de las oportunidades. La compañía,
        el nombre del contacto, el mail y el teléfono se toman de cada
        oportunidad que das de alta. Para corregir un dato, se corrige en la
        oportunidad.
      </div>

      {!error && filas.length === 0 && (
        <div className="empty-state">
          Todavía no hay clientes. Cargá una oportunidad y aparecen acá.
        </div>
      )}

      {filas.length > 0 && (
        <div className="stats mb16">
          <div className="stat">
            <div className="stat-label">Compañías</div>
            <div className="stat-value">{companias.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Contactos con datos</div>
            <div className="stat-value">{totalContactos}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Sin contacto cargado</div>
            <div className="stat-value">{sinDatos}</div>
          </div>
        </div>
      )}

      {companias.map(([compania, contactos]) => {
        const oportunidades = contactos.reduce((a, c) => a + Number(c.oportunidades), 0);
        const ganadas = contactos.reduce((a, c) => a + Number(c.ganadas), 0);
        const valor = contactos.reduce((a, c) => a + Number(c.valor_total ?? 0), 0);

        return (
          <div className="card" key={compania}>
            <div className="card-title">
              <span>{compania}</span>
              <span className="text-mono text-muted">
                {oportunidades} oport. · {ganadas} ganadas · {currency.format(valor)}
              </span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contacto</th>
                    <th>Mail</th>
                    <th>Teléfono</th>
                    <th>LinkedIn</th>
                    <th>Abiertas</th>
                    <th>Ganadas</th>
                    <th>Perdidas</th>
                    <th>Último contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {contactos.map((c, i) => (
                    <tr key={`${c.contacto ?? ""}-${c.contacto_email ?? ""}-${i}`}>
                      <td>{c.contacto ?? <span className="text-muted">sin nombre</span>}</td>
                      <td>
                        {c.contacto_email ? (
                          <a href={`mailto:${c.contacto_email}`}>{c.contacto_email}</a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {c.contacto_telefono ? (
                          <a href={`tel:${c.contacto_telefono}`}>{c.contacto_telefono}</a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {c.contacto_linkedin ? (
                          <a
                            href={
                              c.contacto_linkedin.startsWith("http")
                                ? c.contacto_linkedin
                                : `https://${c.contacto_linkedin}`
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            perfil
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-mono">{c.abiertas}</td>
                      <td className="text-mono">{c.ganadas}</td>
                      <td className="text-mono">{c.perdidas}</td>
                      <td className="text-mono">{fecha(c.ultimo_contacto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filas.length > 0 && (
        <div className="mt16">
          <Link href="/oportunidades" className="btn btn-ghost btn-sm">
            Ver las oportunidades
          </Link>
        </div>
      )}
    </div>
  );
}
