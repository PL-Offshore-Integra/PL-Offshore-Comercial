import Link from "next/link";
import OcupacionFlota, {
  type BarraOcupacion,
  type BuqueEnGantt,
} from "@/components/OcupacionFlota";
import { hoyEnArgentina } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";

// La ocupacion de la flota en el tiempo: que buque esta tomado, cuando, y por
// que trabajo. El mapa dice DONDE; esto dice CUANDO.
//
// LAS DOS BANDAS
//
//   Salen de `comercial.buques.relacion`, que ya distingue propio, gestionado
//   y terceros. Arriba los dos propios —Atlantic Dama y Golondrina de Mar—,
//   abajo lo que no es nuestro.
//
//   De los que no son propios solo se dibujan los que TIENEN trabajo: el
//   maestro tiene ocho buques de terceros que son tonelaje para ofrecer, y
//   ocho renglones vacios no son ocupacion de nada.
//
// EL CAMPO `buque` ES TEXTO
//
//   Los trabajos guardan el nombre del buque como texto y no como FK al
//   maestro, asi que el cruce es por nombre. Un nombre que no este en el
//   maestro no se pierde: va a la banda de abajo marcado como que falta
//   cargarlo. Si desapareciera en silencio, el Gantt estaria mintiendo sobre
//   la ocupacion justo donde hay un error de carga.
//
// LA CASCADA DE LA BARRA
//
//   1. las salidas del proyecto, si tiene
//   2. si no, los periodos del contrato (el original y sus adendas)
//   3. si no, la ventana estimada del proyecto, marcada como estimada
//
//   Las salidas le ganan a los periodos porque son lo que el buque realmente
//   hizo. Service Management tiene 16 salidas sueltas en todo 2026: con el
//   periodo del acuerdo marco el Golondrina figuraria ocupado el ano entero,
//   y entre STS y STS esta libre.

