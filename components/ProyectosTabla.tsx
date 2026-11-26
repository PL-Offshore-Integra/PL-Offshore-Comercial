"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import GrupoPlegable from "@/components/GrupoPlegable";
import { fechaHoraSiLaTiene } from "@/lib/fechas";
import {
  CONTRATACIONES,
  ESTADOS_PROYECTO,
  type ProyectoConOperaciones,
} from "@/lib/types";

// La lista de proyectos: la barra de filtros y la tabla agrupada por estado.
//
// POR QUE ES UN COMPONENTE DE CLIENTE
//
//   Mismo criterio que OportunidadesTabla: la pagina sigue siendo de servidor
//   y hace las dos consultas —la vista de proyectos y las facturas—; aca solo
//   se filtra y se agrupa. Son pocas filas, asi que se traen todas de una vez
//   y escribir en el buscador no vuelve al servidor por cada tecla.

// Lo que se facturo y lo que se cobro de un proyecto, calculado en la pagina
// a partir de las facturas. No vive en la vista `proyectos_con_operaciones`:
// cobrado no es una suma de columnas, sale de `netoDeFactura` y de que la
// factura tenga moneda de cobro, que es la misma regla que usa la ficha. Un
// segundo lugar donde calcularlo seria un segundo lugar donde equivocarse.
export type PlataDeFacturas = { facturado: number; cobrado: number };

const plata = (valor: number, moneda: string) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);

// Nro, Proyecto, Cliente, Buque, Salidas, Inicio, Fin, Valor, Facturado y la
// columna de Abrir. Se cuenta aca y no a ojo para que el encabezado de cada
// grupo no quede corto si manana se agrega una.
const COLUMNAS = 10;

