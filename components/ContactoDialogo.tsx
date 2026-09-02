"use client";

import { useRef, useState } from "react";
import type { Cliente, ClienteEmpresa } from "@/lib/types";
import {
  actualizarContacto,
  borrarContacto,
  crearContacto,
  crearEmpresa,
} from "@/app/(app)/clientes/actions";

// Los cuadros de dialogo de la base de clientes: alta de empresa, alta de
// contacto y edicion de un contacto ya cargado.
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

export function NuevaEmpresa({ boton }: { boton?: string }) {
  const d = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => d.current?.showModal()}>
        {boton ?? "+ Nueva empresa"}
      </button>

      <dialog ref={d} className="modal">
        <form action={cerrarDespues(crearEmpresa, d, true)}>
          <div className="modal-titulo">Nueva empresa</div>
          <div className="fg mb16">
            <label>Nombre</label>
            <input name="nombre" required placeholder="Como se llama el cliente" />
            <span className="hint">
              Si ya existe con otro uso de mayusculas, la base no la duplica: avisa.
            </span>
          </div>
          <div className="fg mb16">
            <label>Notas</label>
            <input name="notas" placeholder="Opcional" />
          </div>
          <div className="modal-pie">
            <button type="button" className="btn btn-ghost" onClick={() => d.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Crear empresa
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function NuevoContacto({ empresas }: { empresas: ClienteEmpresa[] }) {
  const d = useRef<HTMLDialogElement>(null);
  // Arranca en "nueva" si todavia no hay ninguna empresa cargada: es el unico
  // camino posible y no tiene sentido hacer elegir de una lista vacia.
  const [empresa, setEmpresa] = useState(empresas.length === 0 ? "nueva" : "");

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => d.current?.showModal()}
      >
        + Nuevo contacto
      </button>

      <dialog ref={d} className="modal">
        <form action={cerrarDespues(crearContacto, d, true)}>
          <div className="modal-titulo">Nuevo contacto</div>
          <div className="fg mb16">
            <label>Empresa</label>
            {/* La empresa se puede crear desde aca mismo: cargar un cliente
                nuevo es un solo paso, no dos. */}
            <select
              name="empresa_id"
              required
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
            >
              <option value="" disabled>
                Elegir empresa...
              </option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
              <option value="nueva">+ Nueva empresa</option>
            </select>
            {empresa === "nueva" && (
              <input name="empresa_nueva" placeholder="Nombre de la empresa" required />
            )}
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
