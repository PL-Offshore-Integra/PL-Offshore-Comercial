-- Los alcances del track record en castellano.
--
-- Las 43 frases distintas que hay en las 98 filas historicas, traducidas a
-- mano. No es un capricho: "Fleeting" en el Parana es armar convoyes de
-- barcazas, "Lightering" es alije y "Pre lay grapnel run" no se traduce
-- —es el nombre de la maniobra—. Un traductor automatico devuelve otra cosa.
--
-- Criterio: lo que en la industria se dice en ingles se deja en ingles
-- (stand by, flotel, spot, sheerleg, riser, FSRU, DSV, PLSE). Lo demas va en
-- castellano.
--
-- Se aplica por el texto en ingles, asi que se puede correr de nuevo despues
-- de importar filas nuevas: solo toca las que todavia no tienen traduccion.

update comercial.track_record t
set alcance_es = d.es
from (values
  ('Lightering Support Vessel',                      'Buque de apoyo al alije'),
  ('Salvage/Refloating',                             'Salvamento / reflotamiento'),
  ('Towing of sheerleg crane',                       'Remolque de grua sheerleg'),
  ('Supplies Delivery to Vessel',                    'Entrega de suministros a buque'),
  ('Crew Change',                                    'Cambio de tripulacion'),
  ('Oil Spill Response Vessel',                      'Buque de respuesta a derrames'),
  ('Crew Management',                                'Gestion de tripulaciones'),
  ('Iron Ore Barges Fleeting',                       'Armado de convoyes de barcazas de mineral de hierro'),
  ('Procurement',                                    'Compras y abastecimiento'),
  ('Salvage/Escort',                                 'Salvamento / escolta'),
  ('Salvage/Stand By',                               'Salvamento / stand by'),
  ('Seismic Support Services',                       'Servicios de apoyo a sismica'),
  ('Pre lay grapnel run (Cable Laying)',             'Pre lay grapnel run (tendido de cable)'),
  ('Procurement/Equipment',                          'Compras / equipamiento'),
  ('Salvage/Lightering',                             'Salvamento / alije'),
  ('Salvage/Towing',                                 'Salvamento / remolque'),
  ('Towing of Container Vessel',                     'Remolque de buque portacontenedores'),
  ('Towing of cutter dredger',                       'Remolque de draga de corte'),
  ('Accommodation/DSV during repairs',               'Alojamiento / buque de buceo durante reparaciones'),
  ('Anchor Handling to Transfer Station "Potiguar"', 'Manejo de anclas para la estacion de transferencia "Potiguar"'),
  ('Assistance to Mv Indianapolis',                  'Asistencia al Mv Indianapolis'),
  ('Dive Support / Salvage sunken pontoon',          'Apoyo a buceo / salvamento de ponton hundido'),
  ('Dive Support to F/V Marianne',                   'Apoyo a buceo para el F/V Marianne'),
  ('Diving Support/Flotel',                          'Apoyo a buceo / flotel'),
  ('Escort/Stand by',                                'Escolta / stand by'),
  ('Fleeting',                                       'Armado de convoyes'),
  ('Fleeting Barges',                                'Armado de convoyes de barcazas'),
  ('Fresh Water Delivery',                           'Entrega de agua dulce'),
  ('Fresh Water Delivery to Vessel',                 'Entrega de agua dulce a buque'),
  ('High Pressure Vaporizers swap FSRU',             'Cambio de vaporizadores de alta presion en FSRU'),
  ('Pontoons transport on deck',                     'Transporte de pontones sobre cubierta'),
  ('Pre lay grapnel run / PLSE (Cable Laying)',      'Pre lay grapnel run / PLSE (tendido de cable)'),
  ('Pre lay shore end (Cable Laying)',               'Pre lay shore end (tendido de cable)'),
  ('Salvage',                                        'Salvamento'),
  ('Sewer Risers Installation',                      'Instalacion de risers cloacales'),
  ('Stand by',                                       'Stand by'),
  ('Subsea Fiber Optic Recovery',                    'Recuperacion de fibra optica submarina'),
  ('Towing',                                         'Remolque'),
  ('Towing Fishing Vessel',                          'Remolque de buque pesquero'),
  ('Towing of scrap vessel',                         'Remolque de buque para desguace'),
  ('Towing unmanned dredger',                        'Remolque de draga sin tripulacion'),
  ('UW Gas Pipe survey',                             'Relevamiento de gasoducto submarino'),
  ('VISAS/Procurement',                              'Visas / compras')
) as d(en, es)
where t.alcance_en = d.en
  and t.alcance_es is null;

-- ------------------------------------------------------------
-- Que quedo sin traducir
-- ------------------------------------------------------------
select coalesce(alcance_en, '(sin alcance)') as sin_traducir, count(*) as filas
from comercial.track_record
where alcance_es is null
group by 1
order by 2 desc;
