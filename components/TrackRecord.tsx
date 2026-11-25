"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  alcanceEnIdioma,
  periodoEnIdioma,
  regionEnIdioma,
  SECCIONES_TR,
  TEXTOS,
  valorEnIdioma,
  type FilaMostrable,
  type Idioma,
  type SeccionTR,
} from "@/lib/trackRecord";

// El track record en pantalla: filtros arriba, una tabla por seccion.
//
// Se filtra del lado del cliente porque son cien filas y ninguna cambia
// mientras se mira. El boton de imprimir usa el dialogo del navegador con una
// hoja de estilos de impresion: es la forma de "sacarlo" en PDF sin sumar una
// libreria ni mandar los datos a ningun lado.

const plata = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valor);

export default function TrackRecord({ filas }: { filas: FilaMostrable[] }) {
  // El idioma del documento. Se traduce lo que se imprime; los filtros y los
  // botones quedan en castellano, que son la herramienta y no el documento.
  const [idioma, setIdioma] = useState<Idioma>("es");
  const T = TEXTOS[idioma];

  // QUE VA EN EL DOCUMENTO
  //
  //   Los cuatro recortes son CONJUNTOS, no un valor: un track record se arma
  //   eligiendo varios —"el Atlantic Dama y el Golondrina, para YPF y Shell,
  //   2024 y 2025"— y con un desplegable de a uno habia que imprimir cuatro
  //   veces. Un conjunto vacio quiere decir "todo", que es lo que corresponde
  //   cuando nadie eligio nada.
  //
  //   El mismo estado manda en la pantalla y en el papel. Antes tambien era
  //   asi, pero por omision: imprimir sacaba lo que estuviera filtrado y no
  //   habia donde decidirlo. Ahora el cuadro de impresion es ese lugar, y lo
  //   que muestra la pantalla sigue siendo exactamente lo que va a salir.
  const [secciones, setSecciones] = useState<Set<string>>(new Set());
  const [buquesSel, setBuquesSel] = useState<Set<string>>(new Set());
  const [clientesSel, setClientesSel] = useState<Set<string>>(new Set());
  const [aniosSel, setAniosSel] = useState<Set<string>>(new Set());

  // El cuadro que pregunta que va en el documento, antes de imprimir.
  const [preguntando, setPreguntando] = useState(false);

  const buques = useMemo(
    () =>
      [...new Set(filas.map((f) => f.buque).filter((b): b is string => Boolean(b)))].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [filas]
  );

  const clientes = useMemo(
    () =>
      [
        ...new Set(filas.map((f) => f.cliente).filter((c): c is string => Boolean(c))),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [filas]
  );

  const anios = useMemo(() => {
    const todos = new Set<number>();
    for (const f of filas) {
      const a = f.anio_desde ?? f.anio_hasta;
      const b = f.anio_hasta ?? f.anio_desde;
      if (a === null || b === null) continue;
      for (let x = Math.min(a, b); x <= Math.max(a, b); x++) todos.add(x);
    }
    return [...todos].sort((a, b) => b - a);
  }, [filas]);

  // Un conjunto vacio es "todo": asi, sin elegir nada, entra el track record
  // entero, que es el estado en el que se abre la pantalla.
  const entra = (conjunto: Set<string>, valor: string | null) =>
    conjunto.size === 0 || (valor !== null && conjunto.has(valor));

  const visibles = filas.filter((f) => {
    if (!entra(secciones, f.seccion)) return false;
    if (!entra(buquesSel, f.buque)) return false;
    if (!entra(clientesSel, f.cliente)) return false;
    if (aniosSel.size > 0) {
      const a = f.anio_desde ?? f.anio_hasta;
      const b = f.anio_hasta ?? f.anio_desde;
      if (a === null || b === null) return false;
      // Un trabajo de 2020-2024 entra si se eligio cualquier anio de ese
      // tramo: el que lo lee quiere ver el trabajo, no el renglon del anio.
      let toca = false;
      for (let x = Math.min(a, b); x <= Math.max(a, b); x++) {
        if (aniosSel.has(String(x))) {
          toca = true;
          break;
        }
      }
      if (!toca) return false;
    }
    return true;
  });

  const valorDeclarado = visibles.reduce((a, f) => a + (f.valor_usd ?? 0), 0);
  const conValor = visibles.filter((f) => f.valor_usd !== null).length;
  const hayFiltro =
    secciones.size > 0 || buquesSel.size > 0 || clientesSel.size > 0 || aniosSel.size > 0;

  // Los titulares cuentan SOBRE LO QUE VA A SALIR, no sobre la base entera.
  //
  // Antes los trabajos y el valor miraban lo elegido pero los buques, los
  // clientes y el periodo miraban todo, asi que un documento de un solo buque
  // encabezaba con "22 trabajos · 8 buques · 48 clientes" y un periodo
  // 2017-2026. Eso es lo que se le mandaba al cliente.
  const buquesEnDoc = new Set(visibles.map((f) => f.buque).filter(Boolean)).size;
  const clientesEnDoc = new Set(visibles.map((f) => f.cliente).filter(Boolean)).size;
  const aniosEnDoc = (() => {
    const todos: number[] = [];
    for (const f of visibles) {
      if (f.anio_desde !== null) todos.push(f.anio_desde);
      if (f.anio_hasta !== null) todos.push(f.anio_hasta);
    }
    return todos.length ? { desde: Math.min(...todos), hasta: Math.max(...todos) } : null;
  })();

  const grupos = SECCIONES_TR.map((s) => ({
    ...s,
    items: visibles.filter((f) => f.seccion === s.id),
  })).filter((g) => g.items.length > 0);

  const limpiar = () => {
    setSecciones(new Set());
    setBuquesSel(new Set());
    setClientesSel(new Set());
    setAniosSel(new Set());
  };

  return (
    <div>
      <div className="filtros no-imprimir">
        {/* Los desplegables siguen siendo para MIRAR: de a uno, rapidos. Si
            el cuadro de impresion dejo varios elegidos, el desplegable lo
            dice con "Varios" en vez de mentir mostrando uno solo. */}
        <Recorte
          etiqueta="Linea"
          opciones={SECCIONES_TR.map((x) => ({ valor: x.id, texto: x.label }))}
          elegidos={secciones}
          cambiar={setSecciones}
          todas="Todas"
        />
        <Recorte
          etiqueta="Buque"
          opciones={buques.map((b) => ({ valor: b, texto: b }))}
          elegidos={buquesSel}
          cambiar={setBuquesSel}
          todas="Todos"
        />
        <Recorte
          etiqueta="Cliente"
          opciones={clientes.map((c) => ({ valor: c, texto: c }))}
          elegidos={clientesSel}
          cambiar={setClientesSel}
          todas="Todos"
        />
        <Recorte
          etiqueta="Año"
          opciones={anios.map((a) => ({ valor: String(a), texto: String(a) }))}
          elegidos={aniosSel}
          cambiar={setAniosSel}
          todas="Todos"
        />

        {hayFiltro && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpiar}>
            Limpiar
          </button>
        )}

        {/* Imprimir ya no imprime: pregunta primero. Antes sacaba lo que
            estuviera en pantalla, asi que un filtro puesto para mirar otra
            cosa se iba al PDF sin que nadie lo decidiera. */}
        <button
          type="button"
          className="btn btn-amarillo btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={() => setPreguntando(true)}
        >
          Imprimir / PDF
        </button>
      </div>

      {preguntando && (
        <CuadroDeImpresion
          cerrar={() => setPreguntando(false)}
          imprimir={() => {
            setPreguntando(false);
            // El cuadro tiene que estar cerrado cuando se abre el dialogo del
            // navegador: si no, sale en la primera hoja.
            setTimeout(() => window.print(), 50);
          }}
          cuantos={visibles.length}
          deCuantos={filas.length}
          idioma={idioma}
          setIdioma={setIdioma}
          limpiar={limpiar}
          bloques={[
            {
              titulo: "Linea",
              opciones: SECCIONES_TR.map((x) => ({ valor: x.id, texto: x.label })),
              elegidos: secciones,
              cambiar: setSecciones,
            },
            {
              titulo: "Buque",
              opciones: buques.map((b) => ({ valor: b, texto: b })),
              elegidos: buquesSel,
              cambiar: setBuquesSel,
            },
            {
              titulo: "Cliente",
              opciones: clientes.map((c) => ({ valor: c, texto: c })),
              elegidos: clientesSel,
              cambiar: setClientesSel,
            },
            {
              titulo: "Año",
              opciones: anios.map((a) => ({ valor: String(a), texto: String(a) })),
              elegidos: aniosSel,
              cambiar: setAniosSel,
            },
          ]}
        />
      )}

      {/* Si el documento es un recorte, el papel lo dice. Un track record de
          tres buques no puede parecer todo lo que hizo PL Offshore: el que lo
          recibe tiene que poder ver que esta mirando una seleccion. En
          pantalla no hace falta —los controles estan a la vista— asi que esto
          solo sale impreso. */}
      {hayFiltro && <div className="solo-imprimir recorte-aviso">{T.recorte}</div>}

      {/* Los titulares si se imprimen: un track record se lee mejor si arranca
          diciendo cuantos trabajos, en que años y por cuanto. */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">{T.trabajos}</div>
          <div className="stat-value">{visibles.length}</div>
          <span className="hint">
            {buquesEnDoc} {T.buques} · {clientesEnDoc} {T.clientes}
          </span>
        </div>
        <div className="stat">
          <div className="stat-label">{T.periodo}</div>
          <div className="stat-value">
            {aniosEnDoc
              ? aniosEnDoc.desde === aniosEnDoc.hasta
                ? aniosEnDoc.desde
                : `${aniosEnDoc.desde}–${aniosEnDoc.hasta}`
              : "—"}
          </div>
          <span className="hint">{hayFiltro ? T.deLoElegido : T.completo}</span>
        </div>
        <div className="stat">
          <div className="stat-label">{T.valorDeclarado}</div>
          <div className="stat-value">{plata(valorDeclarado)}</div>
          <span className="hint">
            {conValor} {T.de} {visibles.length} {T.conValor}
          </span>
        </div>
      </div>

      {visibles.length === 0 && (
        <div className="empty-state">{T.vacio}</div>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="card">
          <div className="card-title">
            <span>
              {grupo.label} ({grupo.items.length})
            </span>
            <span className="text-muted">{grupo.sub[idioma]}</span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>{T.vessel}</th>
                  <th>{T.type}</th>
                  {grupo.id !== "chartering" && <th>{T.owner}</th>}
                  <th>{T.client}</th>
                  <th>{T.region}</th>
                  <th>{T.period}</th>
                  <th>{T.scope}</th>
                  <th>{T.years}</th>
                  <th>{T.value}</th>
                </tr>
              </thead>
              <tbody>
                {grupo.items.map((f) => {
                  const alcance = alcanceEnIdioma(f, idioma);
                  return (
                    <tr key={f.id}>
                      <td className="cel-compania">
                        {f.href ? (
                          <Link href={f.href}>{f.buque ?? "—"}</Link>
                        ) : (
                          (f.buque ?? "—")
                        )}
                        {f.origen === "proyecto" && (
                          <div className="text-muted cel-sub no-imprimir">
                            {T.delModulo}
                          </div>
                        )}
                      </td>
                      <td className="text-muted">{f.tipo_de_buque ?? "—"}</td>
                      {grupo.id !== "chartering" && (
                        <td className="text-muted">{f.armador ?? "—"}</td>
                      )}
                      <td>{f.cliente ?? "—"}</td>
                      <td className="text-muted">
                        {regionEnIdioma(f.region, idioma) ?? "—"}
                      </td>
                      <td className="text-mono">
                        {periodoEnIdioma(f.periodo, idioma) ?? "—"}
                      </td>
                      <td>
                        <span className="cel-texto">{alcance.texto ?? "—"}</span>
                        {/* Cuando el alcance no esta en el idioma pedido se
                            muestra el del otro, y se avisa. En el PDF no: ahi
                            lo unico que corresponde es el texto. */}
                        {alcance.texto && !alcance.traducido && (
                          <div className="text-muted cel-sub no-imprimir">
                            {T.sinTraducir}
                          </div>
                        )}
                      </td>
                      <td className="text-mono">
                        {f.anio_desde === null
                          ? "—"
                          : f.anio_hasta && f.anio_hasta !== f.anio_desde
                            ? `${f.anio_desde}–${f.anio_hasta}`
                            : f.anio_desde}
                      </td>
                      <td className="text-mono cel-valor">
                        {valorEnIdioma(f.valor_usd, f.valor_texto, idioma) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <span className="hint no-imprimir">
        Las filas historicas vienen del track record en Excel. Los proyectos que
        se terminan en el modulo aparecen solos, con el valor redondeado como lo
        escribe el documento; los marcados <strong>{T.delModulo}</strong> son
        esos. El idioma de arriba cambia lo que sale impreso: los encabezados,
        el alcance, el periodo y el valor.
      </span>
    </div>
  );
}

// Un recorte en la barra de arriba: el desplegable rapido, de a uno.
//
// Si el cuadro de impresion dejo varios elegidos no se puede mostrar uno
// solo sin mentir, asi que aparece "Varios (n)". Elegir cualquier opcion
// vuelve a dejar uno; "Todos" vacia el conjunto.
function Recorte({
  etiqueta,
  opciones,
  elegidos,
  cambiar,
  todas,
}: {
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
  elegidos: Set<string>;
  cambiar: (s: Set<string>) => void;
  todas: string;
}) {
  const valor =
    elegidos.size === 0 ? "__todas__" : elegidos.size === 1 ? [...elegidos][0] : "__varios__";

  return (
    <div className="fg-inline">
      <label>{etiqueta}</label>
      <select
        className="filter-select"
        value={valor}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__todas__") cambiar(new Set());
          else if (v !== "__varios__") cambiar(new Set([v]));
        }}
      >
        <option value="__todas__">{todas}</option>
        {elegidos.size > 1 && <option value="__varios__">Varios ({elegidos.size})</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

// El cuadro que pregunta que va en el documento, antes de imprimir.
//
// Es un <dialog> nativo y no un div propio: el fondo oscuro, el foco atrapado
// adentro y Escape para cerrar los pone el navegador. Se abre con
// showModal() desde un efecto porque el elemento no existe hasta que React lo
// dibuja.
function CuadroDeImpresion({
  bloques,
  cuantos,
  deCuantos,
  idioma,
  setIdioma,
  limpiar,
  imprimir,
  cerrar,
}: {
  bloques: {
    titulo: string;
    opciones: { valor: string; texto: string }[];
    elegidos: Set<string>;
    cambiar: (s: Set<string>) => void;
  }[];
  cuantos: number;
  deCuantos: number;
  idioma: Idioma;
  setIdioma: (i: Idioma) => void;
  limpiar: () => void;
  imprimir: () => void;
  cerrar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  // Destildar uno cuando estan todos tildados tiene que dejar "todos menos
  // ese", no "solo ese". Como el conjunto vacio significa todo, hay que
  // llenarlo antes de sacar: si no, el primer clic invertia la eleccion.
  //
  // Y si al final no queda ninguno, el bloque vuelve a todo: un documento sin
  // ninguna linea, o sin ningun buque, no es un documento. Para quedarse sin
  // nada estan los cruces entre bloques, y ahi Imprimir se apaga.
  const alternar = (bloque: (typeof bloques)[number], valor: string) => {
    const todos = bloque.opciones.map((o) => o.valor);
    const base = bloque.elegidos.size === 0 ? new Set(todos) : new Set(bloque.elegidos);
    if (base.has(valor)) base.delete(valor);
    else base.add(valor);
    bloque.cambiar(base.size === 0 || base.size === todos.length ? new Set() : base);
  };

  return (
    <dialog ref={dialogo} className="modal modal-ancho" onClose={cerrar}>
      <div className="modal-titulo">Que va en el documento</div>

      <div className="elegir-bloques">
        {bloques.map((b) => (
          <div key={b.titulo} className="elegir-bloque">
            <div className="elegir-titulo">
              <span>{b.titulo}</span>
              {/* Sin nada tildado entra todo: es lo mismo que tildar todo y
                  se lee mas facil, asi que "Todos" vacia en vez de llenar. */}
              <button
                type="button"
                className="grupo-accion"
                onClick={() => b.cambiar(new Set())}
                disabled={b.elegidos.size === 0}
              >
                Todos
              </button>
            </div>
            <div className="elegir-lista">
              {b.opciones.map((o) => (
                <label key={o.valor} className="elegir-item">
                  <input
                    type="checkbox"
                    checked={b.elegidos.size === 0 || b.elegidos.has(o.valor)}
                    onChange={() => alternar(b, o.valor)}
                  />
                  <span>{o.texto}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fg-inline mb16">
        <label>Idioma del documento</label>
        <div className="fila-acciones">
          {(["es", "en"] as Idioma[]).map((i) => (
            <button
              key={i}
              type="button"
              className={`btn btn-sm ${idioma === i ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={idioma === i}
              onClick={() => setIdioma(i)}
            >
              {i === "es" ? "Castellano" : "English"}
            </button>
          ))}
        </div>
      </div>

      <div className="modal-pie">
        <span className="filter-cuenta text-mono" style={{ marginRight: "auto", margin: 0 }}>
          {cuantos === deCuantos
            ? `Entra el track record entero: ${deCuantos} trabajos`
            : `Entran ${cuantos} de ${deCuantos} trabajos`}
        </span>
        <button type="button" className="btn btn-ghost" onClick={limpiar}>
          Todo
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => dialogo.current?.close()}>
          Volver
        </button>
        {/* Sin nada que imprimir no se imprime: una hoja vacia no es un
            documento. */}
        <button
          type="button"
          className="btn btn-amarillo"
          onClick={imprimir}
          disabled={cuantos === 0}
        >
          Imprimir
        </button>
      </div>
    </dialog>
  );
}