export default async function OcupacionPage() {
  const supabase = await createClient();

  const [
    { data: flota, error: eFlota },
    { data: proy, error: eProy },
    { data: sal, error: eSal },
    { data: per, error: ePer },
    { data: opp, error: eOpp },
  ] = await Promise.all([
    supabase.from("buques").select("nombre, relacion, activo").eq("activo", true),
    supabase
      .from("proyectos")
      .select(
        "id, nro_proyecto, nombre, compania, cliente_final, buque, estado, fecha_inicio_estimada, fecha_fin_estimada",
      )
      .neq("estado", "cancelado"),
    supabase
      .from("operaciones")
      .select("id, nro_operacion, nombre, proyecto_id, buque, fecha_inicio, fecha_fin, estado")
      .neq("estado", "cancelada"),
    supabase
      .from("proyecto_periodos")
      .select("id, proyecto_id, orden, tipo, referencia, desde, hasta"),
    supabase
      .from("oportunidades")
      .select(
        "id, nro_oportunidad, compania, cliente_final, buque, fecha_inicio_estimada, fecha_fin_estimada",
      )
      .eq("estado", "en_curso"),
  ]);

  const error = eFlota ?? eProy ?? eSal ?? ePer ?? eOpp;

  const proyectos = proy ?? [];
  const salidas = sal ?? [];
  const periodos = per ?? [];
  const oportunidades = opp ?? [];

  const barras: BarraOcupacion[] = [];

  for (const p of proyectos) {
    const suyas = salidas.filter((s) => s.proyecto_id === p.id && s.fecha_inicio);
    const sus = periodos
      .filter((x) => x.proyecto_id === p.id)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    // 1) Las salidas, que es lo que el buque hizo de verdad.
    if (suyas.length > 0) {
      for (const s of suyas) {
        barras.push({
          id: `sal-${s.id}`,
          // La salida puede ir con otro buque que el proyecto: en un trabajo
          // largo se releva el buque y la salida lo dice.
          buque: s.buque ?? p.buque ?? "",
          clase: "proyecto",
          origen: "salida",
          nro: s.nro_operacion ?? p.nro_proyecto,
          titulo: s.nombre,
          cliente: p.compania,
          desde: s.fecha_inicio as string,
          hasta: s.fecha_fin,
          href: `/proyectos/${p.id}/operaciones/${s.id}`,
        });
      }
      continue;
    }

    // 2) Los periodos del contrato.
    if (sus.length > 0) {
      for (const x of sus) {
        barras.push({
          id: `per-${x.id}`,
          buque: p.buque ?? "",
          clase: "proyecto",
          origen: "periodo",
          nro: p.nro_proyecto,
          titulo:
            x.tipo === "contrato"
              ? `${p.nombre} · contrato`
              : `${p.nombre} · ${x.referencia ?? `adenda ${x.orden}`}`,
          cliente: p.compania,
          desde: x.desde as string,
          hasta: x.hasta,
          href: `/proyectos/${p.id}`,
        });
      }
      continue;
    }

    // 3) La ventana estimada. Sin fecha de inicio no hay barra posible: ese
    //    proyecto se lista aparte abajo.
    if (p.fecha_inicio_estimada) {
      barras.push({
        id: `pry-${p.id}`,
        buque: p.buque ?? "",
        clase: "proyecto",
        origen: "estimado",
        nro: p.nro_proyecto,
        titulo: p.nombre,
        cliente: p.compania,
        desde: p.fecha_inicio_estimada as string,
        hasta: p.fecha_fin_estimada,
        href: `/proyectos/${p.id}`,
      });
    }
  }

  // Las oportunidades en curso. Las adjudicadas no entran: ya estan como
  // proyecto y se dibujarian dos veces.
  for (const o of oportunidades) {
    if (!o.fecha_inicio_estimada) continue;
    barras.push({
      id: `opp-${o.id}`,
      buque: o.buque ?? "",
      clase: "oportunidad",
      origen: "estimado",
      nro: o.nro_oportunidad,
      titulo: o.compania,
      cliente: o.cliente_final ? `para ${o.cliente_final}` : null,
      desde: o.fecha_inicio_estimada as string,
      hasta: o.fecha_fin_estimada,
      href: `/oportunidades/${o.id}`,
    });
  }

  // Lo que no se puede dibujar no se esconde.
  const sinBuque = barras.filter((b) => !b.buque);
  const conBuque = barras.filter((b) => b.buque);

  const sinFecha = [
    ...proyectos
      .filter(
        (p) =>
          !p.fecha_inicio_estimada &&
          !salidas.some((s) => s.proyecto_id === p.id && s.fecha_inicio) &&
          !periodos.some((x) => x.proyecto_id === p.id),
      )
      .map((p) => ({
        id: p.id,
        que: "Proyecto",
        nro: p.nro_proyecto,
        titulo: p.nombre,
        href: `/proyectos/${p.id}`,
      })),
    ...oportunidades
      .filter((o) => !o.fecha_inicio_estimada)
      .map((o) => ({
        id: o.id,
        que: "Oportunidad",
        nro: o.nro_oportunidad,
        titulo: o.compania,
        href: `/oportunidades/${o.id}`,
      })),
  ];

  // El maestro, mas cualquier nombre de buque que aparezca en un trabajo y no
  // este en el maestro.
  const maestro = new Map<string, string>(
    (flota ?? []).map((b) => [b.nombre, b.relacion as string]),
  );
  const conTrabajo = new Set(conBuque.map((b) => b.buque));

  const buques: BuqueEnGantt[] = [
    // Los propios van siempre, tengan trabajo o no: que uno este libre es lo
    // que se quiere ver.
    ...(flota ?? [])
      .filter((b) => b.relacion === "propio")
      .map((b) => ({ nombre: b.nombre, relacion: b.relacion as string, propio: true })),
    // De los demas, solo los que tienen trabajo.
    ...(flota ?? [])
      .filter((b) => b.relacion !== "propio" && conTrabajo.has(b.nombre))
      .map((b) => ({ nombre: b.nombre, relacion: b.relacion as string, propio: false })),
    // Y los que el trabajo nombra pero el maestro no tiene.
    ...[...conTrabajo]
      .filter((n) => !maestro.has(n))
      .map((n) => ({ nombre: n, relacion: "sin maestro", propio: false })),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const huerfanos = buques.filter((b) => b.relacion === "sin maestro");

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo leer: {error.message}. Si dice que la relacion{" "}
          <span className="text-mono">proyecto_periodos</span> no existe, falta
          correr{" "}
          <span className="text-mono">
            supabase/migrations/0043_periodos_del_contrato.sql
          </span>
          .
        </div>
      )}

      {huerfanos.length > 0 && (
        <div className="info-box warn mb16">
          {huerfanos.length === 1 ? "Hay un buque" : `Hay ${huerfanos.length} buques`} con
          trabajo que no esta en el maestro:{" "}
          {huerfanos.map((b, i) => (
            <span key={b.nombre}>
              {i > 0 && ", "}
              <strong>{b.nombre}</strong>
            </span>
          ))}
          . Se dibujan igual, en la banda de abajo, pero conviene cargarlos o
          corregir el nombre en el trabajo.
        </div>
      )}

      <OcupacionFlota buques={buques} barras={conBuque} hoy={hoyEnArgentina()} />

      {(sinBuque.length > 0 || sinFecha.length > 0) && (
        <div className="card">
          <div className="card-title">
            <span>Fuera del Gantt ({sinBuque.length + sinFecha.length})</span>
          </div>
          <div className="table-wrap">
            <table className="tabla-lista">
              <thead>
                <tr>
                  <th>Que</th>
                  <th>Nro</th>
                  <th>De quien</th>
                  <th>Por que no se dibuja</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sinBuque.map((b) => (
                  <tr key={b.id}>
                    <td className="text-muted">
                      {b.clase === "proyecto" ? "Proyecto" : "Oportunidad"}
                    </td>
                    <td className="text-mono cel-nro">{b.nro ?? "-"}</td>
                    <td className="cel-compania">{b.titulo}</td>
                    <td className="text-muted">Sin buque elegido</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={b.href} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
                {sinFecha.map((f) => (
                  <tr key={f.id}>
                    <td className="text-muted">{f.que}</td>
                    <td className="text-mono cel-nro">{f.nro ?? "-"}</td>
                    <td className="cel-compania">{f.titulo}</td>
                    <td className="text-muted">Sin fecha de inicio</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={f.href} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
