-- ============================================================
-- 0036 · Maestro de buques, o la lista de tonelaje
--
-- Silvestre senalo la carpeta 08. COMMERCIAL/Broker y pregunto si eso
-- entraba en Comercial. Adentro hay cuatro cosas distintas —el tonelaje
-- en venta, los remolcadores de LATAM, los dos negocios brokereados con
-- T&T Salvage, y una lista de mailing— y eligio arrancar por el
-- tonelaje. Esto es eso.
--
-- QUE PROBLEMA RESUELVE
--
--   Hoy el buque de un trabajo es texto libre. En las tres tablas donde
--   aparece hay exactamente tres valores escritos a mano:
--
--     Atlantic Dama       2 oportunidades · 2 proyectos ·  2 salidas
--     Golondrina de Mar   1 oportunidad   · 2 proyectos · 17 salidas
--     MMA Majestic        1 oportunidad   · 1 proyecto
--
--   Es el mismo problema que tenia el lugar antes de 0025 y se arregla
--   igual: primero el maestro, y despues el trabajo lo elige de una
--   lista. Esta migracion hace la primera mitad —la tabla y su carga—.
--   Enganchar `buque` a este maestro es la segunda y va aparte, porque
--   toca los formularios de oportunidad, proyecto, salida y plantilla.
--
--   Y resuelve algo que hoy no existe en ningun sistema: cuando un
--   cliente pide un remolcador de 130 toneladas de tiro en el Caribe, la
--   respuesta esta en trece PDFs en OneDrive. Aca queda en una tabla que
--   se puede filtrar y ordenar.
--
-- DE DONDE SALE CADA FILA
--
--   De las fichas de la carpeta, una por una. La columna `fuente` dice
--   de que archivo salio cada buque, asi que cualquier numero de aca se
--   puede ir a verificar contra el papel del que vino.
--
--   Seis de las siete fichas de AHTS en venta son PDFs escaneados y no
--   tienen texto. Los datos de esos seis salieron de los dos
--   comparativos que armo PL —"AHTS_Comparative_PLOffshore" para
--   #24355, #24356 y #24357, y "AHTS Comparative 4V" para #24910 a
--   #24913—, que son los unicos documentos de la carpeta con la tabla
--   completa.
--
-- TRES DECISIONES QUE CONVIENE DEJAR ESCRITAS
--
--   1. LOS SIETE AHTS NO TIENEN NOMBRE, Y ESTA BIEN ASI.
--      NJORD los ofrece por numero: #24355, #24911. Es como trabaja un
--      broker de compraventa: el nombre del buque no se da hasta que hay
--      interes real, para que el comprador no vaya por atras al armador.
--      Asi que el `nombre` de esas siete filas es el numero de oferta, y
--      el dia que se sepan los nombres se corrigen desde la pantalla.
--
--   2. LOS HP SE PASARON A kW.
--      Las fichas de Ultratug y de COTECMAR dan la potencia en HP o BHP;
--      las de NJORD, en kW. Para que `potencia_kw` sirva para comparar,
--      los HP se convirtieron con el factor 0,7457 —y el valor original
--      queda escrito tal cual en `motores`, que es la columna que se lee
--      cuando hay que discutir un numero—.
--
--      Donde la ficha no da potencia, la columna queda vacia. El Don
--      Jose M tiene los mismos motores MTU 16V4000 que el P&O Ozama
--      —mismo astillero, mismo ano, mismas dimensiones al centimetro:
--      son gemelos— pero su ficha no dice cuanta potencia entregan, asi
--      que no se completa por analogia.
--
--   3. EL NOMBRE DEL REMOLCADOR COLOMBIANO LLEVA ENIE.
--      Las migraciones de este repo van sin acentos a proposito, pero
--      "Dona Clary" no es el nombre del buque. Se escribe con la sintaxis
--      de escape Unicode de Postgres —U&'Do\00F1a Clary'— que es ASCII
--      en el archivo y llega a la base con la letra correcta.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0035.
-- ============================================================

