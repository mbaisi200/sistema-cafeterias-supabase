-- =====================================================
-- MIGRATION: Adicionar campos NFE/NFCe completos em produtos
-- Data: 2024
-- Execute este script no SQL Editor do Supabase
-- =====================================================
-- 
-- Esta migration adiciona campos fiscais necessários para emissão de
-- NF-e e NFC-e diretamente no cadastro de produtos, evitando 
-- preenchimento manual a cada emissão.
--

-- =====================================================
-- 1. CAMPOS FISCAIS NFE/NFCE (adicionar novos)
-- =====================================================

-- CEST - Código Especificador da Substituição Tributária
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cest VARCHAR(7);
COMMENT ON COLUMN produtos.cest IS 'Código Especificador da Substituição Tributária - 7 dígitos';

-- CSOSN - Código de Situação da Operação no Simples Nacional
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS csosn VARCHAR(3) DEFAULT '102';
COMMENT ON COLUMN produtos.csosn IS 'Código de Situação da Operação no Simples Nacional - 3 dígitos (ex: 102, 103, 300, 400)';

-- Origem da mercadoria (conforme tabela IBGE)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS origem VARCHAR(1) DEFAULT '0';
COMMENT ON COLUMN produtos.origem IS 'Origem da mercadoria: 0=Nacional, 1=Importado direto, 2=Importado adquirido no mercado interno, 3=Nacional MF 40%, 4=Nacional MF 70%, 5=Nacional processo produtivo, 6=Importado processo produtivo, 7=Nacional MF 60%, 8=Nacional sem similar';

-- Unidade Tributável (diferente da unidade comercial)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS unidade_tributavel VARCHAR(6) DEFAULT 'UN';
COMMENT ON COLUMN produtos.unidade_tributavel IS 'Unidade de medida tributável para fins fiscais (UN, KG, LT, M, M2, M3, L, etc.)';

-- IPI - Imposto sobre Produtos Industrializados
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ipi_aliquota DECIMAL(5,2) DEFAULT 0;
COMMENT ON COLUMN produtos.ipi_aliquota IS 'Alíquota do IPI (Imposto sobre Produtos Industrializados) em percentual';

-- PIS - Programa de Integração Social
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS pis_aliquota DECIMAL(5,2) DEFAULT 0;
COMMENT ON COLUMN produtos.pis_aliquota IS 'Alíquota do PIS em percentual';

-- COFINS - Contribuição para Financiamento da Seguridade Social
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cofins_aliquota DECIMAL(5,2) DEFAULT 0;
COMMENT ON COLUMN produtos.cofins_aliquota IS 'Alíquota do COFINS em percentual';

-- =====================================================
-- 2. CAMPOS NFE/NFCE EXISTENTES (atualizar defaults)
-- =====================================================

-- NCM - Nomenclatura Comum do Mercosul (já existe, definir default)
ALTER TABLE produtos ALTER COLUMN ncm SET DEFAULT '00000000';
COMMENT ON COLUMN produtos.ncm IS 'Nomenclatura Comum do Mercosul - 8 dígitos (default: 00000000 = sem classificação)';

-- CST - Código de Situação Tributária (já existe, definir default)
ALTER TABLE produtos ALTER COLUMN cst SET DEFAULT '00';
COMMENT ON COLUMN produtos.cst IS 'Código de Situação Tributária - 2 ou 3 dígitos (00=Tributada integralmente)';

-- CFOP - Código Fiscal de Operações e Prestações (já existe, definir default)
ALTER TABLE produtos ALTER COLUMN cfop SET DEFAULT '5102';
COMMENT ON COLUMN produtos.cfop IS 'Código Fiscal de Operações e Prestações - 4 dígitos (5102=Venda tributada com ICMS)';

-- Código de Barras (já existe, garantir tamanho correto)
COMMENT ON COLUMN produtos.codigo_barras IS 'Código de barras do produto (EAN-13, EAN-8, GTIN-14)';

-- =====================================================
-- 3. CAMPOS iFOOD (já existem na migration anterior,
--    garantidos aqui para migração completa)
-- =====================================================
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS disponivel_ifood BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_external_code VARCHAR(100);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ifood_sync_status VARCHAR(20) DEFAULT 'not_synced';

COMMENT ON COLUMN produtos.disponivel_ifood IS 'Indica se o produto deve ser sincronizado com o iFood';
COMMENT ON COLUMN produtos.ifood_external_code IS 'Código externo usado para identificar o produto no iFood';
COMMENT ON COLUMN produtos.ifood_sync_status IS 'Status da sincronização com iFood: synced, pending, error, not_synced';

-- =====================================================
-- 4. ÍNDICES
-- =====================================================

-- Índice para NCM (busca por classificação fiscal)
CREATE INDEX IF NOT EXISTS idx_produtos_ncm ON produtos(ncm);

-- Índice para CEST (busca por substituição tributária)
CREATE INDEX IF NOT EXISTS idx_produtos_cest ON produtos(cest);

-- Índice para CFOP (busca por operação fiscal)
CREATE INDEX IF NOT EXISTS idx_produtos_cfop ON produtos(cfop);

-- Índice para código de barras (busca rápida por leitor)
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);

-- Índice para iFood sync
CREATE INDEX IF NOT EXISTS idx_produtos_disponivel_ifood ON produtos(disponivel_ifood);
CREATE INDEX IF NOT EXISTS idx_produtos_ifood_external_code ON produtos(ifood_external_code);

-- =====================================================
-- 5. ATUALIZAR DADOS EXISTENTES (padronizar)
-- =====================================================

-- Preencher NCM padrão para produtos que ainda não possuem
UPDATE produtos SET ncm = '00000000' WHERE ncm IS NULL;

-- Preencher CST padrão
UPDATE produtos SET cst = '00' WHERE cst IS NULL;

-- Preencher CFOP padrão (5102 = Venda de mercadoria com ICMS)
UPDATE produtos SET cfop = '5102' WHERE cfop IS NULL;

-- Preencher CSOSN padrão (102 = Tributada com permissão de crédito)
UPDATE produtos SET csosn = '102' WHERE csosn IS NULL;

-- Preencher origem padrão (0 = Nacional)
UPDATE produtos SET origem = '0' WHERE origem IS NULL;

-- Preencher unidade tributável padrão (UN = Unidade)
UPDATE produtos SET unidade_tributavel = 'UN' WHERE unidade_tributavel IS NULL;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