export default function ProyectosTabla({
  proyectos,
  facturas,
}: {
  proyectos: ProyectoConOperaciones[];
  // Por id de proyecto. Un proyecto sin facturas no esta en el mapa.
  facturas: Record<string, PlataDeFacturas>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [compania, setCompania] = useState("");
  const [buque, setBuque] = useState("");
  const [contratacion, setContratacion] = useState("");

  // Las opciones salen de lo que hay cargado y no de un maestro: un buque que
  // no aparece en ningun proyecto daria un filtro que siempre devuelve cero.
  const companias = useMemo(
    () =>
      [
        ...new Set(proyectos.map((p) => p.compania).filter((c): c is string => Boolean(c))),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [proyectos],
  );
  const buques = useMemo(
    () =>
      [
        ...new Set(proyectos.map((p) => p.buque).filter((b): b is string => Boolean(b))),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [proyectos],
  );

  const hayFiltros = Boolean(busqueda.trim() || compania || buque || contratacion);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return proyectos.filter((p) => {
      if (compania && p.compania !== compania) return false;
      if (buque && p.buque !== buque) return false;
      if (contratacion && p.estructura_tarifaria !== contratacion) return false;

      if (texto) {
        // Se busca en lo que se ve en la fila y ademas en el alcance y las
        // notas: alguien que busca "STS" o "flotel" tiene que encontrar el
        // proyecto aunque esas palabras no esten en el nombre.
        const donde = [
          p.nro_proyecto,
          p.nombre,
          p.compania,
          p.cliente_final,
          p.buque,
          p.contacto,
          p.descripcion,
          p.scope_es,
          p.scope_en,
          p.notas,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!donde.includes(texto)) return false;
      }

      return true;
    });
  }, [proyectos, busqueda, compania, buque, contratacion]);

  // Agrupados por estado, en el orden en que avanza un trabajo.
  const grupos = ESTADOS_PROYECTO.map((e) => ({
    ...e,
    items: visibles.filter((p) => p.estado === e.id),
  })).filter((g) => g.items.length > 0);

  // Un estado viejo o desconocido no se pierde: va al final, con su propio
  // encabezado.
  const conocidos = new Set<string>(ESTADOS_PROYECTO.map((e) => e.id));
  const otros = visibles.filter((p) => !conocidos.has(p.estado));

  const limpiar = () => {
    setBusqueda("");
    setCompania("");
    setBuque("");
    setContratacion("");
  };

  const fila = (p: ProyectoConOperaciones) => {
    // Lo que paso le gana a lo que se estimaba: si hay operaciones cargadas,
    // las fechas salen de la primera y de la ultima salida. Si no, de la
    // estimacion, marcada como tal.
    const inicio = p.arranco ?? p.fecha_inicio_estimada;
    const fin = p.termino ?? p.fecha_fin_estimada;
    const salidas = Number(p.operaciones ?? 0);
    const ejecutado = Number(p.valor_ejecutado ?? 0);
    const plataDe = facturas[p.id];

    return (
      <tr key={p.id}>
        <td className="text-mono cel-nro">{p.nro_proyecto ?? "-"}</td>
        <td className="cel-compania">{p.nombre}</td>
        {/* Los dos clientes en una celda: quien contrata arriba y para quien
            es el trabajo debajo. Una columna aparte sumaria ancho para un
            dato que casi siempre se lee junto al otro. */}
        <td>
          {p.compania ?? "-"}
          {p.cliente_final && (
            <div className="text-muted cel-sub">para {p.cliente_final}</div>
          )}
        </td>
        <td className="text-muted">{p.buque ?? "-"}</td>
        <td className="text-mono">
          {salidas === 0 ? <span className="text-muted">—</span> : salidas}
        </td>
        <td className="text-mono">
          {fechaHoraSiLaTiene(inicio)}
          {!p.arranco && p.fecha_inicio_estimada && (
            <span className="text-muted"> est.</span>
          )}
        </td>
        <td className="text-mono">
          {fechaHoraSiLaTiene(fin)}
          {!p.termino && p.fecha_fin_estimada && <span className="text-muted"> est.</span>}
        </td>
        {/* Arriba lo acordado, debajo lo que suman las salidas. Son dos
            numeros distintos y los dos importan: uno es el trato, el otro lo
            que se hizo. */}
        <td className="text-mono cel-valor">
          {plata(p.valor, p.moneda)}
          {salidas > 0 && (
            <div className="text-muted cel-sub">{plata(ejecutado, p.moneda)} hecho</div>
          )}
        </td>
        {/* Lo facturado y lo cobrado. Estaban solo en la ficha, y es lo que se
            pregunta todos los dias: cuanto de este trabajo ya se facturo y
            cuanta plata entro. Un proyecto sin facturas lo dice con todas las
            letras en vez de mostrar un cero, que se confunde con "se facturo
            cero". */}
        <td className="text-mono cel-valor">
          {plataDe ? (
            <>
              {plata(plataDe.facturado, p.moneda)}
              <div className="text-muted cel-sub">
                {plata(plataDe.cobrado, p.moneda)} cobrado
              </div>
            </>
          ) : (
            <span className="text-muted">sin facturar</span>
          )}
        </td>
        <td style={{ textAlign: "right" }}>
          <Link href={`/proyectos/${p.id}`} className="btn btn-ghost btn-sm">
            Abrir
          </Link>
        </td>
      </tr>
    );
  };

  return (
    <div className="card">
      <div className="filter-row">
        <input
          className="filter-input filter-buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar nro, proyecto, cliente, buque, alcance o nota"
        />

        <select
          className="filter-select"
          value={compania}
          onChange={(e) => setCompania(e.target.value)}
        >
          <option value="">Todos los clientes</option>
          {companias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={buque}
          onChange={(e) => setBuque(e.target.value)}
        >
          <option value="">Todos los buques</option>
          {buques.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={contratacion}
          onChange={(e) => setContratacion(e.target.value)}
        >
          <option value="">Toda contratacion</option>
          {CONTRATACIONES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {/* No hay filtro de estado: la tabla ya viene partida por estado y el
            grupo que no interesa se pliega. */}

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={limpiar}
          disabled={!hayFiltros}
        >
          Limpiar
        </button>
      </div>

      <div className="filter-cuenta text-mono">
        {visibles.length === proyectos.length
          ? `${proyectos.length} proyectos`
          : `${visibles.length} de ${proyectos.length} proyectos`}
      </div>

      {visibles.length === 0 ? (
        <div className="empty-state">Ningun proyecto coincide con estos filtros.</div>
      ) : (
        <div className="table-wrap">
          <table className="tabla-lista">
            {/* Los encabezados de columna van una sola vez, arriba de los
                grupos: asi las columnas quedan alineadas y una fila se puede
                comparar con otra. */}
            <thead>
              <tr>
                <th>Nro</th>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Buque</th>
                <th>Salidas</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Valor</th>
                <th>Facturado</th>
                {/* No hay columna de IVA: es una condicion de la factura, no
                    del proyecto, y se lee en la ficha y en Facturacion. En el
                    listado ocupaba ancho para repetir "Exento" fila tras
                    fila. */}
                <th />
              </tr>
            </thead>

            {grupos.map((g) =>
              // Los cancelados arrancan plegados: no son trabajo del dia. Con
              // un filtro puesto arrancan abiertos, y la key cambia para que
              // React rehaga el componente: si no, un cancelado que coincide
              // con la busqueda quedaria escondido adentro de un grupo cerrado
              // y la pantalla pareceria no tener resultados.
              g.id === "cancelado" ? (
                <GrupoPlegable
                  key={`${g.id}-${hayFiltros}`}
                  titulo={g.label}
                  color={g.color}
                  cuenta={g.items.length}
                  columnas={COLUMNAS}
                  abiertoAlPrincipio={hayFiltros}
                >
                  {g.items.map(fila)}
                </GrupoPlegable>
              ) : (
                <tbody key={g.id}>
                  <tr className="grupo-fila">
                    <th colSpan={COLUMNAS}>
                      <span className={`badge ${g.color}`}>
                        {g.label} ({g.items.length})
                      </span>
                    </th>
                  </tr>
                  {g.items.map(fila)}
                </tbody>
              ),
            )}

            {otros.length > 0 && (
              <tbody>
                <tr className="grupo-fila">
                  <th colSpan={COLUMNAS}>
                    <span className="badge b-gray">
                      Sin estado conocido ({otros.length})
                    </span>
                  </th>
                </tr>
                {otros.map(fila)}
              </tbody>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
