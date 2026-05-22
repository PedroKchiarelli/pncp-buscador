-- ============================================================
-- PNCP Buscador — Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Extensão para full-text search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Configuração de FTS com remoção de acentos (português)
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS portuguese_unaccent (
  COPY = pg_catalog.portuguese
);
ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, portuguese_stem;

-- ============================================================
-- Tabela principal
-- ============================================================
CREATE TABLE IF NOT EXISTS licitacoes (
  -- Chave primária
  numero_controle_pncp       TEXT PRIMARY KEY,

  -- Dados básicos
  srp                        BOOLEAN NOT NULL DEFAULT FALSE,
  ano_compra                 INTEGER,
  sequencial_compra          INTEGER,
  numero_compra              TEXT,
  processo                   TEXT,
  objeto_compra              TEXT NOT NULL,
  informacao_complementar    TEXT,

  -- Datas
  data_inclusao              TIMESTAMPTZ,
  data_publicacao_pncp       TIMESTAMPTZ,
  data_atualizacao           TIMESTAMPTZ,
  data_abertura_proposta     TIMESTAMPTZ,
  data_encerramento_proposta TIMESTAMPTZ,

  -- Modalidade e situação
  modalidade_id              INTEGER,
  modalidade_nome            TEXT,
  situacao_compra_id         INTEGER,
  situacao_compra_nome       TEXT,
  modo_disputa_id            INTEGER,
  modo_disputa_nome          TEXT,
  tipo_instrumento_codigo    INTEGER,
  tipo_instrumento_nome      TEXT,

  -- Valores
  valor_total_estimado       NUMERIC,
  valor_total_homologado     NUMERIC,

  -- Portal / sistema de origem
  usuario_nome               TEXT,
  link_sistema_origem        TEXT,
  link_processo_eletronico   TEXT,
  justificativa_presencial   TEXT,
  emenda_parlamentar         TEXT,

  -- Órgão contratante (orgaoEntidade)
  orgao_cnpj                 TEXT,
  orgao_razao_social         TEXT,
  orgao_poder_id             TEXT,
  orgao_esfera_id            TEXT,

  -- Unidade (unidadeOrgao)
  uf_sigla                   TEXT,
  uf_nome                    TEXT,
  municipio_nome             TEXT,
  codigo_ibge                TEXT,
  codigo_unidade             TEXT,
  nome_unidade               TEXT,

  -- Amparo legal
  amparo_legal_codigo        INTEGER,
  amparo_legal_nome          TEXT,
  amparo_legal_descricao     TEXT,

  -- Controle de sync
  sincronizado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full-text search (gerado automaticamente)
  objeto_busca               TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('portuguese_unaccent',
      COALESCE(objeto_compra, '') || ' ' ||
      COALESCE(informacao_complementar, '') || ' ' ||
      COALESCE(orgao_razao_social, '') || ' ' ||
      COALESCE(nome_unidade, '') || ' ' ||
      COALESCE(municipio_nome, '')
    )
  ) STORED
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lic_modalidade   ON licitacoes (modalidade_id);
CREATE INDEX IF NOT EXISTS idx_lic_situacao     ON licitacoes (situacao_compra_id);
CREATE INDEX IF NOT EXISTS idx_lic_uf           ON licitacoes (uf_sigla);
CREATE INDEX IF NOT EXISTS idx_lic_encerramento ON licitacoes (data_encerramento_proposta);
CREATE INDEX IF NOT EXISTS idx_lic_publicacao   ON licitacoes (data_publicacao_pncp);
CREATE INDEX IF NOT EXISTS idx_lic_orgao_cnpj   ON licitacoes (orgao_cnpj);
CREATE INDEX IF NOT EXISTS idx_lic_unidade      ON licitacoes (codigo_unidade);
CREATE INDEX IF NOT EXISTS idx_lic_valor        ON licitacoes (valor_total_estimado);
CREATE INDEX IF NOT EXISTS idx_lic_usuario_nome ON licitacoes (usuario_nome);
CREATE INDEX IF NOT EXISTS idx_lic_busca        ON licitacoes USING GIN (objeto_busca);

-- ============================================================
-- Row Level Security — leitura pública, escrita só via service role
-- ============================================================
ALTER TABLE licitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura_publica" ON licitacoes
  FOR SELECT USING (true);

-- ============================================================
-- Tabela de log de sincronização
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id                   SERIAL PRIMARY KEY,
  iniciado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em         TIMESTAMPTZ,
  data_inicial         TEXT,
  data_final           TEXT,
  registros_upserted   INTEGER DEFAULT 0,
  paginas_processadas  INTEGER DEFAULT 0,
  tem_mais             BOOLEAN DEFAULT FALSE,
  status               TEXT DEFAULT 'em_andamento', -- 'concluido' | 'erro'
  erro                 TEXT
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leitura_publica_log" ON sync_log
  FOR SELECT USING (true);
