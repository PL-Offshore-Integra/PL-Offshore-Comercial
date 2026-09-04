import TrackRecordTabla from "@/components/TrackRecord";
import { createClient } from "@/lib/supabase/server";
import { unirTrackRecord, type FilaTrackRecord } from "@/lib/trackRecord";
import type { ProyectoConOperaciones } from "@/lib/types";

// El track record de la empresa: lo que se hizo, para mandarlo con una
// propuesta.
//
// Une dos fuentes y las muestra como una sola: las filas historicas del xlsx
// —de 2017 en adelante, con buques que ya no estan— y los proyectos que se
// terminan en el modulo, que aparecen solos.
export default async function TrackRecordPage() {
  const supabase = await createClient();

  const [{ data: tr, error }, { data: proy }] = await Promise.all([
    supabase
      .from("track_record")
      .select("*")
      .order("anio_desde", { ascending: false, nullsFirst: false }),
    supabase.from("proyectos_con_operaciones").select("*"),
  ]);

  const filas = unirTrackRecord(
    (tr ?? []) as FilaTrackRecord[],
    (proy ?? []) as ProyectoConOperaciones[]
  );

  return (
    <div>
      {error && (
        <div className="info-box danger mb16">
          No se pudo leer el track record: {error.message}. Si dice que la
          relacion no existe, falta correr{" "}
          <span className="text-mono">supabase/migrations/0029_track_record.sql</span>.
        </div>
      )}

      <TrackRecordTabla filas={filas} />
    </div>
  );
}
