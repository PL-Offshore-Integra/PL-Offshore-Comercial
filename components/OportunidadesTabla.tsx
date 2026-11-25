"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import EstadoOportunidadControl from "@/components/CerrarOportunidad";
import GrupoPlegable from "@/components/GrupoPlegable";
import { cambiarEstadoOportunidad } from "@/app/(app)/oportunidades/actions";
import { fechaLegible } from "@/lib/fechas";
import { CONTRATACIONES, ESTADOS_OPORTUNIDAD, type Oportunidad } from "@/lib/types";

// La lista de oportunidades: la barra de filtros y la tabla agrupada por
// estado.
//
// POR QUE ES UN COMPONENTE DE CLIENTE
//
//   La pagina sigue siendo de servidor y hace la consulta; aca solo se filtra
//   y se agrupa. Son pocas filas —una por oportunidad— asi que se traen todas
//   de una vez y escribir en el buscador no vuelve al servidor por cada tecla.
//   Es el mismo criterio que ya usa ClientesTabla. Si algun dia esto crece a
//   miles, el corte pasa a la consulta.
//
// POR QUE EL FILTRO NO VA EN LA URL
//
//   Por lo mismo que en Clientes: lo que se filtra aca es para mirar ahora, no
//   para mandarle el link a otro. Si hiciera falta compartir una vista, el
//   estado pasa a searchParams y la pagina deja de traer todo.

// Cada fila se muestra en su moneda: una cotizada en pesos no se puede
// imprimir con el signo del dolar.
const plata = (moneda: string, valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda === "ARS" ? "ARS" : "USD",
  }).format(valor);

function recortar(texto: string | null, largo = 90) {
  if (!texto) return "—";
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > largo ? `${limpio.slice(0, largo)}…` : limpio;
}

// Las columnas de la tabla, para que el encabezado de cada grupo ocupe el
// ancho entero. Se cuenta aca y no a ojo para que no quede corto si manana se
// agrega una.
const COLUMNAS = 9;

