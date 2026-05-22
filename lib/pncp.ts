// ============================================================
// lib/pncp.ts — Serviço de acesso à API do PNCP
//
// Base URL confirmada na Etapa 0:
//   https://pncp.gov.br/api/consulta/v1  → contratações
//   https://pncp.gov.br/api/pncp/v1      → tabelas de domínio
//
// Endpoint funcional confirmado:
//   GET /contratacoes/proposta  → pregões com propostas em aberto
//
// Regras identificadas:
//   - tamanhoPagina mínimo: 10
//   - Sem autenticação para leitura
//   - idUsuario=1 → ComprasNet/Compras.gov.br
// ============================================================

import type { FiltrosBusca, RespostaContratacoes } from '@/types/pncp';

const BASE_CONSULTA = 'https://pncp.gov.br/api/consulta/v1';
const BASE_PNCP     = 'https://pncp.gov.br/api/pncp/v1';

const TAMANHO_PAGINA_PADRAO = 10;
const TAMANHO_PAGINA_MINIMO = 10;

// Formata data Date → YYYYMMDD esperado pela API
function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10).replace(/-/g, '');
}

function dataHoje(): string {
  return formatarData(new Date());
}

// Monta URLSearchParams a partir dos filtros, aplicando defaults
function montarParams(filtros: FiltrosBusca): URLSearchParams {
  const params = new URLSearchParams();

  const tamanhoPagina = Math.max(
    filtros.tamanhoPagina ?? TAMANHO_PAGINA_PADRAO,
    TAMANHO_PAGINA_MINIMO
  );

  params.set('pagina', String(filtros.pagina ?? 1));
  params.set('tamanhoPagina', String(tamanhoPagina));
  params.set('dataFinal', filtros.dataFinal ?? dataHoje());

  if (filtros.q)                             params.set('q', filtros.q);
  if (filtros.codigoModalidadeContratacao)   params.set('codigoModalidadeContratacao', String(filtros.codigoModalidadeContratacao));
  if (filtros.idUsuario)                     params.set('idUsuario', String(filtros.idUsuario));
  if (filtros.codigoSituacaoCompra)          params.set('codigoSituacaoCompra', String(filtros.codigoSituacaoCompra));
  if (filtros.ufSigla)                       params.set('ufSigla', filtros.ufSigla);
  if (filtros.cnpjOrgao)                     params.set('cnpjOrgao', filtros.cnpjOrgao);
  if (filtros.codigoUnidade)                 params.set('codigoUnidade', filtros.codigoUnidade);
  if (filtros.dataInicial)                   params.set('dataInicial', filtros.dataInicial);

  return params;
}

// ============================================================
// Busca contratações com propostas EM ABERTO (endpoint validado)
// Retorna pregões cuja dataEncerramentoProposta >= hoje
// ============================================================
export async function buscarContratacoes(
  filtros: FiltrosBusca = {}
): Promise<RespostaContratacoes> {
  const params = montarParams(filtros);
  const url = `${BASE_CONSULTA}/contratacoes/proposta?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
  } catch (e: unknown) {
    clearTimeout(timeout);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('PNCP API erro: timeout após 15 segundos. Tente remover alguns filtros.');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => '');
    throw new Error(`PNCP API erro ${resposta.status}: ${texto}`);
  }

  const texto = await resposta.text();
  try {
    return JSON.parse(texto);
  } catch {
    // PNCP às vezes retorna JSON truncado em páginas além do limite
    throw new Error(`PNCP resposta inválida (página inexistente ou limite atingido)`);
  }
}

// ============================================================
// Alias para sync — usa /proposta com dataFinal 90 dias à frente
// para capturar todas as licitações abertas, não só as de hoje.
// (dataFinal = limite máximo de dataEncerramentoProposta)
// ============================================================
export async function buscarPublicacoes(
  filtros: FiltrosBusca,
): Promise<RespostaContratacoes> {
  if (!filtros.dataFinal) {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    filtros = { ...filtros, dataFinal: formatarData(d) };
  }
  return buscarContratacoes(filtros);
}

// ============================================================
// Busca itens de uma contratação — sob demanda no card
// ============================================================
export async function buscarItens(
  cnpj: string,
  ano: number,
  sequencial: number,
): Promise<import('@/types/pncp').ItemLicitacao[]> {
  const url = `${BASE_PNCP}/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens?pagina=1&tamanhoPagina=500`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 10000);

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal:  controller.signal,
      next:    { revalidate: 300 },
    });
  } catch (e: unknown) {
    clearTimeout(timeout);
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Timeout ao buscar itens');
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (resposta.status === 404) return [];

  if (!resposta.ok) {
    throw new Error(`PNCP itens erro ${resposta.status}`);
  }

  const dados = await resposta.json();
  // API pode retornar array direto ou objeto paginado { data: [...] }
  return Array.isArray(dados) ? dados : (dados.data ?? []);
}

// ============================================================
// Busca tabela de modalidades (endpoint validado no teste 0E)
// ============================================================
export async function buscarModalidades() {
  const url = `${BASE_PNCP}/modalidades`;

  const resposta = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }, // cache de 1h — dado estático
  });

  if (!resposta.ok) {
    throw new Error(`PNCP modalidades erro ${resposta.status}`);
  }

  return resposta.json();
}

// ============================================================
// Utilitário: formatar valor em BRL
// ============================================================
export function formatarValor(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || valor === 0) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

// ============================================================
// Utilitário: formatar data ISO → dd/mm/yyyy hh:mm
// ============================================================
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

export function formatarDataCurta(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

// ============================================================
// Utilitário: verificar se uma contratação é do ComprasNet
// ============================================================
export function isComprasNet(usuarioNome: string): boolean {
  return usuarioNome?.toLowerCase().includes('compras') ?? false;
}