-- ------------------------------------------------------------
-- 1) El maestro
--
-- Son muchas columnas porque una lista de tonelaje es eso: una ficha
-- tecnica. El criterio de que va en columna y que va en texto es si se
-- ordena o se filtra por eso. El tiro, la potencia, el ano y el precio
-- se ordenan, asi que son numeros. El winch de remolque no se ordena
-- nunca —se lee— asi que es texto y va tal como lo escribio la ficha.
--
-- Casi todo es nullable. Una ficha incompleta sirve igual, y forzar un
-- dato que el papel no da es la unica forma de que la lista empiece a
-- mentir.
-- ------------------------------------------------------------
create table if not exists comercial.buques (
  id                uuid primary key default gen_random_uuid(),

  nombre            text not null,

  tipo              text not null default 'remolcador'
    check (tipo in ('remolcador','ahts','aht','osv','psv','otro')),

  -- Que tiene que ver PL con este buque. Es lo primero que se pregunta
  -- al mirar la lista.
  --   propio       de la flota de PL Offshore
  --   gestionado   PL lo brokereo o lo administra
  --   terceros     tonelaje de otro que se puede ofrecer
  relacion          text not null default 'terceros'
    check (relacion in ('propio','gestionado','terceros')),

  estado_comercial  text
    check (estado_comercial is null or
           estado_comercial in ('en_venta','disponible','contratado','fuera_de_servicio')),

  -- Quien es el dueno, quien lo opera, y por medio de quien llego la
  -- ficha. Los tres pueden ser distintos: el ARK TORI es de Silver
  -- Maritime, lo administra RK8 Offshore, y la ficha la mando ABS.
  propietario       text,
  operador          text,
  broker            text,

  bandera           text,
  puerto_registro   text,
  imo               text,

  anio              int check (anio is null or anio between 1900 and 2100),
  astillero         text,
  diseno            text,

  clasificadora     text,
  notacion_clase    text,
  -- Texto y no booleano: la diferencia entre DP1, DP2 y "tenia DP2 y el
  -- armador bajo la notacion" es justamente lo que se quiere leer.
  dp                text,

  -- Casco. En metros, como vienen todas las fichas.
  loa_m             numeric(7,2) check (loa_m is null or loa_m > 0),
  manga_m           numeric(7,2) check (manga_m is null or manga_m > 0),
  puntal_m          numeric(7,2) check (puntal_m is null or puntal_m > 0),
  calado_m          numeric(7,2) check (calado_m is null or calado_m > 0),
  gt                numeric(10,2),
  nt                numeric(10,2),
  dwt_t             numeric(10,2),

  -- Maquinas y andar. El tiro es la columna por la que se busca un
  -- remolcador, asi que va primero de este grupo.
  bollard_pull_t    numeric(8,2) check (bollard_pull_t is null or bollard_pull_t > 0),
  potencia_kw       numeric(10,2) check (potencia_kw is null or potencia_kw > 0),
  velocidad_kn      numeric(5,2) check (velocidad_kn is null or velocidad_kn > 0),
  motores           text,
  propulsion        text,
  thrusters         text,

  -- Cubierta y habitabilidad.
  winches           text,
  grua              text,
  fifi              text,
  acomodacion       int check (acomodacion is null or acomodacion >= 0),
  tanques           text,

  -- Lo comercial. `proxima_seca` es texto porque las fichas dicen
  -- "Aug 2026", "1/2031" y "2029": son vencimientos de clase declarados
  -- con la precision que tiene cada uno, y convertirlos a date obligaria
  -- a inventar un dia.
  precio_pedido     numeric(15,2) check (precio_pedido is null or precio_pedido > 0),
  precio_moneda     text check (precio_moneda is null or precio_moneda in ('USD','EUR')),
  disponibilidad    text,
  proxima_seca      text,

  -- El archivo del que salieron estos numeros.
  fuente            text,
  notas             text,

  -- Retirarlo sin borrarlo, igual que en zonas: deja de ofrecerse pero
  -- lo que ya lo apunta sigue apuntando bien.
  activo            boolean not null default true,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Un buque, una fila. Sin distinguir mayusculas ni espacios de sobra.
create unique index if not exists ux_com_buques_nombre
  on comercial.buques (lower(trim(nombre)));

-- El IMO es el identificador de verdad de un buque: no cambia aunque
-- cambien el nombre y la bandera. Unico cuando esta, libre cuando no.
create unique index if not exists ux_com_buques_imo
  on comercial.buques (imo) where imo is not null;

create index if not exists ix_com_buques_tipo on comercial.buques (tipo);
create index if not exists ix_com_buques_relacion on comercial.buques (relacion);

comment on table comercial.buques is
  'Maestro de buques: la flota propia, lo que PL brokereo, y el tonelaje de terceros que se puede ofrecer. La lista de tonelaje del area comercial.';
comment on column comercial.buques.potencia_kw is
  'Potencia instalada en kW. Las fichas que la dan en HP o BHP se convirtieron con el factor 0,7457; el valor original queda en `motores`.';
comment on column comercial.buques.fuente is
  'Archivo de 08. COMMERCIAL/Broker del que salieron los datos de esta fila.';

-- ------------------------------------------------------------
-- 2) La flota propia
--
-- Las dos fichas no estan en la carpeta de Broker —ahi solo hay tonelaje
-- de otros— asi que entran con lo unico que se sabe con certeza. Las
-- carga quien tenga los planos.
-- ------------------------------------------------------------
insert into comercial.buques (nombre, tipo, relacion, bandera, notas) values
  ('Atlantic Dama', 'remolcador', 'propio', 'Argentina',
   'Remolcador propio de PL Offshore. La ficha tecnica no esta en la carpeta de Broker: hay que cargarla.'),
  ('Golondrina de Mar', 'remolcador', 'propio', 'Argentina',
   'Remolcador propio de PL Offshore. Es el del dia garantizado de Service Management. La ficha tecnica no esta en la carpeta de Broker: hay que cargarla.')
