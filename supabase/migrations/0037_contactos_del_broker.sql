-- ============================================================
-- 0037 · Los contactos del mailing list de Broker
--
-- La otra mitad de lo que hay en 08. COMMERCIAL/Broker. Son
-- 431 contactos de armadores, brokers y operadores de todo el
-- mundo, de 32 paises y 106 empresas nombradas. Es la lista a la que
-- se le ofrece el tonelaje que quedo cargado en 0036, asi que las dos
-- cosas viven en el mismo modulo.
--
-- COMO ESTA LA PLANILLA, Y POR QUE IMPORTA
--
--   mailing_list.xlsx se armo a partir de una lista de mails: el nombre y
--   el apellido salieron de partir el usuario del mail por el punto, y la
--   empresa salio del dominio. Donde el mail era nombre.apellido@empresa
--   funciono. Donde no —gfb@allianz-me.com, annie@alphardmaritime.com—
--   quedo basura: el apellido con un numero adentro y la empresa vacia.
--
--   Son 180 de los 431, y son exactamente las mismas filas en los dos
--   casos. Se cargan igual, con el apellido y la empresa en null: el mail
--   sirve, y el dominio esta siempre, asi que la empresa se puede
--   completar despues. Lo que no se hace es rellenarla desde el dominio
--   automaticamente, porque "amguae.net" no dice como se llama la empresa.
--
--   El apellido puramente numerico no se guarda. No es un apellido.
--
--   Las 34 filas del final de la planilla estan vacias —solo tienen
--   formato— asi que no entran.
--
-- LOS ACENTOS
--
--   Las migraciones de este repo van sin acentos a proposito. Los nombres
--   de las personas no tienen ninguno, pero 6 paises y 9 empresas si.
--   Se cargan plegados a ASCII y despues se restauran uno por uno con la
--   sintaxis de escape Unicode de Postgres (paso 3), que deja el archivo
--   en ASCII y la base con la letra correcta.
--
-- Correr desde Supabase -> SQL Editor -> Run. Despues de 0036.
-- ============================================================

