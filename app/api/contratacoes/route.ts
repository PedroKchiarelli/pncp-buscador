// app/api/contratacoes/route.ts
// ============================================================
// Consulta licitações no Supabase com filtros SQL.
// Mantém o mesmo contrato de resposta (RespostaPaginada<Contratacao>)
// para não quebrar o frontend.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToContratacao } from '@/lib/mappers';
import type { LicitacaoRow } from '@/types/db';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const pagina    = Math.max(1, Number(sp.get('pagina') ?? '1'));
  const tamPagina = Math.min(100, Math.max(10, Number(sp.get('tamanhoPagina') ?? '50')));
  const offset    = (pagina - 1) * tamPagina;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('licitacoes') as any).select('*', { count: 'exact' });

  // Busca full-text (gerado pelo tsvector objeto_busca)
  const q = sp.get('q')?.trim();
  if (q) {
    query = query.textSearch('objeto_busca', q, { type: 'plain', config: 'portuguese_unaccent' });
  }

  // Modalidade
  const modalidade = sp.get('codigoModalidadeContratacao');
  if (modalidade) query = query.eq('modalidade_id', Number(modalidade));

  // Situação (1=Divulgada, 2=Revogada…)
  const situacao = sp.get('codigoSituacaoCompra');
  if (situacao) query = query.eq('situacao_compra_id', Number(situacao));

  // UF
  const uf = sp.get('ufSigla');
  if (uf) query = query.eq('uf_sigla', uf);

  // CNPJ do órgão
  const cnpj = sp.get('cnpjOrgao');
  if (cnpj) query = query.eq('orgao_cnpj', cnpj.replace(/\D/g, ''));

  // Código UASG
  const unidade = sp.get('codigoUnidade');
  if (unidade) query = query.eq('codigo_unidade', unidade);

  // Portal (idUsuario=1 → ComprasNet)
  const idUsuario = sp.get('idUsuario');
  if (idUsuario === '1') {
    query = query.or(
      'usuario_nome.ilike.%compras.gov%,usuario_nome.ilike.%comprasnet%,usuario_nome.ilike.%compras gov%',
    );
  }

  // Filtra apenas propostas abertas se explicitamente solicitado
  const somenteAtivas = sp.get('somenteAtivas') === 'true';
  if (somenteAtivas) {
    query = query.gte('data_encerramento_proposta', new Date().toISOString());
  }

  query = query
    .order('data_encerramento_proposta', { ascending: true })
    .range(offset, offset + tamPagina - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[/api/contratacoes]', error);
    return NextResponse.json(
      { erro: 'Erro ao consultar o banco de dados', detalhe: error.message },
      { status: 500 },
    );
  }

  const totalRegistros = count ?? 0;
  const totalPaginas   = Math.ceil(totalRegistros / tamPagina);
  const contratacoes   = ((data as LicitacaoRow[]) ?? []).map(rowToContratacao);

  return NextResponse.json(
    {
      data:             contratacoes,
      totalRegistros,
      totalPaginas,
      numeroPagina:     pagina,
      paginasRestantes: Math.max(0, totalPaginas - pagina),
      empty:            contratacoes.length === 0,
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    },
  );
}