on conflict do nothing;

-- ------------------------------------------------------------
-- 3) Los dos negocios brokereados
--
-- PL actuo como ship broker en el fletamento de estos dos AHTS de FIT
-- Frisian Investment & Trading (Singapur) a T&T Salvage LLC. El HULK
-- tiene IMO en el Ship Broker Agreement; el del MMA Majestic no aparece
-- en ningun documento con texto de la carpeta —los charter parties estan
-- escaneados— asi que queda vacio.
--
-- Aca van solo como buques. El negocio en si —los dias, la comision por
-- dia, que facturo HF y que cobro PL— es otra cosa y va cuando se cargue
-- el seguimiento de comisiones.
-- ------------------------------------------------------------
insert into comercial.buques
  (nombre, tipo, relacion, estado_comercial, propietario, imo, fuente, notas) values
  ('MMA Majestic', 'ahts', 'gestionado', 'contratado',
   'FIT Frisian Investment & Trading Pte Ltd (Singapur)', null,
   'Remolques T&T_HF Offshore/MMA Majestic (Thor)/SUPPLYTIME 2017.FIT.TTS.THOR_IV',
   'Es el buque de PRY-5-2026. En el charter party figura como THOR IV. Fletado por FIT a T&T Salvage LLC con SUPPLYTIME 2017 y dos addenda; PL fue el broker. El IMO no esta en ningun documento con texto de la carpeta.'),

  ('Hulk', 'ahts', 'gestionado', 'contratado',
   'FIT Frisian Investment & Trading Pte Ltd (Singapur)', '9276664',
   'Remolques T&T_HF Offshore/Hulk/Ship Broker Agreement PL FIT (Hulk).docx',
   'AHTS HULK, IMO 9276664. Fletado por FIT a T&T Salvage LLC; PL fue el broker y facturo comision. Este negocio todavia no esta cargado como proyecto.')
on conflict do nothing;