-- ------------------------------------------------------------
-- 1) La tabla
-- ------------------------------------------------------------
create table if not exists comercial.broker_contactos (
  id         uuid primary key default gen_random_uuid(),

  -- El unico dato que la planilla tiene siempre bien, y el que identifica
  -- al contacto.
  email      text not null,

  nombre     text,
  apellido   text,
  empresa    text,
  pais       text,
  -- El dominio del mail. Esta siempre, incluso en las filas donde la
  -- empresa quedo vacia, asi que es por donde se agrupan esas.
  dominio    text,

  notas      text,
  -- Para dejar de escribirle a alguien sin perder el contacto.
  activo     boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_com_broker_contactos_email
  on comercial.broker_contactos (lower(trim(email)));

create index if not exists ix_com_broker_contactos_empresa
  on comercial.broker_contactos (empresa) where empresa is not null;
create index if not exists ix_com_broker_contactos_dominio
  on comercial.broker_contactos (dominio) where dominio is not null;

comment on table comercial.broker_contactos is
  'Contactos del mailing list de la linea de broker: armadores, brokers y operadores a los que se les ofrece tonelaje.';
comment on column comercial.broker_contactos.dominio is
  'Dominio del mail. Esta siempre, tambien en las filas donde la empresa no se pudo deducir.';

-- ------------------------------------------------------------
-- 2) La carga · 431 contactos
--
-- Los valores van plegados a ASCII; el paso 3 les devuelve los acentos.
-- ------------------------------------------------------------
insert into comercial.broker_contactos (email, nombre, apellido, empresa, pais, dominio) values
  ('daniel.vrenner@akalimarine.com', 'Daniel', 'Vrenner', 'Akali Marine', 'Singapur', 'akalimarine.com'),
  ('bruce.lethuillier@akastor.com', 'Bruce', 'Lethuillier', 'Akastor', 'Noruega', 'akastor.com'),
  ('fredrik.hunstad@akofsoffshore.com', 'Fredrik', 'Hunstad', 'AKOFS Offshore', 'Noruega', 'akofsoffshore.com'),
  ('gabriel.oliveira@akofsoffshore.com', 'Gabriel', 'Oliveira', 'AKOFS Offshore', 'Noruega', 'akofsoffshore.com'),
  ('gfb@allianz-me.com', 'Gfb', null, null, 'Emiratos Arabes Unidos', 'allianz-me.com'),
  ('khn@allianz-me.com', 'Khn', null, null, 'Emiratos Arabes Unidos', 'allianz-me.com'),
  ('rdh@allianz-me.com', 'Rdh', null, null, 'Emiratos Arabes Unidos', 'allianz-me.com'),
  ('annie@alphardmaritime.com', 'Annie', null, null, 'Singapur', 'alphardmaritime.com'),
  ('gurpreet@alphardmaritime.com', 'Gurpreet', null, null, 'Singapur', 'alphardmaritime.com'),
  ('alexandre.accioly@ambipar.com', 'Alexandre', 'Accioly', 'Ambipar Response', 'Brasil', 'ambipar.com'),
  ('ricardo.chagas@ambipar.com', 'Ricardo', 'Chagas', 'Ambipar Response', 'Brasil', 'ambipar.com'),
  ('justin@amguae.net', 'Justin', null, null, 'Emiratos Arabes Unidos', 'amguae.net'),
  ('arg@aog.ag', 'Arg', null, null, 'Suiza', 'aog.ag'),
  ('pawel.wasniowski@aog.ag', 'Pawel', 'Wasniowski', 'AOG Offshore & Marine', 'Suiza', 'aog.ag'),
  ('billingstad@arctic.com', 'Erlend', 'Billingstad', 'Arctic Securities', 'Noruega', 'arctic.com'),
  ('lukas.daul@arctic.com', 'Lukas', 'Daul', 'Arctic Securities', 'Noruega', 'arctic.com'),
  ('sebastian.grindheim@arctic.com', 'Sebastian', 'Grindheim', 'Arctic Securities', 'Noruega', 'arctic.com'),
  ('ole.berg@arctic.com', 'Ole', 'H. Berg', 'Arctic Securities', 'Noruega', 'arctic.com'),
  ('truls.oma@arctic.com', 'Truls', 'Oma', 'Arctic Securities', 'Noruega', 'arctic.com'),
  ('henrik.oseberg@arctic.com', 'Henrik', 'Oseberg', 'Arctic Securities', 'Noruega', 'arctic.com'),
  ('arosen@aresmgmt.com', 'Arosen', null, null, 'Estados Unidos', 'aresmgmt.com'),
  ('mubariz.jabbarov@asco.az', 'Mubariz', 'Jabbarov', 'ASCO Azerbaijan', 'Azerbaiyan', 'asco.az'),
  ('rashad.shakarov@asco.az', 'Rashad', 'Shakarov', 'ASCO Azerbaijan', 'Azerbaiyan', 'asco.az'),
  ('dahir.chede@asgaard-bourbon.com', 'Dahir', 'Chede', 'Asgaard Bourbon', 'Francia / Noruega', 'asgaard-bourbon.com'),
  ('leann@asiasealink.com', 'Leann', null, null, 'Singapur', 'asiasealink.com'),
  ('christopher.anderson@astro-offshore.com', 'Christopher', 'Anderson', 'Astro Offshore', 'Emiratos Arabes Unidos', 'astro-offshore.com'),
  ('mark.humphreys@astro-offshore.com', 'Mark', 'Humphreys', 'Astro Offshore', 'Emiratos Arabes Unidos', 'astro-offshore.com'),
  ('peiser.brent@atlantictowing.com', 'Peiser', 'Brent', 'Atlantic Towing', 'Canada', 'atlantictowing.com'),
  ('lace.sheldon@atlantictowing.com', 'Lace', 'Sheldon', 'Atlantic Towing', 'Canada', 'atlantictowing.com'),
  ('atlantica@atlantica.as', '124', null, null, 'Noruega', 'atlantica.as'),
  ('chart.offshore@scini.com', '127', null, null, 'Italia', 'scini.com'),
  ('giovanni.cinque@scini.com', 'Giovanni', 'Cinque', 'Augustea / SCINI', 'Italia', 'scini.com'),
  ('chartering.offshore@augustea.com', '134', null, null, 'Italia', 'augustea.com'),
  ('scoscia@augustea.com', 'Scoscia', null, null, 'Italia', 'augustea.com'),
  ('chartering@auroraoffshore.com', '139', null, null, 'Noruega', 'auroraoffshore.com'),
  ('bedeschi@bambinispa.it', 'Bedeschi', null, null, 'Italia', 'bambinispa.it'),
  ('gamarante@baruoffshore.com.br', 'Gamarante', null, null, 'Brasil', 'baruoffshore.com.br'),
  ('jpedroza@baruoffshore.com.br', 'Jpedroza', null, null, 'Brasil', 'baruoffshore.com.br'),
  ('mgunter@baruoffshore.com.mx', 'Mgunter', null, null, 'Mexico', 'baruoffshore.com.mx'),
  ('andre@belov.com.br', 'Andre', null, null, 'Brasil', 'belov.com.br'),
  ('juracy@belov.com.br', 'Juracy', null, null, 'Brasil', 'belov.com.br'),
  ('tobun.adewole@beneprojecti.com', 'Tobun', 'Adewole', 'Bene Projecti', 'Nigeria', 'beneprojecti.com'),
  ('aoh@bluemarine.com.mx', '169', null, null, 'Mexico', 'bluemarine.com.mx'),
  ('management@blueridge-marine.com', '172', null, null, 'Estados Unidos', 'blueridge-marine.com'),
  ('chartering@boa.no', '175', null, null, 'Noruega', 'boa.no'),
  ('rune.juliussen@boa.no', 'Rune', 'Juliussen', 'BOA Offshore', 'Noruega', 'boa.no'),
  ('helge.kvalvik@boa.no', 'Helge', 'Kvalvik', 'BOA Offshore', 'Noruega', 'boa.no'),
  ('christoph.toepfer@borealismaritime.com', 'Christoph', 'Toepfer', 'Borealis Maritime', 'Reino Unido', 'borealismaritime.com'),
  ('frank.dambrin@bourbon-online.com', 'Frank', 'Dambrin', 'Bourbon Offshore', 'Francia', 'bourbon-online.com'),
  ('leila.laouriga@bourbon-online.com', 'Leila', 'Laouriga', 'Bourbon Offshore', 'Francia', 'bourbon-online.com'),
  ('viktoriya.myaus@bourbon-online.com', 'Viktoriya', 'Myaus', 'Bourbon Offshore', 'Francia', 'bourbon-online.com'),
  ('marketing@bourbon-subsea-services.com', '202', null, null, 'Francia', 'bourbon-subsea-services.com'),
  ('afusco@bpmigroup.com', 'Afusco', null, null, 'Mexico', 'bpmigroup.com'),
  ('ramon@bpmigroup.com', 'Ramon', null, null, 'Mexico', 'bpmigroup.com'),
  ('luanny.brandao@bravante.com.br', 'Luanny', 'Brandao', 'Bravante', 'Brasil', 'bravante.com.br'),
  ('rafael.drumond@bravante.com.br', 'Rafael', 'Drumond', 'Bravante', 'Brasil', 'bravante.com.br'),
  ('marcelino.jose@bravante.com.br', 'Marcelino', 'Jose', 'Bravante', 'Brasil', 'bravante.com.br'),
  ('paulo.mediano@bravante.com.br', 'Paulo', 'Mediano', 'Bravante', 'Brasil', 'bravante.com.br'),
  ('jelle.hakvoort@braveheartmarine.com', 'Jelle', 'Hakvoort', 'Braveheart Marine', 'Paises Bajos', 'braveheartmarine.com'),
  ('joseph.bekhor@britmarine.co.uk', 'Joseph', 'Bekhor', 'Brit Marine', 'Reino Unido', 'britmarine.co.uk'),
  ('mark.kachouh@britoil.com.sg', 'Mark', 'Kachouh', 'Britoil Offshore', 'Singapur', 'britoil.com.sg'),
  ('christoph.schulte@bs-offshore.com', 'Christoph', 'Schulte', 'BS Offshore', 'Alemania', 'bs-offshore.com'),
  ('moritz.fritsche@bs-shipmanagement.com', 'Moritz', 'Fritsche', 'BS Shipmanagement', 'Alemania', 'bs-shipmanagement.com'),
  ('uk-chartering@bsm-offshore.com', '250', null, null, 'Alemania', 'bsm-offshore.com'),
  ('moritz.fritsche@bsm-offshore.com', 'Moritz', 'Fritsche', 'BSM Offshore', 'Alemania', 'bsm-offshore.com'),
  ('matthias.mueller@bsm-offshore.com', 'Matthias', 'Mueller', 'BSM Offshore', 'Alemania', 'bsm-offshore.com'),
  ('offshore@bugsier.de', '257', null, null, 'Alemania', 'bugsier.de'),
  ('fabioribeiro@camorim.com.br', 'Fabioribeiro', null, null, 'Brasil', 'camorim.com.br'),
  ('g.ventouris@capitaloffshore.com', 'G', 'Ventouris', 'Capital Offshore', 'Grecia', 'capitaloffshore.com'),
  ('zavala@cemza.com', 'Zavala', null, null, 'Mexico', 'cemza.com'),
  ('amairani.cachon@cemza.com', 'Amairani', 'Cachon', 'CEMZA / Marinsa', 'Mexico', 'cemza.com'),
  ('pablo.casanueva@cemza.com', 'Pablo', 'Casanueva', 'CEMZA / Marinsa', 'Mexico', 'cemza.com'),
  ('jorge.rafful@cemza.com', 'Jorge', 'Rafful', 'CEMZA / Marinsa', 'Mexico', 'cemza.com'),
  ('vladimir.ulloa@cemza.com', 'Vladimir', 'Ulloa', 'CEMZA / Marinsa', 'Mexico', 'cemza.com'),
  ('m.roelofs@cfbv.com', 'M', 'Roelofs', 'CFBV', 'Paises Bajos', 'cfbv.com'),
  ('brokers@claver-maritime.de', '291', null, null, 'Alemania', 'claver-maritime.de'),
  ('alex@cmmoffshore.com', 'Alex', null, null, 'Francia', 'cmmoffshore.com'),
  ('christophe@cmmoffshore.com', 'Christophe', null, null, 'Francia', 'cmmoffshore.com'),
  ('christian.hvide@compassenergy.com', 'Christian', 'Hvide', 'Compass Energy', 'Noruega', 'compassenergy.com'),
  ('dsof@costamare.com', 'Dsof', null, null, 'Grecia', 'costamare.com'),
  ('gwebster@costamare.com', 'Gwebster', null, null, 'Grecia', 'costamare.com'),
  ('plund@costamare.com', 'Plund', null, null, 'Grecia', 'costamare.com'),
  ('jlo@deepocean.no', 'Jlo', null, null, 'Noruega', 'deepocean.no'),
  ('jspangberg@deepoceangroup.com', 'Jspangberg', null, null, 'Noruega', 'deepoceangroup.com'),
  ('pthuestad@deepoceangroup.com', 'Pthuestad', null, null, 'Noruega', 'deepoceangroup.com'),
  ('tvagsholm@deepoceangroup.com', 'Tvagsholm', null, null, 'Noruega', 'deepoceangroup.com'),
  ('christian@deltalogistics.net', 'Christian', null, null, 'Estados Unidos', 'deltalogistics.net'),
  ('jesse@deltalogistics.net', 'Jesse', null, null, 'Estados Unidos', 'deltalogistics.net'),
  ('cepbra@detroit.cl', '330', null, null, 'Chile', 'detroit.cl'),
  ('vbsbra@detroit.cl', '330', null, null, 'Chile', 'detroit.cl'),
  ('tender@deutscheoffshore.com', '335', null, null, 'Alemania', 'deutscheoffshore.com'),
  ('hdr@dof.no', '338', null, null, 'Noruega', 'dof.no'),
  ('operation@dof.no', '338', null, null, 'Noruega', 'dof.no'),
  ('elias.abibe@dof.com', 'Elias', 'Abibe', 'DOF ASA', 'Noruega', 'dof.com'),
  ('anita.olaisen@dof.com', 'Anita', 'Olaisen', 'DOF ASA', 'Noruega', 'dof.com'),
  ('breno.spolidoro@dof.com', 'Breno', 'Spolidoro', 'DOF ASA', 'Noruega', 'dof.com'),
  ('sigbjorn.stangeland@dof.com', 'Sigbjorn', 'Stangeland', 'DOF ASA', 'Noruega', 'dof.com'),
  ('oyvind.vaage@dof.com', 'Oyvind', 'Vaage', 'DOF ASA', 'Noruega', 'dof.com'),
  ('mario.fuzetti@dofsubsea.com', 'Mario', 'Fuzetti', 'DOF Subsea', 'Noruega', 'dofsubsea.com'),
  ('jan.nore@dofsubsea.com', 'Jan', 'Nore', 'DOF Subsea', 'Noruega', 'dofsubsea.com'),
  ('dagraymond.rasch@dofsubsea.com', 'Dagraymond', 'Rasch', 'DOF Subsea', 'Noruega', 'dofsubsea.com'),
  ('marco.sclocchi@dofsubsea.com', 'Marco', 'Sclocchi', 'DOF Subsea', 'Noruega', 'dofsubsea.com'),
  ('dante.stefani@dofsubsea.com', 'Dante', 'Stefani', 'DOF Subsea', 'Noruega', 'dofsubsea.com'),
  ('ingolf.gillesdal@dolphindrilling.no', 'Ingolf', 'Gillesdal', 'Dolphin Drilling', 'Noruega', 'dolphindrilling.no'),
  ('miro.arantes@easbr.com', 'Miro', 'Arantes', 'EAS Brasil', 'Brasil', 'easbr.com'),
  ('willy.tan@easternnavigation.com', 'Willy', 'Tan', 'Eastern Navigation', 'Singapur', 'easternnavigation.com'),
  ('tiffany.tay@easternnavigation.com', 'Tiffany', 'Tay', 'Eastern Navigation', 'Singapur', 'easternnavigation.com'),
  ('cm@echoshipping.com', '393', null, null, 'Emiratos Arabes Unidos', 'echoshipping.com'),
  ('arash.memarzadeh@echoshipping.com', 'Arash', 'Memarzadeh', 'Echo Shipping', 'Emiratos Arabes Unidos', 'echoshipping.com'),
  ('chartering@eddaaccommodation.com', '399', null, null, 'Noruega', 'eddaaccommodation.com'),
  ('arnfinn.herland@eddaaccommodation.com', 'Arnfinn', 'Herland', 'Edda Accommodation', 'Noruega', 'eddaaccommodation.com'),
  ('hilde.svendsen@eddaaccommodation.com', 'Hilde', 'Svendsen', 'Edda Accommodation', 'Noruega', 'eddaaccommodation.com'),
  ('tore.velde@eddaaccommodation.com', 'Tore', 'Velde', 'Edda Accommodation', 'Noruega', 'eddaaccommodation.com'),
  ('arild.vik@eddaaccommodation.com', 'Arild', 'Vik', 'Edda Accommodation', 'Noruega', 'eddaaccommodation.com'),
  ('stian.waage@eddaaccommodation.com', 'Stian', 'Waage', 'Edda Accommodation', 'Noruega', 'eddaaccommodation.com'),
  ('kenneth.walland@eddawind.com', 'Kenneth', 'Walland', 'Edda Wind', 'Noruega', 'eddawind.com'),
  ('michael.braid@chouest.com', 'Michael', 'Braid', 'Edison Chouest Offshore', 'Estados Unidos', 'chouest.com'),
  ('sandro.correia@chouest.com', 'Sandro', 'Correia', 'Edison Chouest Offshore', 'Estados Unidos', 'chouest.com'),
  ('ugo.fernandez@chouest.com', 'Ugo', 'Fernandez', 'Edison Chouest Offshore', 'Estados Unidos', 'chouest.com'),
  ('cezar.frauches@chouest.com', 'Cezar', 'Frauches', 'Edison Chouest Offshore', 'Estados Unidos', 'chouest.com'),
  ('fabiana.richards@chouest.com', 'Fabiana', 'Richards', 'Edison Chouest Offshore', 'Estados Unidos', 'chouest.com'),
  ('hugo.santos@chouest.com', 'Hugo', 'Santos', 'Edison Chouest Offshore', 'Estados Unidos', 'chouest.com'),
  ('chartering@edtoffshore.com', '442', null, null, 'Emiratos Arabes Unidos', 'edtoffshore.com'),
  ('john.stamoudakis@edtoffshore.com', 'John', 'Stamoudakis', 'EDT Offshore', 'Emiratos Arabes Unidos', 'edtoffshore.com'),
  ('lauritz@eidesvik.no', 'Lauritz', null, null, 'Noruega', 'eidesvik.no'),
  ('jan.lodden@eidesvik.no', 'Jan', 'Lodden', 'Eidesvik Offshore', 'Noruega', 'eidesvik.no'),
  ('chartering@enavoffshore.com', '454', null, null, 'Mexico', 'enavoffshore.com'),
  ('daguilar@enavoffshore.com', 'Daguilar', null, null, 'Mexico', 'enavoffshore.com'),
  ('chartering@esvagt.dk', '459', null, null, 'Dinamarca', 'esvagt.dk'),
  ('sara@executiveoffshore.com', 'Sara', null, null, 'Estados Unidos', 'executiveoffshore.com'),
  ('svein.leon.aure@farstadshipping.no', 'Svein', 'Leon Aure', 'Farstad Shipping', 'Noruega', 'farstadshipping.no'),
  ('ilyshko@femco.ru', '472', null, null, 'Rusia', 'femco.ru'),
  ('martin@ferncliff.no', 'Martin', null, null, 'Noruega', 'ferncliff.no'),
  ('rwoods@firstshiplease.com', 'Rwoods', null, null, 'Singapur', 'firstshiplease.com'),
  ('commercial@fletcher-group.com', '484', null, null, 'Reino Unido', 'fletcher-group.com'),
  ('niall.reid@fletcher-group.com', 'Niall', 'Reid', 'Fletcher Group', 'Reino Unido', 'fletcher-group.com'),
  ('morten@framar.no', 'Morten', null, null, 'Noruega', 'framar.no'),
  ('tom@framar.no', 'Tom', null, null, 'Noruega', 'framar.no'),
  ('rogerio.carvalho@fugro.com', 'Rogerio', 'Carvalho', 'Fugro', 'Paises Bajos', 'fugro.com'),
  ('c.danieau@fugro.com', 'C', 'Danieau', 'Fugro', 'Paises Bajos', 'fugro.com'),
  ('j.heredia@fugro.com', 'J', 'Heredia', 'Fugro', 'Paises Bajos', 'fugro.com'),
  ('d.koenen@fugro.com', 'D', 'Koenen', 'Fugro', 'Paises Bajos', 'fugro.com'),
  ('rodrigo.sonohara@fugro.com', 'Rodrigo', 'Sonohara', 'Fugro', 'Paises Bajos', 'fugro.com'),
  ('p.voogd@fugro.com', 'P', 'Voogd', 'Fugro', 'Paises Bajos', 'fugro.com'),
  ('chartering.shipping@gcrieber.com', '516', null, null, 'Noruega', 'gcrieber.com'),
  ('oystein.kvale@gcrieber.com', 'Oystein', 'Kvale', 'G.C. Rieber Shipping', 'Noruega', 'gcrieber.com'),
  ('trine.setre@gcrieber.no', 'Trine', 'Setre', 'G.C. Rieber Shipping', 'Noruega', 'gcrieber.no'),
  ('silje.sognen@gcrieber.com', 'Silje', 'Sognen', 'G.C. Rieber Shipping', 'Noruega', 'gcrieber.com'),
  ('einar.ytredal@gcrieber.com', 'Einar', 'Ytredal', 'G.C. Rieber Shipping', 'Noruega', 'gcrieber.com'),
  ('daniel@galaxiamaritima.com.br', 'Daniel', null, null, 'Brasil', 'galaxiamaritima.com.br'),
  ('moacyr@galaxiamaritima.com.br', 'Moacyr', null, null, 'Brasil', 'galaxiamaritima.com.br'),
  ('tore@gardshipping.no', 'Tore', null, null, 'Noruega', 'gardshipping.no'),
  ('chartering@geoff.no', '540', null, null, 'Noruega', 'geoff.no'),
  ('pif@geoff.no', '540', null, null, 'Noruega', 'geoff.no'),
  ('stbf@geoff.no', '540', null, null, 'Noruega', 'geoff.no'),
  ('p.komninos@glomaroffshore.com', 'P', 'Komninos', 'Glomar Offshore', 'Paises Bajos', 'glomaroffshore.com'),
  ('garrick.stanley@gooffshore.com.au', 'Garrick', 'Stanley', 'Go Offshore', 'Australia', 'gooffshore.com.au'),
  ('victoria.sullivan@gooffshore.com.au', 'Victoria', 'Sullivan', 'Go Offshore', 'Australia', 'gooffshore.com.au'),
  ('miguel@granenergia.com.br', 'Miguel', null, null, 'Brasil', 'granenergia.com.br'),
  ('raffaello.paladino@granenergia.com.br', 'Raffaello', 'Paladino', 'Gran Energia', 'Brasil', 'granenergia.com.br'),
  ('shailesh_naik@greatshipglobal.com', 'Shailesh', 'Naik', 'Great Ship Global', 'India', 'greatshipglobal.com'),
  ('rahul_pradhan@greatshipglobal.com', 'Rahul', 'Pradhan', 'Great Ship Global', 'India', 'greatshipglobal.com'),
  ('chartering@grupocbo.com.br', '574', null, null, 'Brasil', 'grupocbo.com.br'),
  ('leonardo.gadelha@grupocbo.com.br', 'Leonardo', 'Gadelha', 'Grupo CBO', 'Brasil', 'grupocbo.com.br'),
  ('marcelo.martins@grupocbo.com.br', 'Marcelo', 'Martins', 'Grupo CBO', 'Brasil', 'grupocbo.com.br'),
  ('emilio.moreira@grupocbo.com.br', 'Emilio', 'Moreira', 'Grupo CBO', 'Brasil', 'grupocbo.com.br'),
  ('paula.quirino@grupocbo.com.br', 'Paula', 'Quirino', 'Grupo CBO', 'Brasil', 'grupocbo.com.br'),
  ('marcos.tinti@grupocbo.com.br', 'Marcos', 'Tinti', 'Grupo CBO', 'Brasil', 'grupocbo.com.br'),
  ('svein.sandvik@gse-sandvik.com', 'Svein', 'Sandvik', 'GSE Sandvik', 'Noruega', 'gse-sandvik.com'),
  ('mario.perrone@gspoffshore.com', 'Mario', 'Perrone', 'GSP Offshore', 'Rumania', 'gspoffshore.com'),
  ('danny.angeron@gulfmark.com', 'Danny', 'Angeron', 'GulfMark Offshore', 'Estados Unidos', 'gulfmark.com'),
  ('andrew.bruzdzinski@gulfmark.com', 'Andrew', 'Bruzdzinski', 'GulfMark Offshore', 'Estados Unidos', 'gulfmark.com'),
  ('dpa@haduco.com.vn', '609', null, null, 'Vietnam', 'haduco.com.vn'),
  ('rgwinn@harveygulf.com', 'Rgwinn', null, null, 'Estados Unidos', 'harveygulf.com'),
  ('shane@harveygulf.com', 'Shane', null, null, 'Estados Unidos', 'harveygulf.com'),
  ('eddie.falgout@harveygulf.com', 'Eddie', 'Falgout', 'Harvey Gulf International Marine', 'Estados Unidos', 'harveygulf.com'),
  ('chartering@havila.no', '622', null, null, 'Noruega', 'havila.no'),
  ('ajd@havila.no', 'Ajd', null, null, 'Noruega', 'havila.no'),
  ('njaal@havila.no', 'Njaal', null, null, 'Noruega', 'havila.no'),
  ('einar.amas@havila.no', 'Einar', 'Amas', 'Havila Shipping', 'Noruega', 'havila.no'),
  ('sveinung.gjelseth@havila.no', 'Sveinung', 'Gjelseth', 'Havila Shipping', 'Noruega', 'havila.no'),
  ('kjell.rabben@havila.no', 'Kjell', 'Rabben', 'Havila Shipping', 'Noruega', 'havila.no'),
  ('runar.smadal@havila.no', 'Runar', 'Smadal', 'Havila Shipping', 'Noruega', 'havila.no'),
  ('blair.cook@horizonmaritime.com', 'Blair', 'Cook', 'Horizon Maritime', 'Canada', 'horizonmaritime.com'),
  ('graham.curren@horizonmaritime.com', 'Graham', 'Curren', 'Horizon Maritime', 'Canada', 'horizonmaritime.com'),
  ('cliff.gaetz@horizonmaritime.com', 'Cliff', 'Gaetz', 'Horizon Maritime', 'Canada', 'horizonmaritime.com'),
  ('sean.leet@horizonnavlengineering.com', 'Sean', 'Leet', 'Horizon Naval Engineering', 'Canada', 'horizonnavlengineering.com'),
  ('john.cook@hornbeckoffshore.com', 'John', 'Cook', 'Hornbeck Offshore Services', 'Estados Unidos', 'hornbeckoffshore.com'),
  ('robert.gang@hornbeckoffshore.com', 'Robert', 'Gang', 'Hornbeck Offshore Services', 'Estados Unidos', 'hornbeckoffshore.com'),
  ('todd.hornbeck@hornbeckoffshore.com', 'Todd', 'Hornbeck', 'Hornbeck Offshore Services', 'Estados Unidos', 'hornbeckoffshore.com'),
  ('randy.tredinich@hornbeckoffshore.com', 'Randy', 'Tredinich', 'Hornbeck Offshore Services', 'Estados Unidos', 'hornbeckoffshore.com'),
  ('h.felderhoff@hp-shipping.de', 'H', 'Felderhoff', 'HP Shipping', 'Alemania', 'hp-shipping.de'),
  ('harald.fh@hp-shipping.mx', 'Harald', 'Fh', 'HP Shipping Mexico', 'Mexico', 'hp-shipping.mx'),
  ('liuxin02@icbcleasing.com', '678', null, null, 'China', 'icbcleasing.com'),
  ('likai@icbcleasing.com', 'Likai', null, null, 'China', 'icbcleasing.com'),
  ('qikai@icbcleasing.com', 'Qikai', null, null, 'China', 'icbcleasing.com'),
  ('saijianan@icbcleasing.com', 'Saijianan', null, null, 'China', 'icbcleasing.com'),
  ('chartering@islandoffshore.com', '688', null, null, 'Noruega', 'islandoffshore.com'),
  ('bjornv@islandoffshore.com', 'Bjornv', null, null, 'Noruega', 'islandoffshore.com'),
  ('hallgeir@islandoffshore.com', 'Hallgeir', null, null, 'Noruega', 'islandoffshore.com'),
  ('havard@islandoffshore.com', 'Havard', null, null, 'Noruega', 'islandoffshore.com'),
  ('karljohan@islandoffshore.com', 'Karljohan', null, null, 'Noruega', 'islandoffshore.com'),
  ('tommy@islandoffshore.com', 'Tommy', null, null, 'Noruega', 'islandoffshore.com'),
  ('leonardo.marcondes@itaubba.com', 'Leonardo', 'Marcondes', 'Itau BBA', 'Brasil', 'itaubba.com'),
  ('isabella@janeirooffshore.com.br', 'Isabella', null, null, 'Brasil', 'janeirooffshore.com.br'),
  ('latif@kimheng.com.sg', 'Latif', null, null, 'Singapur', 'kimheng.com.sg'),
  ('justin.tan@kimheng.com.sg', 'Justin', 'Tan', 'Kim Heng Offshore', 'Singapur', 'kimheng.com.sg'),
  ('melvin.tan@kimheng.com.sg', 'Melvin', 'Tan', 'Kim Heng Offshore', 'Singapur', 'kimheng.com.sg'),
  ('thomas.tan@kimheng.com.sg', 'Thomas', 'Tan', 'Kim Heng Offshore', 'Singapur', 'kimheng.com.sg'),
  ('kristoffer.sandaker@kistefos.no', 'Kristoffer', 'Sandaker', 'Kistefos', 'Noruega', 'kistefos.no'),
  ('johnny.aarseth@km.kongsberg.com', 'Johnny', 'Aarseth', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('ottar.antonsen@km.kongsberg.com', 'Ottar', 'Antonsen', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('atle.gaaso@km.kongsberg.com', 'Atle', 'Gaaso', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('marcelo.gouvea@km.kongsberg.com', 'Marcelo', 'Gouvea', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('jorn.heltne@km.kongsberg.com', 'Jorn', 'Heltne', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('runar.hjelle@km.kongsberg.com', 'Runar', 'Hjelle', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('kristian.kleiveland@km.kongsberg.com', 'Kristian', 'Kleiveland', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('per.kristian.furo@km.kongsberg.com', 'Per', 'Kristian Furo', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('martinus.loken@km.kongsberg.com', 'Martinus', 'Loken', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('birger.teien.evensen@km.kongsberg.com', 'Birger', 'Teien Evensen', 'Kongsberg Maritime', 'Noruega', 'km.kongsberg.com'),
  ('alaborde@labmarine.com', 'Alaborde', null, null, 'Francia', 'labmarine.com'),
  ('plaborde@labmarine.com', 'Plaborde', null, null, 'Francia', 'labmarine.com'),
  ('duncan.harris@maersksupplyservice.com', 'Duncan', 'Harris', 'Maersk Supply Service', 'Dinamarca', 'maersksupplyservice.com'),
  ('douglas.lagame@maersksupplyservice.com', 'Douglas', 'Lagame', 'Maersk Supply Service', 'Dinamarca', 'maersksupplyservice.com'),
  ('raymundo.pinones@maersksupply.com', 'Raymundo', 'Pinones', 'Maersk Supply Service', 'Dinamarca', 'maersksupply.com'),
  ('nick.scott@maersksupply.com', 'Nick', 'Scott', 'Maersk Supply Service', 'Dinamarca', 'maersksupply.com'),
  ('claus.sorensen@maersksupplyservice.com', 'Claus', 'Sorensen', 'Maersk Supply Service', 'Dinamarca', 'maersksupplyservice.com'),
  ('rafael.thome@maersksupply.com', 'Rafael', 'Thome', 'Maersk Supply Service', 'Dinamarca', 'maersksupply.com'),
  ('jazavala@marinsa.com.mx', 'Jazavala', null, null, 'Mexico', 'marinsa.com.mx'),
  ('jjzavala@marinsa.com.mx', 'Jjzavala', null, null, 'Mexico', 'marinsa.com.mx'),
  ('teresa.blanquet@marinsa.com.mx', 'Teresa', 'Blanquet', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('patricia.canquiz@marinsa.com.mx', 'Patricia', 'Canquiz', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('carlos.colina@marinsa.com.mx', 'Carlos', 'Colina', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('leyneth.marcano@marinsa.com.mx', 'Leyneth', 'Marcano', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('emily.roman@marinsa.com.mx', 'Emily', 'Roman', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('diogo.salomao@marinsa.com.mx', 'Diogo', 'Salomao', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('halina.urbina@marinsa.com.mx', 'Halina', 'Urbina', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('cristina.vazquez@marinsa.com.mx', 'Cristina', 'Vazquez', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('hugo.zimbron@marinsa.com.mx', 'Hugo', 'Zimbron', 'Marinsa', 'Mexico', 'marinsa.com.mx'),
  ('y.martins@maritimedevelopments.com', 'Y', 'Martins', 'Maritime Developments', 'Reino Unido', 'maritimedevelopments.com'),
  ('a.ievoli@marnavi.it', 'A', 'Ievoli', 'Marnavi', 'Italia', 'marnavi.it'),
  ('amarriott@mcdermott.com', 'Amarriott', null, null, 'Estados Unidos', 'mcdermott.com'),
  ('jtkennefick@mcdermott.com', 'Jtkennefick', null, null, 'Estados Unidos', 'mcdermott.com'),
  ('dp@mctinc.gr', '826', null, null, 'Grecia', 'mctinc.gr'),
  ('sv@mctinc.gr', '826', null, null, 'Grecia', 'mctinc.gr'),
  ('fredric.fuerth@mlog.com.br', 'Fredric', 'Fuerth', 'Mlog', 'Brasil', 'mlog.com.br'),
  ('leif@mmred.no', 'Leif', null, null, 'Noruega', 'mmred.no'),
  ('markus@mmred.no', 'Markus', null, null, 'Noruega', 'mmred.no'),
  ('roald@mmred.no', 'Roald', null, null, 'Noruega', 'mmred.no'),
  ('tore@mmred.no', 'Tore', null, null, 'Noruega', 'mmred.no'),
  ('tom.fairclough@mmaoffshore.com', 'Tom', 'Fairclough', 'MMA Offshore', 'Australia', 'mmaoffshore.com'),
  ('david.ross@mmaoffshore.com', 'David', 'Ross', 'MMA Offshore', 'Australia', 'mmaoffshore.com'),
  ('chartering@mokster.no', '860', null, null, 'Noruega', 'mokster.no'),
  ('atle.holgersen@mokster.no', 'Atle', 'Holgersen', 'Mokster Shipping', 'Noruega', 'mokster.no'),
  ('anne.jorunn.mokster@mokster.no', 'Anne', 'Jorunn Mokster', 'Mokster Shipping', 'Noruega', 'mokster.no'),
  ('nils.liaaen@mokster.no', 'Nils', 'Liaaen', 'Mokster Shipping', 'Noruega', 'mokster.no'),
  ('christian.dechsling@molgroup.com', 'Christian', 'Dechsling', 'MOL Group', 'Japon', 'molgroup.com'),
  ('yuto.shima@molgroup.net', 'Yuto', 'Shima', 'MOL Group', 'Japon', 'molgroup.net'),
  ('michael.gordon@northstarshipping.co.uk', 'Michael', 'Gordon', 'Northstar Shipping', 'Reino Unido', 'northstarshipping.co.uk'),
  ('kjell@nortrans.com', 'Kjell', null, null, 'Noruega', 'nortrans.com'),
  ('chartering@n-sea.com', '871', null, null, 'Paises Bajos', 'n-sea.com'),
  ('m.spijkers@n-sea.com', 'M', 'Spijkers', 'N-Sea', 'Paises Bajos', 'n-sea.com'),
  ('aldo.andrade@oceamar.com', 'Aldo', 'Andrade', 'Oceamar', 'Mexico', 'oceamar.com'),
  ('arnoldo.sanchez@oceamar.com', 'Arnoldo', 'Sanchez', 'Oceamar', 'Mexico', 'oceamar.com'),
  ('fabio.pereira@co.oceaninfinity.com', 'Fabio', 'Pereira', 'Ocean Infinity', 'Reino Unido', 'co.oceaninfinity.com'),
  ('kcormier2@oceaneering.com', '896', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('ajorr@oceaneering.com', 'Ajorr', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('bouverney@oceaneering.com', 'Bouverney', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('glopes@oceaneering.com', 'Glopes', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('gmatos@oceaneering.com', 'Gmatos', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('lpirie@oceaneering.com', 'Lpirie', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('rfrazao@oceaneering.com', 'Rfrazao', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('tcrespo@oceaneering.com', 'Tcrespo', null, null, 'Estados Unidos', 'oceaneering.com'),
  ('luis.assumpcao@oceanica.com.br', 'Luis', 'Assumpcao', 'Oceanica', 'Brasil', 'oceanica.com.br'),
  ('marcia.dias@oceanica.com.br', 'Marcia', 'Dias', 'Oceanica', 'Brasil', 'oceanica.com.br'),
  ('andre.arruda@oceanicasub.com.br', 'Andre', 'Arruda', 'Oceanica Sub', 'Brasil', 'oceanicasub.com.br'),
  ('leonardo.duran@oceanicasub.com', 'Leonardo', 'Duran', 'Oceanica Sub', 'Brasil', 'oceanicasub.com'),
  ('tesouraria@oceanpact.com', '913', null, null, 'Brasil', 'oceanpact.com'),
  ('comercial@oceanpact.com', '913', null, null, 'Brasil', 'oceanpact.com'),
  ('flavio@oceanpact.com', 'Flavio', null, null, 'Brasil', 'oceanpact.com'),
  ('lmoura@oceanpact.com', 'Lmoura', null, null, 'Brasil', 'oceanpact.com'),
  ('vitor.almeida@oceanpact.com', 'Vitor', 'Almeida', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('bernardo.assis@oceanpact.com', 'Bernardo', 'Assis', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('erik.cunha@oceanpact.com', 'Erik', 'Cunha', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('vitor.kume@oceanpact.com', 'Vitor', 'Kume', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('augusto.lopes@oceanpact.com', 'Augusto', 'Lopes', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('bruno.nader@oceanpact.com', 'Bruno', 'Nader', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('joao.serra@oceanpact.com', 'Joao', 'Serra', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('haroldo.solberg@oceanpact.com', 'Haroldo', 'Solberg', 'OceanPact', 'Brasil', 'oceanpact.com'),
  ('olav.meling@ohmeling.no', 'Olav', 'Meling', 'OH Meling', 'Noruega', 'ohmeling.no'),
  ('chartering@olympic.no', '964', null, null, 'Noruega', 'olympic.no'),
  ('frode.andreassen@olympic.no', 'Frode', 'Andreassen', 'Olympic Shipping', 'Noruega', 'olympic.no'),
  ('glenn.erik.valo@olympic.no', 'Glenn', 'Erik Valo', 'Olympic Shipping', 'Noruega', 'olympic.no'),
  ('bjorn.kvalsund@olympic.no', 'Bjorn', 'Kvalsund', 'Olympic Shipping', 'Noruega', 'olympic.no'),
  ('ulrsc@dongenergy.dk', 'Ulrsc', null, null, 'Dinamarca', 'dongenergy.dk'),
  ('commercial.rio@osmthome.com', '976', null, null, 'Noruega', 'osmthome.com'),
  ('brunno.felix@osmthome.com', 'Brunno', 'Felix', 'OSM Thome', 'Noruega', 'osmthome.com'),
  ('marcello.hess@osmthome.com', 'Marcello', 'Hess', 'OSM Thome', 'Noruega', 'osmthome.com'),
  ('chartering@ostensjo.no', '1366', null, null, 'Noruega', 'ostensjo.no'),
  ('kristian.vea@ostensjo.no', 'Kristian', 'Vea', 'Ostensjo Rederi', 'Noruega', 'ostensjo.no'),
  ('marketing@paccoffshore.com.sg', '985', null, null, 'Singapur', 'paccoffshore.com.sg'),
  ('shengzhi.chia@paccoffshore.com.sg', 'Shengzhi', 'Chia', 'PACC Offshore Services', 'Singapur', 'paccoffshore.com.sg'),
  ('kianyoung.lim@paccoffshore.com.sg', 'Kianyoung', 'Lim', 'PACC Offshore Services', 'Singapur', 'paccoffshore.com.sg'),
  ('mpadilla@paranalogistica.com.ar', 'Maximo', 'Padilla', 'Parana Logistica S.A.', 'Argentina', 'paranalogistica.com.ar'),
  ('raulgonzalez@parrotazulmx.com', 'Raulgonzalez', null, null, 'Mexico', 'parrotazulmx.com'),
  ('commercial@pelican-offshore.com', '1004', null, null, 'Singapur', 'pelican-offshore.com'),
  ('commercial.mena@pomaritime.com', '1007', null, null, 'Emiratos Arabes Unidos', 'pomaritime.com'),
  ('commercial@pomaritime.com', '1007', null, null, 'Emiratos Arabes Unidos', 'pomaritime.com'),
  ('matthew.callan@pomaritime.com', 'Matthew', 'Callan', 'PO Maritime', 'Emiratos Arabes Unidos', 'pomaritime.com'),
  ('shahrooz.kashani@pomaritime.com', 'Shahrooz', 'Kashani', 'PO Maritime', 'Emiratos Arabes Unidos', 'pomaritime.com'),
  ('antoine.troullier@pomaritime.com', 'Antoine', 'Troullier', 'PO Maritime', 'Emiratos Arabes Unidos', 'pomaritime.com'),
  ('offshore@posidoniashipping.com', '1020', null, null, 'Grecia', 'posidoniashipping.com'),
  ('ajs@posidoniashipping.com', 'Ajs', null, null, 'Grecia', 'posidoniashipping.com'),
  ('ani@posidoniashipping.com', 'Ani', null, null, 'Grecia', 'posidoniashipping.com'),
  ('fni@posidoniashipping.com', 'Fni', null, null, 'Grecia', 'posidoniashipping.com'),
  ('lmb@posidoniashipping.com', 'Lmb', null, null, 'Grecia', 'posidoniashipping.com'),
  ('nni@posidoniashipping.com', 'Nni', null, null, 'Grecia', 'posidoniashipping.com'),
  ('omp@promar-offshore.com', '1033', null, null, 'Noruega', 'promar-offshore.com'),
  ('j.sayer@rbbritishmarine.com', 'J', 'Sayer', 'RB British Marine', 'Reino Unido', 'rbbritishmarine.com'),
  ('bth@reachsubsea.no', 'Bth', null, null, 'Noruega', 'reachsubsea.no'),
  ('bwj@reachsubsea.no', 'Bwj', null, null, 'Noruega', 'reachsubsea.no'),
  ('igr@reachsubsea.no', 'Igr', null, null, 'Noruega', 'reachsubsea.no'),
  ('jal@reachsubsea.no', 'Jal', null, null, 'Noruega', 'reachsubsea.no'),
  ('jgi@reachsubsea.com', 'Jgi', null, null, 'Noruega', 'reachsubsea.com'),
  ('cleiver.moulin@reachsubsea.com', 'Cleiver', 'Moulin', 'Reach Subsea', 'Noruega', 'reachsubsea.com'),
  ('tor-andre@remoy.com', '1056', null, null, 'Noruega', 'remoy.com'),
  ('fredrik.remoy@remoffshore.no', 'Fredrik', 'Remoy', 'REM Offshore', 'Noruega', 'remoffshore.no'),
  ('helge@remoy-management.no', 'Helge', null, null, 'Noruega', 'remoy-management.no'),
  ('lidvar@remoy-management.no', 'Lidvar', null, null, 'Noruega', 'remoy-management.no'),
  ('sigurd@remoy-management.no', 'Sigurd', null, null, 'Noruega', 'remoy-management.no'),
  ('paa@remoyshipping.no', 'Paa', null, null, 'Noruega', 'remoyshipping.no'),
  ('tstrandenaes@remoyshipping.no', 'Tstrandenaes', null, null, 'Noruega', 'remoyshipping.no'),
  ('karl-johan.bakken@remoyshipping.no', 'Karl Johan', 'Bakken', 'Remoy Shipping', 'Noruega', 'remoyshipping.no'),
  ('bryan.hooper@reveroffshore.com', 'Bryan', 'Hooper', 'Rever Offshore', 'Noruega', 'reveroffshore.com'),
  ('barry.macleod@reveroffshore.com', 'Barry', 'Macleod', 'Rever Offshore', 'Noruega', 'reveroffshore.com'),
  ('chartering@rimorchiatori.it', '1087', null, null, 'Italia', 'rimorchiatori.it'),
  ('giacomo.gavarone@rimorchiatori.it', 'Giacomo', 'Gavarone', 'Rimorchiatori Riuniti', 'Italia', 'rimorchiatori.it'),
  ('andrea.mignone@rimorchiatori.it', 'Andrea', 'Mignone', 'Rimorchiatori Riuniti', 'Italia', 'rimorchiatori.it'),
  ('comercial@rionav.com.br', '1096', null, null, 'Brasil', 'rionav.com.br'),
  ('deepak.ghildiyal@safeen.ae', 'Deepak', 'Ghildiyal', 'Safeen (Abu Dhabi Ports)', 'Emiratos Arabes Unidos', 'safeen.ae'),
  ('dahlia.nasir@safeen.ae', 'Dahlia', 'Nasir', 'Safeen (Abu Dhabi Ports)', 'Emiratos Arabes Unidos', 'safeen.ae'),
  ('fraser.young@safeen.ae', 'Fraser', 'Young', 'Safeen (Abu Dhabi Ports)', 'Emiratos Arabes Unidos', 'safeen.ae'),
  ('jp@seashipping.no', '1110', null, null, 'Noruega', 'seashipping.no'),
  ('peeters@seacontractors.com', 'Bart', 'Peeters', 'Seacontractors', 'Paises Bajos', 'seacontractors.com'),
  ('jgellert@seacormarine.com', 'Jgellert', null, null, 'Estados Unidos', 'seacormarine.com'),
  ('jllorca@seacormarine.com', 'Jllorca', null, null, 'Estados Unidos', 'seacormarine.com'),
  ('madames@seacormarine.com', 'Madames', null, null, 'Estados Unidos', 'seacormarine.com'),
  ('pwulfers@seacormarine.com', 'Pwulfers', null, null, 'Estados Unidos', 'seacormarine.com'),
  ('adrian.geelmuyden@seatankersmgt.com', 'Adrian', 'Geelmuyden', 'Seatankers Management', 'Noruega', 'seatankersmgt.com'),
  ('bruno.burigo@seatrium.com', 'Bruno', 'Burigo', 'Seatrium', 'Singapur', 'seatrium.com'),
  ('renan.martini@seatrium.com', 'Renan', 'Martini', 'Seatrium', 'Singapur', 'seatrium.com'),
  ('chartering@siemoffshore.com', '1135', null, null, 'Noruega', 'siemoffshore.com'),
  ('comercial@siemoffshore.com', '1135', null, null, 'Noruega', 'siemoffshore.com'),
  ('kim.andre.henden@siemoffshore.com', 'Kim', 'Andre Henden', 'Siem Offshore', 'Noruega', 'siemoffshore.com'),
  ('thomas.b.kittelsen@siemoffshore.com', 'Thomas', 'B Kittelsen', 'Siem Offshore', 'Noruega', 'siemoffshore.com'),
  ('andreas.hageli@siemoffshore.com', 'Andreas', 'Hageli', 'Siem Offshore', 'Noruega', 'siemoffshore.com'),
  ('jahn.helge.bjornestad@siemoffshore.com', 'Jahn', 'Helge Bjornestad', 'Siem Offshore', 'Noruega', 'siemoffshore.com'),
  ('geir.lovrak@siemoffshore.com', 'Geir', 'Lovrak', 'Siem Offshore', 'Noruega', 'siemoffshore.com'),
  ('julio.souza@siemoffshore.com', 'Julio', 'Souza', 'Siem Offshore', 'Noruega', 'siemoffshore.com'),
  ('abaranov@silverburngroup.com', 'Abaranov', null, null, 'Reino Unido', 'silverburngroup.com'),
  ('thiago.guesse@sistac.com.br', 'Thiago', 'Guesse', 'SISTAC', 'Brasil', 'sistac.com.br'),
  ('carlos.madaleno@sistac.com.br', 'Carlos', 'Madaleno', 'SISTAC', 'Brasil', 'sistac.com.br'),
  ('romulo.pegado@sistac.com.br', 'Romulo', 'Pegado', 'SISTAC', 'Brasil', 'sistac.com.br'),
  ('jmr@skansi.fo', 'Jmr', null, null, 'Islas Feroe', 'skansi.fo'),
  ('commercial.csv@solstad.com', '1175', null, null, 'Noruega', 'solstad.com'),
  ('commercial.no@solstad.com', '1175', null, null, 'Noruega', 'solstad.com'),
  ('commercial@solstad.com', '1175', null, null, 'Noruega', 'solstad.com'),
  ('commercial.br@solstad.com', '1175', null, null, 'Noruega', 'solstad.com'),
  ('torstein.alvestad@solstad.com', 'Torstein', 'Alvestad', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('john.annat@solstad.com', 'John', 'Annat', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('jon.are.gummedal@solstad.com', 'Jon', 'Are Gummedal', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('adam.brown@solstad.com', 'Adam', 'Brown', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('andrew.coccoli@solstad.com', 'Andrew', 'Coccoli', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('caroline.dias@solstad.com', 'Caroline', 'Dias', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('anders.engeset@solstad.com', 'Anders', 'Engeset', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('aleksander.hansen@solstad.com', 'Aleksander', 'Hansen', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('ewan.hwang@solstad.com', 'Ewan', 'Hwang', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('hans.knut.skar@solstad.com', 'Hans', 'Knut Skar', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('anders.kolbeinsen@solstad.com', 'Anders', 'Kolbeinsen', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('kenneth.lande@solstad.com', 'Kenneth', 'Lande', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('inger.louise.molver@solstad.com', 'Inger', 'Louise Molver', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('felipe.meira@solstad.com', 'Felipe', 'Meira', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('bruna.mendonca@solstad.com', 'Bruna', 'Mendonca', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('trond.nilsen@solstad.com', 'Trond', 'Nilsen', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('kjetil.ramstad@solstad.com', 'Kjetil', 'Ramstad', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('jorn.remoy@solstad.com', 'Jorn', 'Remoy', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('guan.sheng.chai@solstad.com', 'Guan', 'Sheng Chai', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('lars.solstad@solstad.com', 'Lars', 'Solstad', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('keith.soutar@solstad.com', 'Keith', 'Soutar', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('john.steinar.olsen-sund@solstad.com', 'John', 'Steinar Olsen Sund', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('phil.stewart@solstad.com', 'Phil', 'Stewart', 'Solstad Offshore', 'Noruega', 'solstad.com'),
  ('elf@standard-etc.com', '1242', null, null, 'Reino Unido', 'standard-etc.com'),
  ('shamjith.n@stanford-marine.com', 'Shamjith', 'N', 'Stanford Marine', 'Emiratos Arabes Unidos', 'stanford-marine.com'),
  ('nilo.martins@subsea7.com', 'Nilo', 'Martins', 'Subsea 7', 'Luxemburgo / Noruega', 'subsea7.com'),
  ('ahowell@tdw.com', 'Ahowell', null, null, 'Estados Unidos', 'tdw.com'),
  ('binstone@tdw.com', 'Binstone', null, null, 'Estados Unidos', 'tdw.com'),
  ('corth@tdw.com', 'Corth', null, null, 'Estados Unidos', 'tdw.com'),
  ('jgorski@tdw.com', 'Jgorski', null, null, 'Estados Unidos', 'tdw.com'),
  ('jrynd@tdw.com', 'Jrynd', null, null, 'Estados Unidos', 'tdw.com'),
  ('mhandin@tdw.com', 'Mhandin', null, null, 'Estados Unidos', 'tdw.com'),
  ('mmancheski@tdw.com', 'Mmancheski', null, null, 'Estados Unidos', 'tdw.com'),
  ('pmiddleton@tdw.com', 'Pmiddleton', null, null, 'Estados Unidos', 'tdw.com'),
  ('qkneen@tdw.com', 'Qkneen', null, null, 'Estados Unidos', 'tdw.com'),
  ('twilson@tdw.com', 'Twilson', null, null, 'Estados Unidos', 'tdw.com'),
  ('leif.tarberg@tromsoffshore.no', 'Leif', 'Tarberg', 'Troms Offshore', 'Noruega', 'tromsoffshore.no'),
  ('alexandre@tstranship.com.br', 'Alexandre', null, null, 'Brasil', 'tstranship.com.br'),
  ('chartering@uos.ag', '1284', null, null, 'Alemania', 'uos.ag'),
  ('vt@uos.ag', '1284', null, null, 'Alemania', 'uos.ag'),
  ('hdw@uos.ag', '1284', null, null, 'Alemania', 'uos.ag'),
  ('l.kluever@uos.ag', 'L', 'Kluever', 'United Offshore Support (UOS)', 'Alemania', 'uos.ag'),
  ('kenneth.koh@vallianzholdings.com', 'Kenneth', 'Koh', 'Vallianz Holdings', 'Singapur', 'vallianzholdings.com'),
  ('gavin.tan@vallianzholdings.com', 'Gavin', 'Tan', 'Vallianz Holdings', 'Singapur', 'vallianzholdings.com'),
  ('daguilar@verdemaritime.com', 'Daguilar', null, null, 'Mexico', 'verdemaritime.com'),
  ('mmayoral@verdemaritime.com', 'Mmayoral', null, null, 'Mexico', 'verdemaritime.com'),
  ('astrid@vestlandoffshore.no', 'Astrid', null, null, 'Noruega', 'vestlandoffshore.no'),
  ('tore.kopland@vestlandoffshore.no', 'Tore', 'Kopland', 'Vestland Offshore', 'Noruega', 'vestlandoffshore.no'),
  ('arnstein.lystad@vestlandoffshore.no', 'Arnstein', 'Lystad', 'Vestland Offshore', 'Noruega', 'vestlandoffshore.no'),
  ('chartering@vikingsupply.com', '1312', null, null, 'Suecia', 'vikingsupply.com'),
  ('alv.johan.erikstad@vikingsupply.com', 'Alv', 'Johan Erikstad', 'Viking Supply Ships', 'Suecia', 'vikingsupply.com'),
  ('trond.myklebust@vikingsupply.com', 'Trond', 'Myklebust', 'Viking Supply Ships', 'Suecia', 'vikingsupply.com'),
  ('carlo.crovetto@it.vroonoffshore.com', 'Carlo', 'Crovetto', 'Vroon Offshore (Italia)', 'Paises Bajos', 'it.vroonoffshore.com'),
  ('thomas.sallavuard@nl.vroonoffshore.com', 'Thomas', 'Sallavuard', 'Vroon Offshore (Paises Bajos)', 'Paises Bajos', 'nl.vroonoffshore.com'),
  ('afc@wilsonsons.com.br', 'Afc', null, null, 'Brasil', 'wilsonsons.com.br'),
  ('nissa.dewi@wintermar.com', 'Nissa', 'Dewi', 'Wintermar Offshore', 'Indonesia', 'wintermar.com'),
  ('melissa.florita@wintermar.com', 'Melissa', 'Florita', 'Wintermar Offshore', 'Indonesia', 'wintermar.com'),
  ('sugiman.layanto@wintermar.com', 'Sugiman', 'Layanto', 'Wintermar Offshore', 'Indonesia', 'wintermar.com'),
  ('commercial@wsut.com.br', '1346', null, null, 'Brasil', 'wsut.com.br'),
  ('gustavo.machado@wsut.com.br', 'Gustavo', 'Machado', 'WSUT', 'Brasil', 'wsut.com.br'),
  ('alan.silva@wsut.com.br', 'Alan', 'Silva', 'WSUT', 'Brasil', 'wsut.com.br'),
  ('babak@zamiloffshore.com', 'Babak', null, null, 'Arabia Saudita', 'zamiloffshore.com'),
  ('sube@zamiloffshore.com', 'Sube', null, null, 'Arabia Saudita', 'zamiloffshore.com')
on conflict do nothing;

-- ------------------------------------------------------------
-- 3) Devolverle los acentos a los 15 valores que los tienen
-- ------------------------------------------------------------
update comercial.broker_contactos set empresa = U&'HP Shipping M\00E9xico' where empresa = 'HP Shipping Mexico';
update comercial.broker_contactos set empresa = U&'Ita\00FA BBA' where empresa = 'Itau BBA';
update comercial.broker_contactos set empresa = U&'M\00F8kster Shipping' where empresa = 'Mokster Shipping';
update comercial.broker_contactos set empresa = U&'Oce\00E2nica Sub' where empresa = 'Oceanica Sub';
update comercial.broker_contactos set empresa = U&'Oce\00E2nica' where empresa = 'Oceanica';
update comercial.broker_contactos set empresa = U&'\00D8stensj\00F8 Rederi' where empresa = 'Ostensjo Rederi';
update comercial.broker_contactos set empresa = U&'Paran\00E1 Log\00EDstica S.A.' where empresa = 'Parana Logistica S.A.';
update comercial.broker_contactos set empresa = U&'Rem\00F8y Shipping' where empresa = 'Remoy Shipping';
update comercial.broker_contactos set empresa = U&'Vroon Offshore (Pa\00EDses Bajos)' where empresa = 'Vroon Offshore (Paises Bajos)';
update comercial.broker_contactos set pais = U&'Azerbaiy\00E1n' where pais = 'Azerbaiyan';
update comercial.broker_contactos set pais = U&'Canad\00E1' where pais = 'Canada';
update comercial.broker_contactos set pais = U&'Emiratos \00C1rabes Unidos' where pais = 'Emiratos Arabes Unidos';
update comercial.broker_contactos set pais = U&'Jap\00F3n' where pais = 'Japon';
update comercial.broker_contactos set pais = U&'M\00E9xico' where pais = 'Mexico';
update comercial.broker_contactos set pais = U&'Pa\00EDses Bajos' where pais = 'Paises Bajos';

-- ------------------------------------------------------------
-- 4) RLS y grants · mismo criterio que el resto del esquema
-- ------------------------------------------------------------
alter table comercial.broker_contactos enable row level security;

drop policy if exists "authenticated_all_broker_contactos" on comercial.broker_contactos;
create policy "authenticated_all_broker_contactos" on comercial.broker_contactos
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on comercial.broker_contactos
  to authenticated, service_role;

-- ------------------------------------------------------------
-- Ver como quedo
-- ------------------------------------------------------------
select count(*)                                             as contactos,
       count(distinct pais)                                 as paises,
       count(distinct empresa)                              as empresas_nombradas,
       count(distinct dominio)                              as dominios,
       count(*) filter (where empresa is null)               as sin_empresa,
       count(*) filter (where apellido is null)              as sin_apellido
from comercial.broker_contactos;
