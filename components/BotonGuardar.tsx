"use client";

import { useRef, useState } from "react";

// Un boton de envio que no se puede apretar dos veces.
//
// El problema: hacer doble clic en Guardar manda el formulario dos veces y
// quedan dos filas iguales con dos numeros distintos. Pasa igual apretando
// Enter con impaciencia, y pasa mas cuando la accion tarda —subir un adjunto,
// crear un cliente nuevo— porque justo ahi la pantalla no da ninguna senal de
// que algo este pasando.
//
// Dos cosas que parecen obvias y estan mal, las dos medidas:
//
// 1. `useState` / `useFormStatus` NO alcanzan para bloquear. Los dos
//    actualizan en el tick siguiente, asi que entre el primer clic y el
//    re-render el boton sigue habilitado: tres clics en el mismo tick entraban
//    los tres y creaban tres proyectos identicos. El bloqueo real es el ref,
//    que se marca y se lee en el mismo evento, mas el preventDefault que corta
//    los clics de mas antes de que lleguen a ser un submit.
//
// 2. Poner `disabled` mientras se envia ROMPE el envio. React 19 vacia el
//    estado de forma sincronica en un evento discreto como el clic, asi que el
//    boton queda deshabilitado ANTES de que el navegador ejecute la accion por
//    defecto —y un boton deshabilitado no envia el formulario—. El sintoma es
//    exacto: el boton dice "Guardando..." para siempre y al servidor no llega
//    ningun POST. Por eso el estado solo cambia el texto y el aspecto
//    (aria-disabled), nunca el atributo `disabled`.
//
//    Esto no se veia probando con `boton.click()` desde la consola: un clic
//    sintetico ejecuta el submit dentro de la misma llamada, antes del
//    re-render, y el bug queda tapado. Aparece solo con un clic de verdad.
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
      aria-disabled={enviando}
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
