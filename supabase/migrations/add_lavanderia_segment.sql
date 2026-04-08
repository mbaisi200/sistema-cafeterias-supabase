-- =============================================================
-- Migration: Segmento Lavanderia + Seção "OS Lavanderia"
-- =============================================================

-- 1. Garante que a tabela segmento_secoes existe (usada pelo sistema mas ausente da migration original)
CREATE TABLE IF NOT EXISTS segmento_secoes (
  segmento_id UUID NOT NULL REFERENCES segmentos(id) ON DELETE CASCADE,
  secao_id UUID NOT NULL REFERENCES secoes_menu(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  PRIMARY KEY (segmento_id, secao_id)
);

-- 2. Cria o segmento "Lavanderia"
INSERT INTO segmentos (nome, nome_marca, descricao, icone, ativo)
VALUES (
  'Lavanderia',
  'Gestão Lavanderia',
  'Sistema de gestão para lavanderias: ordens de serviço de lavagem, secagem, passadoria e lavagem a seco com controle de peças, clientes e status em tempo real.',
  'WashingMachine',
  true
)
ON CONFLICT DO NOTHING;

-- 3. Cria a seção de menu "OS Lavanderia"
INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para)
VALUES (
  'os_lavanderia',
  'OS Lavanderia',
  'Ordens de serviço especializadas para lavanderias com controle de peças, tipos de serviço (lavar, secar, passar, seco) e dados de clientes.',
  'WashingMachine',
  '/admin/os-lavanderia',
  'principal',
  19,
  true,
  false,
  ARRAY['admin']
)
ON CONFLICT (chave) DO NOTHING;

-- 4. Vincula a seção "OS Lavanderia" ao segmento "Lavanderia"
INSERT INTO segmento_secoes (segmento_id, secao_id, ativo)
SELECT
  s.id,
  sm.id,
  true
FROM segmentos s
CROSS JOIN secoes_menu sm
WHERE s.nome = 'Lavanderia'
  AND sm.chave = 'os_lavanderia'
ON CONFLICT DO NOTHING;

-- 5. Também vincula seções obrigatórias ao segmento Lavanderia (Dashboard, PDV, Caixa)
INSERT INTO segmento_secoes (segmento_id, secao_id, ativo)
SELECT
  s.id,
  sm.id,
  true
FROM segmentos s
CROSS JOIN secoes_menu sm
WHERE s.nome = 'Lavanderia'
  AND sm.obrigatoria = true
  AND sm.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM segmento_secoes ss
    WHERE ss.segmento_id = s.id AND ss.secao_id = sm.id
  )
ON CONFLICT DO NOTHING;

-- 6. Para todos os OUTROS segmentos existentes, garante que "OS Lavanderia" está DESMARCADA (ativo=false)
INSERT INTO segmento_secoes (segmento_id, secao_id, ativo)
SELECT
  s.id,
  sm.id,
  false  -- desmarcada por padrão
FROM segmentos s
CROSS JOIN secoes_menu sm
WHERE s.nome != 'Lavanderia'
  AND sm.chave = 'os_lavanderia'
  AND sm.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM segmento_secoes ss
    WHERE ss.segmento_id = s.id AND ss.secao_id = sm.id
  )
ON CONFLICT DO NOTHING;