export default function OportunidadesTabla({
  oportunidades,
}: {
  oportunidades: Oportunidad[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [compania, setCompania] = useState("");
  const [buque, setBuque] = useState("");
  const [contratacion, setContratacion] = useState("");

  // Las opciones salen de lo que hay cargado, no de un maestro: un buque o una
  // compania que no aparece en ninguna oportunidad daria un filtro que siempre
  // devuelve cero.
  const companias = useMemo(
    () =>
      [...new Set(oportunidades.map((o) => o.compania))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [oportunidades],
  );
  const buques = useMemo(
    () =>
      [
        ...new Set(
          oportunidades.map((o) => o.buque).filter((b): b is string => Boolean(b)),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [oportunidades],
  );

  const hayFiltros = Boolean(busqueda.trim() || compania || buque || contratacion);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return oportunidades.filter((o) => {
      if (compania && o.compania !== compania) return false;
      if (buque && o.buque !== buque) return false;
      if (contratacion && o.estructura_tarifaria !== contratacion) return false;

      if (texto) {
        // Se busca en todo lo que se ve en la fila, mas el nombre de proyecto
        // viejo del tracker: alguien que busca por el nombre con el que
        // conoce el trabajo tiene que encontrarlo aunque la columna muestre
        // el alcance.
        const donde = [
          o.nro_oportunidad,
          o.compania,
          o.descripcion_alcance,
          o.nombre_proyecto,
          o.alcance_oportunidad,
          o.buque,
          o.contacto,
          o.contacto_email,
          o.comentarios,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!donde.includes(texto)) return false;
      }

      return true;
    });
  }, [oportunidades, busqueda, compania, buque, contratacion]);

  // Agrupadas por estado, en el orden de ESTADOS_OPORTUNIDAD: en curso,
  // adjudicado, cancelado.
  //
  // POR QUE ESE ORDEN Y NO LA FECHA SOLA
  //
  //   Esta es la pantalla donde Comercial empieza el dia, y lo que se hace en
  //   ella es laburar las que estan abiertas. Ordenado solo por fecha de alta
  //   quedaban mezcladas —en curso, en curso, en curso, cancelada, en curso—,
  //   asi que para encontrar las cinco vivas habia que leer las once y mirar
  //   la columna de estado fila por fila. Adentro de cada grupo se mantiene el
  //   orden con el que llegan de la consulta: fecha de alta descendente.
  //
  //   El orden sale de ESTADOS_OPORTUNIDAD y no de una lista nueva: ya estaba
  //   escrito ahi y es el mismo que usan los badges, asi que no hay dos
  //   ordenes que puedan quedar distintos.
  const grupos = ESTADOS_OPORTUNIDAD.map((e) => ({
    ...e,
    items: visibles.filter((o) => o.estado === e.id),
  })).filter((g) => g.items.length > 0);

  // Un estado viejo o desconocido no se pierde: va al final, con su propio
  // encabezado. Con un solo listado aparecia igual; partiendo por estado, sin
  // esto, desapareceria de la pantalla.
  const conocidos = new Set<string>(ESTADOS_OPORTUNIDAD.map((e) => e.id));
  const otras = visibles.filter((o) => !conocidos.has(o.estado));

  const limpiar = () => {
    setBusqueda("");
    setCompania("");
    setBuque("");
    setContratacion("");
  };

  const fila = (o: Oportunidad) => (
    <tr key={o.id}>
      <td className="text-mono cel-nro">{o.nro_oportunidad ?? "-"}</td>
      <td className="cel-compania">{o.compania}</td>
      <td>
        <span className="cel-texto">
          {recortar(o.descripcion_alcance ?? o.nombre_proyecto, 60)}
        </span>
      </td>
      <td className="text-muted">{o.buque ?? "—"}</td>
      <td className="text-muted">{o.contacto ?? o.contacto_email ?? "—"}</td>
      <td className="text-mono cel-valor">{plata(o.moneda, o.valor)}</td>
      <td className="text-mono">{fechaLegible(o.last_interacted_on)}</td>
      <td className="text-muted">
        <span className="cel-texto">{recortar(o.comentarios)}</span>
      </td>
      <td>
        <div className="fila-acciones">
          <EstadoOportunidadControl
            estado={o.estado}
            etiqueta={`${o.nro_oportunidad ?? "esta oportunidad"} · ${o.compania}`}
            comentarios={o.comentarios}
            cambiarEstado={cambiarEstadoOportunidad.bind(null, o.id)}
          />
          {/* Ver abre la ficha de lectura; Editar, el formulario. Mirar una
              oportunidad no tiene por que pasar por la pantalla de edicion. */}
          <Link href={`/oportunidades/${o.id}`} className="btn btn-ghost btn-sm">
            Ver
          </Link>
          <Link href={`/oportunidades/${o.id}/editar`} className="btn btn-ghost btn-sm">
            Editar
          </Link>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="card">
      {/* La barra de filtros, con el mismo vocabulario que Clientes: la
          busqueda absorbe el espacio que sobra y los desplegables tienen
          ancho fijo para que entre en una sola linea. */}
      <div className="filter-row">
        <input
          className="filter-input filter-buscar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar nro, compania, tarea, buque, contacto o comentario"
        />

        <select
          className="filter-select"
          value={compania}
          onChange={(e) => setCompania(e.target.value)}
        >
          <option value="">Todas las companias</option>
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
            grupo que no interesa se pliega. Un desplegable que haga lo mismo
            que los encabezados seria una segunda forma de decir lo mismo. */}

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={limpiar}
          disabled={!hayFiltros}
        >
          Limpiar
        </button>
      </div>

      {/* El contador va afuera de la barra: adentro empuja a los controles a
          una segunda linea. Con un filtro puesto dice sobre cuantas. */}
      <div className="filter-cuenta text-mono">
        {visibles.length === oportunidades.length
          ? `${oportunidades.length} oportunidades`
          : `${visibles.length} de ${oportunidades.length} oportunidades`}
      </div>

      {visibles.length === 0 ? (
        <div className="empty-state">Ninguna oportunidad coincide con estos filtros.</div>
      ) : (
        <div className="table-wrap">
          <table className="tabla-lista">
            {/* Los encabezados de columna van una sola vez, arriba de los
                tres grupos: asi las columnas quedan alineadas entre grupos y
                una fila se puede comparar con otra. */}
            <thead>
              <tr>
                <th>Nro</th>
                <th>Compania</th>
                <th>Tarea</th>
                <th>Buque</th>
                <th>Contacto</th>
                <th>Valor</th>
                {/* Ultimo contacto en vez de cierre esperado: en el
                    seguimiento importa cuando se hablo por ultima vez, que
                    es lo que dice si hay que llamar. La fecha de cierre
                    esperada casi nunca se cargaba, asi que la columna
                    mostraba un guion. Sigue en la ficha. */}
                <th>Ultimo contacto</th>
                <th>Comentarios</th>
                {/* No hay columna de Estado: lo dice el encabezado del
                    grupo y lo vuelve a decir el desplegable de la ultima
                    columna, que ademas es con lo que se cambia. Puesta,
                    quedaba "en curso" al lado de un selector que decia
                    "En curso". */}
                <th />
              </tr>
            </thead>

            {grupos.map((g) =>
              // Las canceladas arrancan plegadas: son casi la mitad de la
              // lista y no son trabajo del dia. Las otras dos, abiertas.
              //
              // Con un filtro puesto arrancan abiertas, y la key cambia para
              // que React rehaga el componente: si no, una cancelada que
              // coincide con la busqueda quedaria escondida adentro de un
              // grupo cerrado y la pantalla pareceria no tener resultados.
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

            {otras.length > 0 && (
              <tbody>
                <tr className="grupo-fila">
                  <th colSpan={COLUMNAS}>
                    <span className="badge b-gray">Sin estado conocido ({otras.length})</span>
                  </th>
                </tr>
                {otras.map(fila)}
              </tbody>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
