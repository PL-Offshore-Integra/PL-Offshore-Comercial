"use client";

import { useRef } from "react";
import type { Cliente, ClienteEmpresa } from "@/lib/types";
import {
  actualizarContacto,
  borrarContacto,
  crearContacto,
} from "@/app/(app)/clientes/actions";

// Los cuadros de dialogo de la base de clientes: alta de contacto y edicion de
// uno ya cargado.
//
// La empresa aca solo se elige de las que ya estan. Las empresas nuevas entran
// por el formulario de la oportunidad, que es donde aparece un cliente que
// todavia no esta cargado.
//
// Es <dialog> nativo, igual que el de Perdido: foco atrapado, Escape para
// cerrar, y adentro un formulario apuntado a la server action.
//
// El `action` no es la server action pelada sino una funcion que la espera y
// despues cierra. Sin eso el cuadro se queda abierto tapando la tabla que
// acaba de cambiar. Y si la accion falla, el throw corta antes del close: el
// cuadro queda abierto con lo que la persona habia escrito, que es lo que
// tiene que pasar.
function cerrarDespues(
  accion: (formData: FormData) => Promise<void>,
  dialogo: React.RefObject<HTMLDialogElement | null>,
  limpiar = false
) {
  return async (formData: FormData) => {
    await accion(formData);
    const form = dialogo.current?.querySelector("form");
    dialogo.current?.close();
    if (limpiar) form?.reset();
  };
}

export function NuevoContacto({ empresas }: { empresas: ClienteEmpresa[] }) {
  const d = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => d.current?.showModal()}
        disabled={empresas.length === 0}
        title={
          empresas.length === 0
            ? "Todavia no hay empresas: la primera se carga al dar de alta una oportunidad"
            : undefined
        }
      >
        + Nuevo contacto
      </button>

      <dialog ref={d} className="modal">
        <form action={cerrarDespues(crearContacto, d, true)}>
          <div className="modal-titulo">Nuevo contacto</div>

          <div className="fg mb16">
            <label>Empresa</label>
            {/* Solo las que ya estan. Las empresas nuevas entran por el
                formulario de la oportunidad, que es donde aparece un cliente
                que todavia no esta en la base. */}
            <select name="empresa_id" required defaultValue="">
              <option value="" disabled>
                Elegir empresa...
              </option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          <CamposContacto />

          <div className="modal-pie">
            <button type="button" className="btn btn-ghost" onClick={() => d.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Crear contacto
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function EditarContacto({ fila }: { fila: Cliente }) {
  const d = useRef<HTMLDialogElement>(null);

  // Sin contacto_id la fila es una empresa sin contactos: no hay nada que
  // editar aca.
  if (!fila.contacto_id) return null;

  const guardar = actualizarContacto.bind(null, fila.contacto_id);
  const borrar = borrarContacto.bind(null, fila.contacto_id);

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => d.current?.showModal()}>
        Editar
      </button>

      <dialog ref={d} className="modal">
        <form action={cerrarDespues(guardar, d)}>
          <div className="modal-titulo">
            {fila.contacto ?? "Contacto"} · {fila.compania}
          </div>

          <CamposContacto fila={fila} />

          <div className="modal-pie">
            <button type="button" className="btn btn-ghost" onClick={() => d.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>

        {/* El borrado va en su propio formulario: si estuviera en el de arriba,
            el required del nombre lo bloquearia.

            Y solo se ofrece cuando de verdad se puede. Con oportunidades
            cargadas la accion lo rechaza igual, pero mejor no mostrar un boton
            que solo sirve para chocar con un error. */}
        {Number(fila.oportunidades) === 0 ? (
          <form action={borrar} className="mt16">
            <button type="submit" className="btn btn-danger btn-sm">
              Borrar contacto
            </button>
          </form>
        ) : (
          <div className="mt16">
            <span className="hint">
              No se puede borrar: tiene {fila.oportunidades} oportunidad
              {Number(fila.oportunidades) === 1 ? "" : "es"} cargada
              {Number(fila.oportunidades) === 1 ? "" : "s"}.
            </span>
          </div>
        )}
      </dialog>
    </>
  );
}

function CamposContacto({ fila }: { fila?: Cliente }) {
  return (
    <>
      <div className="fg mb16">
        <label>Nombre y apellido</label>
        <input name="nombre" defaultValue={fila?.contacto ?? ""} placeholder="Nombre del contacto" />
        <span className="hint">Con el nombre, el mail o el telefono alcanza.</span>
      </div>
      <div className="fg mb16">
        <label>Mail</label>
        <input
          type="email"
          name="email"
          defaultValue={fila?.contacto_email ?? ""}
          placeholder="nombre@empresa.com"
        />
      </div>
      <div className="fg mb16">
        <label>Telefono</label>
        <input
          type="tel"
          name="telefono"
          defaultValue={fila?.contacto_telefono ?? ""}
          placeholder="+54 9 11 ..."
        />
      </div>
      <div className="fg mb16">
        <label>Linkedin</label>
        <input
          name="linkedin"
          defaultValue={fila?.contacto_linkedin ?? ""}
          placeholder="linkedin.com/in/..."
        />
      </div>
      <div className="fg mb16">
        <label>Cargo</label>
        <input
          name="cargo"
          defaultValue={fila?.contacto_cargo ?? ""}
          placeholder="Opcional: Gte. de Operaciones"
        />
      </div>
    </>
  );
}