-- ------------------------------------------------------------
-- 4) El tonelaje en venta · NJORD Shipbrokers
--
-- Siete AHTS/AHT de entre 122 y 203 toneladas de tiro. Los precios son
-- AIWI (as is, where is), o sea el buque en el estado y el lugar en que
-- esta: no incluye traerlo ni ponerlo en condiciones.
-- ------------------------------------------------------------
insert into comercial.buques
  (nombre, tipo, relacion, estado_comercial, broker, anio, astillero, diseno,
   clasificadora, notacion_clase, dp,
   loa_m, manga_m, puntal_m, calado_m, gt, nt, dwt_t,
   bollard_pull_t, potencia_kw, velocidad_kn, motores, propulsion, thrusters,
   winches, grua, fifi, acomodacion, tanques,
   precio_pedido, precio_moneda, disponibilidad, proxima_seca, fuente, notas) values

  ('#24356', 'ahts', 'terceros', 'en_venta', 'NJORD Shipbrokers',
   1999, 'Kvaerner Kleven', 'KMAR404',
   'Bureau Veritas',
   'BV I +Hull +Mach · AHV · Supply · FiFi · Unrestricted · AUT-UMS · ICE · DYNAPOS AM/AT R',
   'DP2 (DYNAPOS AM/AT R)',
   73.50, 16.40, 8.00, 6.90, 2590, null, null,
   187, 11040, 15,
   '2 x 5.530 kW @ 750 rpm', 'CPP',
   '1 x 800 kW azimutal retractil (Aquamaster) + 1 x 800 kW tunel a proa; 1 x 800 kW a popa',
   'Brattvaag SL: 300 t de tiro / 400 t de freno; 2 x 2.000 m x 76 mm. Storage reels Brattvaag 20 t. Towing pins Karmoy KWT 350-800 SWL 240 t; 2 x Karmoy SWL 500 t. Capstans 2 x 10 t.',
   'TTS-Norlift GPTO 1683 — 5 t a 14 m', 'FiFi 1', 24,
   'MGO 1.545 m3 · agua dulce 522 m3 · drybulk 240 m2 · brine 582 m3 · base oil 167 m3 · cadena 2 x 130 m3',
   10800000, 'EUR', null, 'Enero 2029',
   'AHTS 130-150TN on Sale/AHTS_Comparative_PLOffshore.docx',
   'El unico del lote con clase de hielo y DP2 a la vez. Thrusters y winches recien reacondicionados. Es el mas viejo del lote pero el de mejor relacion precio-capacidad.'),

  ('#24355', 'aht', 'terceros', 'en_venta', 'NJORD Shipbrokers',
   2002, 'Yantai Promet Ship. Co. Limited', null,
   'Bureau Veritas',
   'BV I +Hull +Mach · OSV (Fire-fighting 1, Anchor handling) Tug · Unrestricted · AUT-UMS · MONSHAFT · INWATERSURVEY',
   'Sin DP',
   67.40, 15.50, 7.51, 7.44, 2258, 677, null,
   203, 12000, 17,
   '2 x Wartsila 16V 32 LND, 8.166 bhp / 6.000 kW cada uno', '2 x CPP en toberas fijas',
   '2 x 590 kW a proa; 1 x 660 kW a popa. Alternadores de cola 2 x 2.800 kW (PTO).',
   'BRATTVAAG triple drum: 300 t de tiro en primera capa, 450 t de freno; 2 tambores de AH 1.200 m x 76 mm y 1 de remolque 1.500 m x 76 mm. 2 x KARM stopper forks SWL 500 t. Capstans 2 x 10 t hidraulicos a popa.',
   'PALFINGER MARINE — 3 t a 15 m',
   'FiFi 1 · 2 bombas Skum SFP 250x350, 1.200 m3/h cada una, monitores combinados agua/espuma, control remoto', 20,
   'MGO 1.481 m3 · agua dulce 420 m3 · cadena 2 x 112 m3 · carga en cubierta 700 t',
   11500000, 'EUR', 'Cuarto trimestre, al terminar el time charter en curso', null,
   'AHTS 130-150TN on Sale/AHTS_Comparative_PLOffshore.docx',
   'El de mayor tiro y el mas rapido del lote: 203 t y 17 nudos. Construido para un contrato de ETV y salvamento en la UE. Sin DP, o sea manejo de anclas convencional, remolque y salvamento.'),

  ('#24357', 'ahts', 'terceros', 'en_venta', 'NJORD Shipbrokers',
   2009, 'DAMEN Galati', 'DAMEN 6315',
   null, null, 'DP2',
   67.20, 15.00, 6.75, 5.50, 2485, null, 1950,
   130, 8120, 15,
   '2 x CAT 280-12', 'RR CPP (convencional)',
   '2 x 450 kW CPP a proa; 1 x 450 kW CPP a popa',
   'Double Drum Waterfall: 150 t de tiro / 250 t de freno. Sternroller SWL 300 t. Capstans 2 x 10 t hidraulicos.',
   'Knuckle-boom — 2,8 t a 10,8 m', 'FiFi 1', 29,
   'MGO 910 m3 · agua dulce 295 m3 · recuperacion de hidrocarburos 205 m3 · area de cubierta 420 m2',
   16500000, 'USD', 'Aproximadamente un mes, viene de Africa Occidental', '2029',
   'AHTS 130-150TN on Sale/AHTS_Comparative_PLOffshore.docx',
   'El mas nuevo de los tres del primer comparativo y el unico DAMEN. Tanque de recuperacion de hidrocarburos: sirve para respuesta ambiental. Es el de menor tiro y el de mayor precio del lote.'),

  ('#24910', 'ahts', 'terceros', 'en_venta', 'NJORD Shipbrokers',
   2011, 'Jiangsu Zhenjiang', 'Conan Wu',
   'ABS', 'ABS +A1(E) OSV · FiFi 1 · AMS · DPS-2', 'DP2 (ABS DPS-2)',
   70.70, 16.00, 7.20, 6.20, 2379, null, 2200,
   138, 8054, 14,
   '2 x MAK (2 x 5.400 BHP)', 'Convencional',
   '2 x transversales de 9,5 t a proa; 2 x transversales de 9,5 t a popa',
   'Electrohidraulico double drum waterfall: 300 t de tiro / 450 t de freno. Sternroller 6 m x 2,5 m (SWL 450 t). 2 x capstans de 10 t + 2 x tugger winches de 10 t.',
   '5 t a 17 m',
   'FiFi 1 · 2 monitores, 1.200 m3/h cada uno, alcance 160 m y altura 45 m', 50,
   'MGO 852 m3 · agua dulce 642 m3 · agua de perforacion 661,7 m3 · lodo/brine 484,6 m3 · granel 9.600 m3 · cadena 200 m3 · espuma 11,4 m3 · area de cubierta 450 m2',
   13500000, 'USD', 'Mediterraneo, con la seca inminente', 'Agosto 2026',
   'AHTS 130-150TN on Sale/AHTS Comparative 4V PLOffshore.pdf',
   'El mas nuevo, el casco mas grande y la acomodacion mas grande del lote: 50 personas. Cuidado con la seca de agosto de 2026, que estaba por vencer cuando se armo el comparativo: hay que evaluar el costo y el tiempo fuera de servicio.'),

  ('#24911', 'ahts', 'terceros', 'en_venta', 'NJORD Shipbrokers',
   2006, 'Keppel Singmarine', null,
   'Bureau Veritas',
   'BV I +Hull +Mach · TUG · Supply Vessel · FiFi 1 +WS · AUT-UMS · Dynapos AM/AT-R (2)',
   'DP2 (Dynapos AM/AT-R)',
   67.00, 15.40, 7.00, null, 2310, 693, null,
   128, 8210, 13,
   '2 x CAT 3612 DITA — 8.210 kW / 11.010 BHP. Auxiliares 2 x CAT 3408 de 370 kW.', 'CPP',
   '2 x 600 kW CPP a proa; 1 x 600 kW a popa',
   'Double Drum Waterfall a popa: 320 t de freno, cable 64 mm x 1.200 m. Towing pins 1 juego SWL 300 t; shark jaws SWL 300 t. 2 x capstans de 10 t.',
   'Knuckle boom 12 t a 10 m; auxiliar 1 x 2 t a 15 m', 'FiFi 1', 30,
   'MGO 880 m3 · agua dulce 270 m3 · espuma 24 m3 · dispersante 15 m3',
   12000000, 'USD', 'Africa Occidental, libre en octubre de 2026 al terminar el time charter', '1/2031',
   'AHTS 130-150TN on Sale/24911_AHTS_128TBP_2006.pdf + AHTS Comparative 4V PLOffshore.pdf',
   'La seca mas lejana del lote —1/2031— y la mayor potencia instalada. GMDSS A3. Cuidado: el comparativo aclara que la ficha es la del gemelo, asi que hay que verificar los numeros reales.'),

  ('#24912', 'ahts', 'terceros', 'en_venta', 'NJORD Shipbrokers',
   2003, 'INP Heavy Industries', null,
   'DNV', 'DNV +1A1 Fire Fighter · DK(+) · DYNPOS(AUTR) SF', 'DP2 (DYNPOS AUTR)',
   68.95, 15.50, 7.00, null, 2327, 749, null,
   144, 7950, 14,
   'BERGEN BRM 9. Auxiliares CAT 3406 de 320 kW cada uno.', 'CPP en toberas',
   null,
   'Ulstein Brattvaag double drum waterfall: 300 t de freno, cable 76 mm x 1.200/1.500 m. 2 x towing pins de 250 t + 2 x shark jaws SWL 500 t.',
   '1 x 5 t a 10 m + 1 x 3 t a 15 m', 'FiFi 1', 30,
   'MGO 797 m3 · agua dulce 448 m3',
   8500000, 'USD', 'Africa Occidental, con contrato hasta noviembre de 2026', '01/2029',
   'AHTS 130-150TN on Sale/24912_AHTS_144TBP_2003.pdf + AHTS Comparative 4V PLOffshore.pdf',
   'El de mayor tiro del segundo comparativo y el mas barato: la mejor relacion precio-tiro del lote por lejos. Seca y overhaul de DP terminados en enero de 2024. Shark jaws de 500 t. Cuidado: es el mas viejo, conviene una inspeccion de condicion general.'),

  ('#24913', 'ahts', 'terceros', 'en_venta', 'NJORD Shipbrokers',
   2005, 'Keppel Singmarine', null,
   null, null, null,
   67.00, 15.40, 7.00, null, 2310, 693, null,
   122, 8120, 13,
   'CAT 3612 DITA, 4.060 kW cada uno. Auxiliares CAT 3408 de 370 kW cada uno.', null,
   null,
   'RR double drum waterfall: 320 t de freno, cable 76 mm x 1.200 m, mas carrete de repuesto 64 mm x 1.800 m. 2 x towing pins de 300 t + 2 x shark jaws SWL 300 t. 2 x capstans de 10 t.',
   'Plimsoll 5 t a 10 m', 'FiFi 1', 30,
   'MGO 1.230 m3 · agua dulce 370 m3 · agua de perforacion 500 m3 · lodo/brine 400 m3 · granel 250 m3 · cadena 200 m3 · espuma 24 m3 · dispersante 15 m3',
   11000000, 'USD', null, null,
   'AHTS 130-150TN on Sale/24913_122TBP_AHTS_2005.pdf + AHTS Comparative 4V PLOffshore.pdf',
   'Gemelo del #24911: mismo astillero y mismo ano de clase, o sea operacion, repuestos y tripulacion intercambiables. La mayor capacidad de gasoil del lote, 1.230 m3, asi que la mayor autonomia. Cuidado: no hay confirmacion de DP ni fecha de seca, hay que preguntarselo a NJORD.'),

  ('ARK TORI', 'ahts', 'terceros', null, null,
   2008, 'P.T. Batamec Shipyard', null,
   'ABS',
   'ABS A1 · Towing Vessel · AH · Fire Fighting Vessel Class 1 · Offshore Support Vessel · AMS · ACCU · BP 120 MT · navegacion sin restriccion',
   'Tenia DPS-2 y el armador bajo la notacion',
   null, 16.00, 6.80, null, 2310, 693, 2335.41,
   120, 8000, null,
   '2 x Wartsila 8L32 de 4.000 kW a 750 rpm', 'Wartsila CPP; reductores Wartsila SCV85-P51',
   'Un bow thruster de popa fuera de servicio al momento del informe',
   null, null, 'Fire Fighting Vessel Class 1', null,
   'Gasoil 1.241,8 m3 · agua dulce 239,2 m3 · lastre 760,9 m3',
   null, null, null, null,
   'AHTS 130-150TN on Sale/ARK TORI ABSEagle (5).pdf',
   'CUIDADO CON LA ANTIGUEDAD DEL DATO: la unica fuente es un ABS Survey Status Report de junio de 2019, o sea siete anos. Ahi el buque figura como Laid Up, con la seca y las tres inspecciones especiales vencidas y prorrogadas a febrero de 2019, y una recomendacion de clase abierta: el bow thruster de popa no funcionaba y por eso el armador decidio bajar la notacion DPS-2. Antes de ofrecerlo hay que reconfirmar todo. Armador Silver Maritime Pte. Ltd. (Singapur), administrador RK8 Offshore Ship Management. IMO 9487196, call sign 9VLG4, bandera Singapur. La eslora que da el informe es entre perpendiculares, 60 m; el proyecto del astillero lo describe como un OSV de 67 m, asi que la eslora total no esta en el papel.')
