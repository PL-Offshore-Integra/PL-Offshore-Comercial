"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  empresaContacto,
  nombreContacto,
  type BrokerContacto,
} from "@/lib/types";

// Cuantas filas se dibujan de una. Con 431 contactos, pintar la tabla entera
// cada vez que se escribe una letra en el buscador se nota; el resto se
// muestra apretando el boton. El filtro y el contador siempre trabajan sobre
// el total, asi que el numero de arriba nunca miente.
const DE_ENTRADA = 120;

// El mailing list.
//
// Lo que se hace de verdad con una lista de mails es filtrarla y despues
// copiar las direcciones, asi que el boton de copiar es la funcion principal
// de esta pantalla y no un extra: separa con punto y coma, que es lo que
// espera Outlook.
export default function ListaContactos({ contactos }: { contactos: BrokerContacto[] }) {
  const [texto, setTexto] = useState("");
  const [pais, setPais] = useState("todos");
  const [empresa, setEmpresa] = useState("todas");
  const [sinEmpresa, setSinEmpresa] = useState(false);
  const [conInactivos, setConInactivos] = useState(false);
  const [todos, setTodos] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);

  const paises = useMemo(
    () =>
      [...new Set(contactos.map((c) => c.pais).filter((x): x is string => Boolean(x)))].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [contactos]
  );

  const empresas = useMemo(
    () =>
      [...new Set(contactos.map((c) => c.empresa).filter((x): x is string => Boolean(x)))].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [contactos]
  );

  const visibles = contactos.filter((c) => {
    if (!conInactivos && !c.activo) return false;
    if (pais !== "todos" && c.pais !== pais) return false;
    if (empresa !== "todas" && c.empresa !== empresa) return false;
    if (sinEmpresa && c.empresa !== null) return false;
    if (texto.trim() !== "") {
      const q = texto.trim().toLowerCase();
      const donde = [c.email, c.nombre, c.apellido, c.empresa, c.pais, c.dominio, c.notas]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!donde.includes(q)) return false;
    }
    return true;
  });

  const hayFiltro =
    texto.trim() !== "" ||
    pais !== "todos" ||
    empresa !== "todas" ||
    sinEmpresa ||
    conInactivos;

  const limpiar = () => {
    setTexto("");
    setPais("todos");
    setEmpresa("todas");
    setSinEmpresa(false);
    setConInactivos(false);
    setCopiado(null);
  };

  const copiar = async () => {
    const mails = visibles.map((c) => c.email).join("; ");
    try {
      await navigator.clipboard.writeText(mails);
      setCopiado(visibles.length);
    } catch {
      setCopiado(-1);
    }
  };

  const paisesVisibles = new Set(visibles.map((c) => c.pais).filter(Boolean)).size;
  const empresasVisibles = new Set(visibles.map((c) => c.empresa).filter(Boolean)).size;
  const aDibujar = todos ? visibles : visibles.slice(0, DE_ENTRADA);

  return (
    <div>
      <div className="filtros">
        <div className="fg-inline">
          <label>Buscar</label>
          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setCopiado(null);
            }}
            placeholder="Mail, nombre, empresa, dominio"
            className="filtro-ancho"
          />
        </div>
        <div className="fg-inline">
          <label>Pais</label>
          <select
            className="filter-select"
            value={pais}
            onChange={(e) => {
              setPais(e.target.value);
              setCopiado(null);
            }}
          >
            <option value="todos">Todos ({paises.length})</option>
            {paises.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Empresa</label>
          <select
            className="filter-select"
            value={empresa}
            onChange={(e) => {
              setEmpresa(e.target.value);
              setCopiado(null);
            }}
          >
            <option value="todas">Todas ({empresas.length})</option>
            {empresas.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="fg-inline">
          <label>Sin empresa</label>
          <label className="fila-check">
            <input
              type="checkbox"
              checked={sinEmpresa}
              onChange={(e) => {
                setSinEmpresa(e.target.checked);
                setCopiado(null);
              }}
            />
            <span>Solo esos</span>
          </label>
        </div>
        <div className="fg-inline">
          <label>Dados de baja</label>
          <label className="fila-check">
            <input
              type="checkbox"
              checked={conInactivos}
              onChange={(e) => {
                setConInactivos(e.target.checked);
                setCopiado(null);
              }}
            />
            <span>Incluirlos</span>
          </label>
        </div>

        {hayFiltro && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpiar}>
            Limpiar
          </button>
        )}

        <button
          type="button"
          className="btn btn-amarillo btn-sm filtro-a-la-derecha"
          onClick={copiar}
          disabled={visibles.length === 0}
        >
          {copiado === null
            ? `Copiar ${visibles.length} ${visibles.length === 1 ? "mail" : "mails"}`
            : copiado === -1
              ? "No se pudo copiar"
              : `${copiado} copiados`}
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Contactos</div>
          <div className="stat-value">{visibles.length}</div>
          <span className="hint">
            {hayFiltro ? `de ${contactos.length} en la lista` : "en la lista"}
          </span>
        </div>
        <div className="stat">
          <div className="stat-label">Paises</div>
          <div className="stat-value">{paisesVisibles}</div>
          <span className="hint">Con al menos un contacto</span>
        </div>
        <div className="stat">
          <div className="stat-label">Empresas</div>
          <div className="stat-value">{empresasVisibles}</div>
          <span className="hint">
            {visibles.filter((c) => c.empresa === null).length} contactos sin
            empresa cargada
          </span>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="empty-state">
          Ningun contacto cumple con eso.{" "}
          {hayFiltro && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={limpiar}>
              Limpiar los filtros
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-title">
            <span>Contactos ({visibles.length})</span>
            <span className="text-muted">
              Armadores, brokers y operadores a los que se les ofrece tonelaje.
            </span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Quien</th>
                  <th>Mail</th>
                  <th>Empresa</th>
                  <th>Pais</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {aDibujar.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {nombreContacto(c)}
                      {!c.activo && <div className="text-muted cel-sub">dado de baja</div>}
                    </td>
                    <td className="text-mono">{c.email}</td>
                    {/* Cuando la empresa no se pudo deducir se muestra el
                        dominio entre parentesis, en gris, para que no se
                        confunda con un dato cargado a mano. */}
                    <td className={c.empresa ? undefined : "text-muted"}>
                      {empresaContacto(c)}
                    </td>
                    <td className="text-muted">{c.pais ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/broker/contactos/${c.id}`}
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
          {!todos && visibles.length > DE_ENTRADA && (
            <div className="flex-between mt16">
              <span className="hint">
                Se dibujan los primeros {DE_ENTRADA}. El contador de arriba y el
                boton de copiar trabajan sobre los {visibles.length}.
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setTodos(true)}
              >
                Mostrar los {visibles.length}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
