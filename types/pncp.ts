// ============================================================
// Types baseados nos campos reais da API PNCP
// Validado na Etapa 0 via testes diretos no endpoint
// ============================================================

export interface OrgaoEntidade {
  cnpj: string;
  razaoSocial: string;
  poderId: string;   // "E"=Executivo, "J"=Judiciário, "L"=Legislativo, "N"=Nenhum
  esferaId: string;  // "F"=Federal, "E"=Estadual, "M"=Municipal
}

export interface UnidadeOrgao {
  ufNome: string;
  codigoUnidade: string;
  nomeUnidade: string;
  ufSigla: string;
  municipioNome: string;
  codigoIbge: string;
}

export interface AmparoLegal {
  descricao: string;
  nome: string;
  codigo: number;
}

export interface Contratacao {
  srp: boolean;                          // Sistema de Registro de Preços
  orgaoEntidade: OrgaoEntidade;
  anoCompra: number;
  sequencialCompra: number;
  numeroControlePNCP: string;            // Ex: "75771477000170-1-000108/2026"
  numeroCompra: string;
  processo: string;
  objetoCompra: string;
  informacaoComplementar: string | null;
  dataInclusao: string;
  dataPublicacaoPncp: string;
  dataAtualizacao: string;
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  unidadeOrgao: UnidadeOrgao;
  amparoLegal: AmparoLegal;
  modalidadeId: number;
  modalidadeNome: string;
  situacaoCompraId: number;
  situacaoCompraNome: string;
  modoDisputaId: number;
  modoDisputaNome: string;               // "Aberto", "Aberto-Fechado"
  tipoInstrumentoConvocatorioCodigo: number;
  tipoInstrumentoConvocatorioNome: string;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  usuarioNome: string;                   // Nome do sistema/portal de origem
  linkSistemaOrigem: string | null;
  linkProcessoEletronico: string | null;
  justificativaPresencial: string | null;
  emendaParlamentar: string | null;
  fontesOrcamentarias: unknown[];
}

export interface RespostaPaginada<T> {
  data: T[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

export type RespostaContratacoes = RespostaPaginada<Contratacao>;

// ============================================================
// Parâmetros de busca — usados no frontend e no proxy
// ============================================================

export interface FiltrosBusca {
  q?: string;                          // Busca por palavra-chave no objeto
  codigoModalidadeContratacao?: number; // 6 = Pregão Eletrônico
  idUsuario?: number;                  // 1 = ComprasNet/Compras.gov.br
  codigoSituacaoCompra?: number;       // 1 = Divulgada, 2 = Revogada, etc.
  ufSigla?: string;                    // Filtro por UF
  cnpjOrgao?: string;                  // Filtro por CNPJ do órgão
  codigoUnidade?: string;              // Código UASG
  dataFinal?: string;                  // YYYYMMDD — padrão: hoje
  dataInicial?: string;                // YYYYMMDD — para endpoint publicacoes
  pagina?: number;
  tamanhoPagina?: number;              // Mínimo: 10
}

// ============================================================
// Modalidades conhecidas (confirmado no teste 0E)
// ============================================================

export const MODALIDADES = [
  { id: 1,  nome: 'Leilão - Eletrônico' },
  { id: 2,  nome: 'Diálogo Competitivo' },
  { id: 3,  nome: 'Concurso' },
  { id: 4,  nome: 'Concorrência - Eletrônica' },
  { id: 5,  nome: 'Concorrência - Presencial' },
  { id: 6,  nome: 'Pregão - Eletrônico' },
  { id: 7,  nome: 'Pregão - Presencial' },
  { id: 8,  nome: 'Dispensa' },
  { id: 9,  nome: 'Inexigibilidade' },
  { id: 10, nome: 'Manifestação de Interesse' },
  { id: 11, nome: 'Pré-qualificação' },
  { id: 12, nome: 'Credenciamento' },
  { id: 13, nome: 'Leilão - Presencial' },
  { id: 14, nome: 'Inaplicabilidade da Licitação' },
  { id: 15, nome: 'Chamada pública' },
] as const;

// Portais/sistemas identificados no campo usuarioNome
export const PORTAIS = [
  { id: 1,   nome: 'ComprasNet / Compras.gov.br' },
  { id: null, nome: 'Todos os portais' },
] as const;

// UFs brasileiras para filtro
export const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO',
  'MA','MG','MS','MT','PA','PB','PE','PI','PR',
  'RJ','RN','RO','RR','RS','SC','SE','SP','TO',
] as const;