on conflict do nothing;

-- El propietario y la bandera del ARK TORI van en un update aparte para no
-- repetir la lista de columnas de arriba solo por el.
update comercial.buques
set propietario = 'Silver Maritime Pte. Ltd. (Singapur)',
    operador = 'RK8 Offshore Ship Management Pte. Ltd.',
    bandera = 'Singapur',
    puerto_registro = 'Singapur',
    imo = '9487196'
where lower(trim(nombre)) = 'ark tori'
  and imo is null;

-- ------------------------------------------------------------
-- 5) Los remolcadores de LATAM
--
-- Siete remolcadores de puerto y escolta del Caribe y del Pacifico sur:
-- cuatro de Ultratug en Ecuador, dos de la Sociedad Colombiana de
-- Servicios Portuarios, y el P&O Ozama en Republica Dominicana. Estas
-- fichas no son ofertas de venta: son las especificaciones del tonelaje
-- que hay en la region, que es lo que se necesita cuando un cliente
-- pregunta que hay disponible y donde.
--
-- El Ozama y el Don Jose M son gemelos: los dos de Astilleros Armon,
-- 2008, 31,50 x 11,20 x 5,40 m, motores MTU 16V4000 y dos azimutales
-- Schottel SRP 1515. Difieren en el tiro declarado —72 t y 74,17 t— que
-- es lo normal entre gemelos segun como y cuando se hizo la prueba.
-- ------------------------------------------------------------
insert into comercial.buques
  (nombre, tipo, relacion, propietario, operador, bandera, puerto_registro, imo,
   anio, astillero, clasificadora, notacion_clase,
   loa_m, manga_m, puntal_m, calado_m, gt, nt, dwt_t,
   bollard_pull_t, potencia_kw, velocidad_kn, motores, propulsion, thrusters,
   winches, grua, fifi, acomodacion, tanques, fuente, notas) values

  ('P&O Ozama', 'remolcador', 'terceros',
   'P&O Dominicana De Servicios Maritimos S.A.S.',
   'P&O Maritime Logistics — Port Services Division (Dubai)',
   'Republica Dominicana', 'Boca Chica', '9495234',
   2008, 'Astilleros Armon S.A. — Navia, Spain',
   'Lloyds Register',
   'LR 100A1 Tug · Oil Recovery · Fire Fighting Ship 1 with water spray · LMC · UMS',
   31.50, 11.20, 5.40, 4.60, 428, 128, null,
   72, 4000, 12.50,
   '2 x MTU 16V4000M61 — 2 x 2.000 kW / 2.682 bhp a 1.800 rpm. Auxiliares 2 x Caterpillar 3056T de 84 ekW.',
   'Tractor asimetrico (ATT): 2 x azimutal Schottel SRP 1515 FPP', null,
   'Ibercisa a proa y a popa, freno de 150 t cada uno. Gancho de remolque Ferri 1514 SWL 75 t. Cabos de remolque Lankhorst Eurofloat 2 x 110 m, 88 mm, MBL 176 t.',
   'Palfinger PK15500M — 900 kg a 12 m / 3.000 kg a 5 m',
   'Una bomba Jason OGF 300x450 de 2.700 m3/h a 110 m de columna; 2 monitores Jason MM602HJF de 1.200/300 m3/h, alcance 130 m y altura 50 m; 4 equipos de bombero',
   9,
   'Gasoil 293.810 litros · agua dulce 63.239 litros · espuma 12.744 litros. Consumo: 8.000 l/dia a 8 nudos, 6.000 l/dia remolcando a 5-6 nudos.',
   'LATAM Tug Specs/P&O Ozama Brochure_V1 (1).pdf',
   'Tiro de 72 t avante y 65 t atras. Call sign HI-AA69. Gemelo del RM Don Jose M.'),

  ('RAM Condor', 'remolcador', 'terceros',
   'Japina S.A.', 'Ultratug', 'Ecuador', 'Guayaquil', null,
   2012, 'PM Coast Marine (S) Pte. Ltd. — Singapur',
   'Lloyds Register',
   'LR 100A1 Escort tug · Fire Fighting Ship 1 with Water Spray · Oil Recovery · LMC · UMS',
   32.00, 12.80, null, 5.80, 497, null, null,
   76, 3675, 13.20,
   '2 x Niigata 6L 28 HX — 4.929 HP. Generadores 2 x 130 KVA Volvo.',
   '2 x Niigata ZP-41A azimutal', null,
   'Winch de proa Ibercisa 81 t a 13 m/min en primera capa. Winch de popa Ibercisa: 54,3 t de tiro, 175 t de freno, cable de 800 m x 52 mm.',
   '2,17 t con 8 m de alcance',
   'FiFi 1 · 2 bombas de 1.400 m3/h y 2 monitores de 1.200 m3/h', null,
   'Gasoil 187 m3 · agua dulce 38 m3 · aguas negras y grises 8,8 m3. Cubierta libre a popa 50 m2.',
   'LATAM Tug Specs/RAM CONDOR SPECS ver2.pdf',
   'Remolcador de escolta. El tiro no se lee de corrido en el PDF —el brochure dibuja los dos digitos con fuentes distintas— pero decodificando el mapa de caracteres dan 76 t, coherente con los 4.929 HP y con las 74 t del Sangay, que tiene la misma propulsion.'),

  ('RAM Sangay', 'remolcador', 'terceros',
   'Japina S.A.', 'Ultratug', 'Ecuador', 'Guayaquil', null,
   2012, 'Tongfang Jiangxin Shipbuilding Co. Ltd. — China',
   'Lloyds Register',
   'LR 100A1 Escort tug · Fire Fighting Ship 1 with Water Spray · LMC',
   32.00, 11.60, null, 5.38, 495, null, null,
   74, 3729, 12.80,
   '2 x Niigata 6L 28 HX — 2 x 2.500 HP (5.000 BHP). Generadores 2 x 265 kW y 1 x 80 kW Cummins.',
   '2 x Niigata ZP-41 FP azimutal', null,
   'Winch electrohidraulico single drum ME-H65TTW-SD-65/B: 175 t de freno, cable de 800 m x 52 mm. Tambor partido ME-26 U2HWLTW-GDG-65/B con doble cabecero (380 mm), 175 t de freno en primera capa estatico.',
   null,
   'FiFi 1 · 2 bombas de 1.500 m3/h y 2 monitores de 1.200 m3/h, alcance 120 m y altura 50 m. Bombas de incendio 1 x 90 m3/h y 1 x 58 m3/h.',
   null,
   'Gasoil 175 m3 · agua dulce 37 m3 · aguas negras y grises 4 m3. Cubierta libre a popa 93 m2.',
   'LATAM Tug Specs/RAM SANGAY SPECS ver2.pdf',
   'Remolcador de escolta.'),

  ('RAM Puyango', 'remolcador', 'terceros',
   'Japina S.A.', 'Ultratug', 'Ecuador', 'Guayaquil', null,
   2005, 'Scheepswerf Damen — Paises Bajos',
   'Lloyds Register',
   'LR +100A1 tug +LMC · reforzado para navegacion en hielo',
   29.16, 8.84, null, 4.40, 269, null, null,
   68, 3374, 13.00,
   '2 x CAT 3516 TA HD — 4.525 HP. Generadores 2 x CAT 3304 de 190 kW.',
   '2 x helice de paso fijo, 3 palas', null,
   'Winch Kraaijeveld modelo 2981: 107 t de freno, 18 t de tiro.',
   null, 'FiFi 1 monitor de 600 m3/h', null,
   'Gasoil 145,1 m3 · agua dulce 21 m3 · aguas negras y grises 4 m3. Cubierta libre a popa 68 m2.',
   'LATAM Tug Specs/RAM PUYANGO SPECS VER 2.pdf',
   null),

  ('RAM Yasuni', 'remolcador', 'terceros',
   'Japina S.A.', 'Ultratug', 'Ecuador', 'Guayaquil', null,
   2004, 'Scheepswerf Damen — Paises Bajos',
   'Lloyds Register',
   'LR +100A1 tug +LMC · reforzado para navegacion en hielo',
   26.09, 7.94, null, 4.05, 176, null, null,
   57, 2610, 13.00,
   '2 x CAT 3512 TA HD — 3.500 HP. Generadores 2 x CAT 3304 de 190 kW.',
   '2 x helice de paso fijo, 3 palas', null,
   'Gancho de remolque Mampaey de zafada rapida. Winch Marco WRR-080, cable de 44 mm x 400 m.',
   null, 'FiFi 1 monitor de 600 m3/h', null,
   'Gasoil 80 m3 · agua dulce 12 m3. Cubierta libre a popa 35 m2.',
   'LATAM Tug Specs/RAM YASUNI SPECS Ver2.pdf',
   'El mas chico de los cuatro de Ultratug.'),

  ('RM Don Jose M', 'remolcador', 'terceros',
   'Sociedad Colombiana de Servicios Portuarios S.A.',
   'Sociedad Colombiana de Servicios Portuarios S.A.',
   'Colombia', null, null,
   2008, 'Astilleros Armon', 'Lloyds Register', 'Clasificacion oceanica',
   31.50, 11.20, 5.40, 4.60, 428, 128, 413,
   74.17, null, 11.00,
   '2 x MTU 16V4000, series 527104571 y 5277104572',
   'Azimutal Schottel SRP 1515; 2 helices de 4 palas fijas', null,
   null, null, null, null, null,
   'LATAM Tug Specs/RM Don Jose M.pdf',
   'Gemelo del P&O Ozama: mismo astillero, mismo ano, mismas dimensiones y misma propulsion. La ficha no da la potencia instalada; la del Ozama, que tiene los mismos motores, declara 4.000 kW.'),

  (U&'RM Do\00F1a Clary', 'remolcador', 'terceros',
   'Sociedad Colombiana de Servicios Portuarios S.A.',
   'Sociedad Colombiana de Servicios Portuarios S.A.',
   'Colombia', 'Cartagena', null,
   2012, 'COTECMAR', 'Lloyds Register', null,
   37.47, 13.50, 6.07, 4.92, 771, 231, 529,
   73.30, 5049, 13.80,
   '2 x Caterpillar 3516C — 6.772 BHP. Generadores 2 x Caterpillar de 150 kW cada uno, mas un auxiliar Caterpillar.',
   '2 ejes convencionales, 4 palas, en tobera', '1 bow thruster',
   '3 winches de remolque',
   'Telescopica Sormec M220-1S — 10 t a 12 m',
   'Sistema a 15 bares, bomba SEP 300x400 CCW con descarga de 8 pulgadas y 2 monitores, alcance 160 m y altura 60 m',
   8,
   'Gasoil 79.350 galones · agua dulce 18.515 galones. Autonomia 40 dias.',
   U&'LATAM Tug Specs/RM Do\00F1a Clary.pdf',
   'El mas grande de los remolcadores de LATAM de la carpeta.')
on conflict do nothing;

-- ------------------------------------------------------------
-- 6) RLS y grants · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.buques enable row level security;

drop policy if exists "authenticated_all_buques" on comercial.buques;
create policy "authenticated_all_buques" on comercial.buques
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on comercial.buques
  to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select relacion,
       tipo,
       nombre,
       anio,
       bollard_pull_t as tiro_t,
       potencia_kw,
       case when precio_pedido is null then null
            else precio_moneda || ' ' || to_char(precio_pedido / 1000000, 'FM990.0') || ' M'
       end as precio,
       proxima_seca
from comercial.buques
order by relacion, bollard_pull_t desc nulls last, nombre;
