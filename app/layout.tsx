import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comercial | PL Offshore",
  description: "Oportunidades comerciales y calendario de ferias de PL Offshore",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // El script de abajo escribe data-privado en el <html> antes de que
    // React hidrate, asi que el atributo del cliente no coincide con el
    // del servidor y React avisa. La diferencia es deliberada —es como
    // se evita el parpadeo de las cifras— y solo afecta a este nodo,
    // por eso el aviso se silencia aca y no en toda la app.
    <html lang="es" data-instance="pl-offshore" suppressHydrationWarning>
      <body>
        {/* Si el modo privado quedo prendido, hay que marcarlo antes del
            primer pintado: esperando a que React monte, las cifras se verian
            un instante, que es justo lo que el modo evita. Por eso va inline
            y sin React. El try es por los navegadores que bloquean el
            almacenamiento: ahi el modo funciona igual, solo no se recuerda. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("comercial:privado")==="1"){document.documentElement.dataset.privado="1"}}catch(e){}',
          }}
        />
        {children}
      </body>
    </html>
  );
}
