"use client";

import Link from "next/link";
import { useState } from "react";
import { BotonGuardar } from "@/components/BotonGuardar";
import {
  ESTADOS_BUQUE,
  RELACIONES_BUQUE,
  TIPOS_BUQUE,
  type Buque,
} from "@/lib/types";

export const ID_FORM_BUQUE = "form-buque";

// La ficha de un buque.
//
// Es larga porque una ficha tecnica es larga, asi que va en los mismos seis
// bloques en que vienen los brochures: quien es, el casco, las maquinas, la
// cubierta, lo comercial, y de donde salieron los datos.
//
// Casi todo se puede dejar vacio a proposito. Una ficha incompleta sirve
// igual —"un remolcador de 74 toneladas en Colombia" ya es una respuesta— y
// obligar a completar un dato que el papel no da es la unica forma de que la
// lista empiece a mentir.
export default function BuqueForm({
  action,
  buque,
}: {
  action: (formData: FormData) => void;
  buque?: Buque;
}) {
  // El precio y la moneda van juntos: sin precio la moneda no significa nada,
  // asi que el selector se apaga.
  const [precio, setPrecio] = useState(
    buque?.precio_pedido !== null && buque?.precio_pedido !== undefined
      ? String(buque.precio_pedido)
      : ""
  );
  const hayPrecio = precio.trim() !== "";

  const v = (campo: keyof Buque) => {
    const dato = buque?.[campo];
    return dato === null || dato === undefined ? "" : String(dato);
  };

  return (
    <form action={action} className="card" id={ID_FORM_BUQUE}>
      <div className="form-section">Que buque es</div>
      <div className="form-grid">
        <div className="fg">
          <label>Nombre</label>
          <input
            name="nombre"
            defaultValue={buque?.nombre ?? ""}
            placeholder="RAM Condor"
            required
            autoFocus={!buque}
          />
          <span className="hint">
            Si es una oferta de compraventa sin nombre, el numero de la oferta:
            los brokers no dan el nombre hasta que hay interes real.
          </span>
        </div>
        <div className="fg">
          <label>Tipo</label>
          <select name="tipo" defaultValue={buque?.tipo ?? "remolcador"}>
            {TIPOS_BUQUE.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="fg">
          <label>Que tiene que ver PL</label>
          <select name="relacion" defaultValue={buque?.relacion ?? "terceros"}>
            {RELACIONES_BUQUE.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <span className="hint">
            Propio, brokereado por PL, o tonelaje de otro que se puede ofrecer.
          </span>
        </div>
        <div className="fg">
          <label>Estado comercial</label>
          <select
            name="estado_comercial"
            defaultValue={buque?.estado_comercial ?? ""}
          >
            <option value="">No se sabe</option>
            {ESTADOS_BUQUE.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          <span className="hint">
            Dejalo en "no se sabe" si no hay dato: es mejor que afirmar que esta
            disponible.
          </span>
        </div>
        <div className="fg">
          <label>Se ofrece al buscar tonelaje</label>
          <label className="fila-check">
            <input type="checkbox" name="activo" defaultChecked={buque?.activo ?? true} />
            <span>Activo</span>
          </label>
          <span className="hint">
            Destildalo para retirarlo sin borrar la ficha: el tonelaje que hoy
            no sirve puede servir el ano que viene.
          </span>
        </div>
      </div>

      <div className="form-section">De quien es</div>
      <div className="form-grid">
        <div className="fg">
          <label>Propietario / armador</label>
          <input name="propietario" defaultValue={v("propietario")} placeholder="Japina S.A." />
        </div>
        <div className="fg">
          <label>Operador</label>
          <input name="operador" defaultValue={v("operador")} placeholder="Ultratug" />
          <span className="hint">Si lo opera otro. Pueden ser distintos.</span>
        </div>
        <div className="fg">
          <label>Broker</label>
          <input name="broker" defaultValue={v("broker")} placeholder="NJORD Shipbrokers" />
          <span className="hint">Por medio de quien llego la ficha.</span>
        </div>
        <div className="fg">
          <label>Bandera</label>
          <input name="bandera" defaultValue={v("bandera")} placeholder="Ecuador" />
        </div>
        <div className="fg">
          <label>Puerto de registro</label>
          <input
            name="puerto_registro"
            defaultValue={v("puerto_registro")}
            placeholder="Guayaquil"
          />
        </div>
        <div className="fg">
          <label>IMO</label>
          <input name="imo" defaultValue={v("imo")} placeholder="9495234" inputMode="numeric" />
          <span className="hint">
            El identificador de verdad: no cambia aunque cambien el nombre y la
            bandera. Si lo tenes, cargalo.
          </span>
        </div>
      </div>

      <div className="form-section">Construccion y clase</div>
      <div className="form-grid">
        <div className="fg">
          <label>Ano</label>
          <input name="anio" defaultValue={v("anio")} placeholder="2012" inputMode="numeric" />
        </div>
        <div className="fg">
          <label>Astillero</label>
          <input
            name="astillero"
            defaultValue={v("astillero")}
            placeholder="Scheepswerf Damen"
          />
        </div>
        <div className="fg">
          <label>Diseno</label>
          <input name="diseno" defaultValue={v("diseno")} placeholder="DAMEN 6315" />
        </div>
        <div className="fg">
          <label>Clasificadora</label>
          <input
            name="clasificadora"
            defaultValue={v("clasificadora")}
            placeholder="Lloyds Register"
          />
        </div>
        <div className="fg">
          <label>Posicionamiento dinamico</label>
          <input name="dp" defaultValue={v("dp")} placeholder="DP2 (Dynapos AM/AT-R)" />
          <span className="hint">
            En palabras y no un si o no: "tenia DP2 y el armador bajo la
            notacion" es justo lo que hay que poder leer.
          </span>
        </div>
      </div>
      <div className="fg mb16">
        <label>Notacion de clase</label>
        <textarea
          name="notacion_clase"
          defaultValue={v("notacion_clase")}
          rows={2}
          placeholder="LR 100A1 Escort tug · Fire Fighting Ship 1 with Water Spray · Oil Recovery · LMC · UMS"
        />
      </div>

      <div className="form-section">Casco</div>
      <div className="form-grid">
        <div className="fg">
          <label>Eslora total (m)</label>
          <input name="loa_m" defaultValue={v("loa_m")} placeholder="32" inputMode="decimal" />
        </div>
        <div className="fg">
          <label>Manga (m)</label>
          <input name="manga_m" defaultValue={v("manga_m")} placeholder="12,8" inputMode="decimal" />
        </div>
        <div className="fg">
          <label>Puntal (m)</label>
          <input name="puntal_m" defaultValue={v("puntal_m")} placeholder="5,4" inputMode="decimal" />
        </div>
        <div className="fg">
          <label>Calado (m)</label>
          <input name="calado_m" defaultValue={v("calado_m")} placeholder="5,8" inputMode="decimal" />
        </div>
        <div className="fg">
          <label>Arqueo bruto (GT)</label>
          <input name="gt" defaultValue={v("gt")} placeholder="497" inputMode="decimal" />
        </div>
        <div className="fg">
          <label>Arqueo neto (NT)</label>
          <input name="nt" defaultValue={v("nt")} placeholder="128" inputMode="decimal" />
        </div>
        <div className="fg">
          <label>Porte (DWT, t)</label>
          <input name="dwt_t" defaultValue={v("dwt_t")} placeholder="1.950" inputMode="decimal" />
        </div>
      </div>

      <div className="form-section">Maquinas y andar</div>
      <div className="form-grid">
        <div className="fg">
          <label>Tiro a punto fijo (t)</label>
          <input
            name="bollard_pull_t"
            defaultValue={v("bollard_pull_t")}
            placeholder="76"
            inputMode="decimal"
          />
          <span className="hint">
            La columna por la que se busca un remolcador. Si esta, se puede
            filtrar por ella.
          </span>
        </div>
        <div className="fg">
          <label>Potencia instalada (kW)</label>
          <input
            name="potencia_kw"
            defaultValue={v("potencia_kw")}
            placeholder="3.675"
            inputMode="decimal"
          />
          <span className="hint">
            En kW para que se pueda comparar. Si la ficha da HP, el valor
            original va abajo en Motores.
          </span>
        </div>
        <div className="fg">
          <label>Velocidad (nudos)</label>
          <input
            name="velocidad_kn"
            defaultValue={v("velocidad_kn")}
            placeholder="13,2"
            inputMode="decimal"
          />
        </div>
      </div>
      <div className="form-grid">
        <div className="fg">
          <label>Motores</label>
          <textarea
            name="motores"
            defaultValue={v("motores")}
            rows={2}
            placeholder="2 x Niigata 6L 28 HX — 4.929 HP"
          />
          <span className="hint">Tal como lo escribe la ficha, con sus unidades.</span>
        </div>
        <div className="fg">
          <label>Propulsion</label>
          <textarea
            name="propulsion"
            defaultValue={v("propulsion")}
            rows={2}
            placeholder="2 x Niigata ZP-41A azimutal"
          />
        </div>
        <div className="fg">
          <label>Thrusters</label>
          <textarea
            name="thrusters"
            defaultValue={v("thrusters")}
            rows={2}
            placeholder="2 x 600 kW CPP a proa; 1 x 600 kW a popa"
          />
        </div>
      </div>

      <div className="form-section">Cubierta y habitabilidad</div>
      <div className="form-grid">
        <div className="fg">
          <label>Winches y equipo de remolque</label>
          <textarea
            name="winches"
            defaultValue={v("winches")}
            rows={3}
            placeholder="Winch de popa Ibercisa: 54,3 t de tiro, 175 t de freno, cable de 800 m x 52 mm"
          />
        </div>
        <div className="fg">
          <label>Grua</label>
          <textarea
            name="grua"
            defaultValue={v("grua")}
            rows={3}
            placeholder="Palfinger PK15500M — 900 kg a 12 m"
          />
        </div>
        <div className="fg">
          <label>Contra incendio (FiFi)</label>
          <textarea
            name="fifi"
            defaultValue={v("fifi")}
            rows={3}
            placeholder="FiFi 1 · 2 bombas de 1.400 m3/h y 2 monitores de 1.200 m3/h"
          />
        </div>
      </div>
      <div className="form-grid">
        <div className="fg">
          <label>Acomodacion (personas)</label>
          <input
            name="acomodacion"
            defaultValue={v("acomodacion")}
            placeholder="30"
            inputMode="numeric"
          />
        </div>
        <div className="fg">
          <label>Tanques y autonomia</label>
          <textarea
            name="tanques"
            defaultValue={v("tanques")}
            rows={2}
            placeholder="Gasoil 187 m3 · agua dulce 38 m3"
          />
        </div>
      </div>

      <div className="form-section">Lo comercial</div>
      <div className="form-grid">
        <div className="fg">
          <label>Precio pedido</label>
          <input
            name="precio_pedido"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="10.800.000"
            inputMode="decimal"
          />
          <span className="hint">
            En unidades, no en millones. Los precios de las ofertas son AIWI:
            el buque como esta y donde esta.
          </span>
        </div>
        <div className="fg">
          <label>Moneda</label>
          <select
            name="precio_moneda"
            defaultValue={buque?.precio_moneda ?? "USD"}
            disabled={!hayPrecio}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          {!hayPrecio && <span className="hint">Se habilita al poner un precio.</span>}
        </div>
        <div className="fg">
          <label>Disponibilidad</label>
          <input
            name="disponibilidad"
            defaultValue={v("disponibilidad")}
            placeholder="Africa Occidental, libre en octubre de 2026"
          />
        </div>
        <div className="fg">
          <label>Proxima seca</label>
          <input name="proxima_seca" defaultValue={v("proxima_seca")} placeholder="1/2031" />
          <span className="hint">
            Como lo diga la ficha: "Agosto 2026", "1/2031", "2029". No es una
            fecha exacta y no se la inventa.
          </span>
        </div>
      </div>

      <div className="form-section">De donde salio</div>
      <div className="fg mb16">
        <label>Fuente</label>
        <input
          name="fuente"
          defaultValue={v("fuente")}
          placeholder="LATAM Tug Specs/RAM CONDOR SPECS ver2.pdf"
        />
        <span className="hint">
          El archivo o el mail del que salieron estos numeros, para poder ir a
          verificarlos contra el papel del que vinieron.
        </span>
      </div>
      <div className="fg">
        <label>Notas</label>
        <textarea
          name="notas"
          defaultValue={v("notas")}
          rows={4}
          placeholder="Lo que convenga saber antes de ofrecerlo: si el dato es viejo, si hay una inspeccion vencida, si es gemelo de otro"
        />
      </div>

      <div className="flex-between mt16">
        <Link href="/buques" className="btn btn-ghost">
          Atras
        </Link>
        <BotonGuardar form={ID_FORM_BUQUE} />
      </div>
    </form>
  );
}
