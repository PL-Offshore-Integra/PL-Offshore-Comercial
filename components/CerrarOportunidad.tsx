"use client";

import { useRef, useState } from "react";

// El control de estado de cada fila de la lista.
//
// Abierto y En curso se cambian de una: no hay nada que explicar. Los otros dos
// abren un cuadro de dialogo, porque los dos son un final y un final sin motivo
// no le sirve a nadie:
//
//   Cerrado    pide el resultado —ganado o perdido— y el comentario.
//   Cancelado  pide el comentario.
//
// El comentario no va a un campo aparte: va a `comentarios`, que es el que se
// ve en la lista. Cuando alguien mira el listado y ve una perdida o una
// cancelada, lo primero que quiere saber es por que.
export default function EstadoOportunidadControl({
  estado,
  cambiarEstado,
  cerrar,
  reabrir,
  etiqueta,
  comentarios,
}: {
  estado: string;
  resultado: string | null;
  cambiarEstado: (formData: FormData) => void;
  cerrar: (formData: FormData) => void;
  reabrir: () => void;
  etiqueta: string;
  comentarios: string | null;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [modo, setModo] = useState<"cerrar" | "cancelar">("cerrar");
  const [comoCierra, setComoCierra] = useState<"ganado" | "perdido">("ganado");

  if (estado === "cerrado") {
    return (
      <form action={reabrir} style={{ display: "inline" }}>
        <button type="submit" className="btn btn-ghost btn-sm">
          Reabrir
        </button>
      </form>
    );
  }

  const cancelando = modo === "cancelar";
  // Perdida y cancelada exigen el motivo; una ganada puede no tener nada que
  // agregar.
  const motivoObligatorio = cancelando || comoCierra === "perdido";

  return (
    <>
      <form action={cambiarEstado} style={{ display: "inline" }}>
        <select
          name="estado"
          // La key fuerza a React a rehacer el nodo cuando el estado cambia:
          // sin ella reusa el <select> y el defaultValue no se vuelve a
          // aplicar, asi que la fila mostraba el estado viejo despues de
          // guardar.
          key={estado}
          defaultValue={estado}
          className="filter-select select-estado"
          onChange={(e) => {
            const elegido = e.target.value;
            if (elegido === "cerrado" || elegido === "cancelado") {
              // Vuelve al valor anterior: lo confirma el cuadro, no el
              // desplegable.
              e.target.value = estado;
              setModo(elegido === "cancelado" ? "cancelar" : "cerrar");
              dialogo.current?.showModal();
            } else {
              e.target.form?.requestSubmit();
            }
          }}
        >
          <option value="abierto">Abierto</option>
          <option value="en_curso">En curso</option>
          <option value="cancelado">Cancelado...</option>
          <option value="cerrado">Cerrado...</option>
        </select>
      </form>

      <dialog ref={dialogo} className="modal">
        {/* Un solo cuadro para los dos finales: cambia el titulo, si pide
            resultado y a que accion apunta. */}
        <form action={cancelando ? cambiarEstado : cerrar}>
          <div className="modal-titulo">
            {cancelando ? "Cancelar" : "Cerrar"} {etiqueta}
          </div>

          {cancelando ? (
            <input type="hidden" name="estado" value="cancelado" />
          ) : (
            <div className="fg mb16">
              <label>Resultado</label>
              <select
                name="resultado"
                value={comoCierra}
                onChange={(e) => setComoCierra(e.target.value as "ganado" | "perdido")}
              >
                <option value="ganado">Ganado</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
          )}

          <div className="fg mb16">
            <label>
              {cancelando
                ? "Por que se cancela"
                : comoCierra === "perdido"
                  ? "Por que se perdio"
                  : "Comentarios"}
            </label>
            <textarea
              name="comentarios"
              rows={3}
              defaultValue={comentarios ?? ""}
              required={motivoObligatorio}
              placeholder={
                cancelando
                  ? "El cliente suspendio el proyecto, se cayo la licitacion..."
                  : comoCierra === "perdido"
                    ? "Precio, disponibilidad de buque, plazo..."
                    : "Opcional"
              }
            />
            <span className="hint">
              {motivoObligatorio
                ? "Obligatorio. Es lo que se ve en el listado."
                : "Reemplaza los comentarios que tenga cargados."}
            </span>
          </div>

          <div className="modal-pie">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => dialogo.current?.close()}
            >
              Volver
            </button>
            <button
              type="submit"
              className={
                cancelando || comoCierra === "perdido" ? "btn btn-danger" : "btn btn-success"
              }
            >
              {cancelando
                ? "Cancelar la oportunidad"
                : `Cerrar como ${comoCierra === "perdido" ? "perdida" : "ganada"}`}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
