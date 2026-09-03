"use client";

import { useRef, useState } from "react";

// Un boton de envio que no se puede apretar dos veces.
//
// El problema: hacer doble clic en Guardar manda el formulario dos veces y
// quedan dos filas iguales con dos numeros distintos. Pasa igual apretando
// Enter con impaciencia, y pasa mas cuando la accion tarda —subir un adjunto,
// crear un cliente nuevo— porque justo ahi la pantalla no da ninguna senal de
// que algo esta pasando.
//
// El bloqueo tiene que ser SINCRONICO, y por eso no alcanza `useState` ni
// `useFormStatus`: los dos actualizan en el tick siguiente, asi que entre el
// primer clic y el re-render el boton sigue habilitado. Probado: tres clics en
// el mismo tick entraban los tres y creaban tres proyectos. La guarda real es
// el ref, que se marca y se lee en el mismo evento, y el preventDefault que
// corta los clics de mas antes de que lleguen a ser un submit. El estado solo
// existe para cambiar el texto del boton.
//
// Sirve para las dos formas en que el boton se relaciona con su formulario:
// dentro de el, o afuera apuntandolo por id con `form=` —que es como quedaron
// los pies de oportunidad y proyecto para poder ir despues de la
// documentacion—. `button.form` resuelve las dos.
export function BotonGuardar({
  form,
  children = "Guardar",
  className = "btn btn-primary",
  enviando: textoEnviando = "Guardando...",
}: {
  form?: string;
  children?: React.ReactNode;
  className?: string;
  enviando?: string;
}) {
  const yaEnvie = useRef(false);
  const [enviando, setEnviando] = useState(false);

  return (
    <button
      type="submit"
      form={form}
      className={className}
      disabled={enviando}
      onClick={(e) => {
        if (yaEnvie.current) {
          e.preventDefault();
          return;
        }
        // Un formulario invalido no llega a enviarse: el navegador lo corta y
        // muestra que falta. No hay que bloquear nada, porque la persona tiene
        // que poder corregir y volver a intentar.
        const suFormulario = e.currentTarget.form;
        if (suFormulario && !suFormulario.checkValidity()) return;

        yaEnvie.current = true;
        setEnviando(true);
      }}
    >
      {enviando ? textoEnviando : children}
    </button>
  );
}
