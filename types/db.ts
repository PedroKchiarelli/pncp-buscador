// Tipos que espelham as colunas da tabela `licitacoes` no Supabase

export interface LicitacaoRow {
  numero_controle_pncp:       string;
  srp:                        boolean;
  ano_compra:                 number | null;
  sequencial_compra:          number | null;
  numero_compra:              string | null;
  processo:                   string | null;
  objeto_compra:              string;
  informacao_complementar:    string | null;
  data_inclusao:              string | null;
  data_publicacao_pncp:       string | null;
  data_atualizacao:           string | null;
  data_abertura_proposta:     string | null;
  data_encerramento_proposta: string | null;
  modalidade_id:              number | null;
  modalidade_nome:            string | null;
  situacao_compra_id:         number | null;
  situacao_compra_nome:       string | null;
  modo_disputa_id:            number | null;
  modo_disputa_nome:          string | null;
  tipo_instrumento_codigo:    number | null;
  tipo_instrumento_nome:      string | null;
  valor_total_estimado:       number | null;
  valor_total_homologado:     number | null;
  usuario_nome:               string | null;
  link_sistema_origem:        string | null;
  link_processo_eletronico:   string | null;
  justificativa_presencial:   string | null;
  emenda_parlamentar:         string | null;
  orgao_cnpj:                 string | null;
  orgao_razao_social:         string | null;
  orgao_poder_id:             string | null;
  orgao_esfera_id:            string | null;
  uf_sigla:                   string | null;
  uf_nome:                    string | null;
  municipio_nome:             string | null;
  codigo_ibge:                string | null;
  codigo_unidade:             string | null;
  nome_unidade:               string | null;
  amparo_legal_codigo:        number | null;
  amparo_legal_nome:          string | null;
  amparo_legal_descricao:     string | null;
  sincronizado_em:            string;
}
