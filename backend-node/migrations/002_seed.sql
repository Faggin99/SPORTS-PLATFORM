-- Default contents (tenant_id NULL = available to all)
INSERT INTO contents (id, tenant_id, name, abbreviation) VALUES
  (gen_random_uuid(), NULL, 'Bola Parada Ofensiva', 'BPO'),
  (gen_random_uuid(), NULL, 'Bola Parada Defensiva', 'BPD'),
  (gen_random_uuid(), NULL, 'Organização Ofensiva', 'OO'),
  (gen_random_uuid(), NULL, 'Organização Defensiva', 'OD'),
  (gen_random_uuid(), NULL, 'Transição Ofensiva', 'TO'),
  (gen_random_uuid(), NULL, 'Transição Defensiva', 'TD'),
  (gen_random_uuid(), NULL, 'Físico', 'FIS'),
  (gen_random_uuid(), NULL, 'Técnico', 'TEC'),
  (gen_random_uuid(), NULL, 'Tático', 'TAT'),
  (gen_random_uuid(), NULL, 'Recreativo', 'REC')
ON CONFLICT DO NOTHING;

-- Default stages
INSERT INTO stages (id, tenant_id, name) VALUES
  (gen_random_uuid(), NULL, 'Aquecimento'),
  (gen_random_uuid(), NULL, 'Parte Principal'),
  (gen_random_uuid(), NULL, 'Volta à Calma')
ON CONFLICT DO NOTHING;
