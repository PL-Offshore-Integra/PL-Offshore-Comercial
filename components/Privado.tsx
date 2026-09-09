"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Modo privado: las cifras tapadas para mostrar la pantalla en una reunion,
// proyectarla o sacarle una captura.
//
// El borroneado en si lo hace el CSS contra `data-privado` en el <html>
// (globals.css), no React: asi funciona sin volver a dibujar nada y el
// script del layout puede prenderlo antes del primer pintado, que es lo que
// evita que las cifras se vean un instante al entrar.
//
// Aca vive la otra mitad: el estado en React, para las dos cosas que el CSS
// no puede. Una es el boton, que tiene que decir en que estado esta. La otra
// son los datos que no son texto de la pagina —el `title` de un segmento del
// grafico, por ejemplo—: un globo del navegador no se puede borronear, asi
// que el importe hay que sacarlo del atributo.

const Contexto = createContext<{ privado: boolean; alternar: () => void }>({
  privado: false,
  alternar: () => {},
});

const CLAVE = "comercial:privado";

export function PrivadoProvider({ children }: { children: React.ReactNode }) {
  // Arranca apagado y se sincroniza al montar: el servidor no puede saber que
  // hay en el navegador, y si adivinara distinto la hidratacion se quejaria.
  const [privado, setPrivado] = useState(false);
  useEffect(() => {
    setPrivado(document.documentElement.dataset.privado === "1");
  }, []);

  const alternar = () => {
    const nuevo = !privado;
    setPrivado(nuevo);
    document.documentElement.dataset.privado = nuevo ? "1" : "0";
    // Queda guardado: si uno lo prendio es porque no esta solo, y no tiene
    // que volver a prenderlo en cada pantalla ni al volver a entrar.
    try {
      localStorage.setItem(CLAVE, nuevo ? "1" : "0");
    } catch {
      // Navegador sin almacenamiento: el modo funciona igual, no se recuerda.
    }
  };

  return <Contexto.Provider value={{ privado, alternar }}>{children}</Contexto.Provider>;
}

export function usePrivado() {
  return useContext(Contexto);
}

// El boton de la barra de arriba. El texto dice el estado y no la accion, que
// es lo que uno necesita saber de un vistazo antes de compartir la pantalla.
export function BotonPrivado() {
  const { privado, alternar } = usePrivado();
  return (
    <button
      className={`appbar-link ${privado ? "esta-prendido" : ""}`}
      onClick={alternar}
      aria-pressed={privado}
      title={
        privado
          ? "Volver a mostrar los importes"
          : "Borronear los importes para mostrar la pantalla"
      }
    >
      {privado ? "Cifras tapadas" : "Ocultar cifras"}
    </button>
  );
}
