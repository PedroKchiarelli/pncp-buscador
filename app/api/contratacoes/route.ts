// app/api/contratacoes/route.ts
// ============================================================
// Proxy entre o frontend e a API do PNCP.
// Motivo: evitar CORS no browser, centralizar tratamento de erro,
// adicionar cache e permitir lógica extra no futuro (ex: favoritos).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { buscarContratacoes } from '@/lib/pncp';
import type { FiltrosBusca } from '@/types/pncp';

// Mapa de idUsuario → strings que aparecem no campo usuarioNome da API
const PORTAL_NOMES: Record<number, string[]> = {
  1: ['compras.gov', 'comprasnet', 'compras gov'],
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filtros: FiltrosBusca = {};

  const q = searchParams.get('q');
  if (q?.trim()) filtros.q = q.trim();

  const modalidade = searchParams.get('codigoModalidadeContratacao');
  if (modalidade) filtros.codigoModalidadeContratacao = Number(modalidade);

  // idUsuario: só passa para a API se NÃO houver q= (evita timeout do PNCP)
  const idUsuarioParam = searchParams.get('idUsuario');
  const idUsuario = idUsuarioParam ? Number(idUsuarioParam) : null;
  const filtrarPortalLocalmente = !!(idUsuario && filtros.q);

  if (idUsuario && !filtrarPortalLocalmente) {
    filtros.idUsuario = idUsuario;
  }

  const situacao = searchParams.get('codigoSituacaoCompra');
  if (situacao) filtros.codigoSituacaoCompra = Number(situacao);

  const uf = searchParams.get('ufSigla');
  if (uf) filtros.ufSigla = uf;

  const cnpj = searchParams.get('cnpjOrgao');
  if (cnpj) filtros.cnpjOrgao = cnpj.replace(/\D/g, '');

  const codigoUnidade = searchParams.get('codigoUnidade');
  if (codigoUnidade) filtros.codigoUnidade = codigoUnidade;

  const pagina = searchParams.get('pagina');
  filtros.pagina = pagina ? Math.max(1, Number(pagina)) : 1;

  const tamanhoPagina = searchParams.get('tamanhoPagina');
  filtros.tamanhoPagina = tamanhoPagina ? Math.max(10, Number(tamanhoPagina)) : 10;

  const dataFinal = searchParams.get('dataFinal');
  if (dataFinal) filtros.dataFinal = dataFinal;

  try {
    const dados = await buscarContratacoes(filtros);

    // Filtro local de portal quando q= e idUsuario= são usados juntos
    if (filtrarPortalLocalmente && idUsuario && dados.data) {
      const termos = PORTAL_NOMES[idUsuario] ?? [];
      if (termos.length > 0) {
        dados.data = dados.data.filter(item => {
          const nome = (item.usuarioNome ?? '').toLowerCase();
          return termos.some(t => nome.includes(t));
        });
        // Ajusta totais aproximados
        dados.totalRegistros = dados.data.length;
      }
    }

    return NextResponse.json(dados, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (erro) {
    console.error('[API /contratacoes]', erro);
    const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
    const statusCode = mensagem.includes('PNCP API erro') ? 502 : 500;

    return NextResponse.json(
      {
        erro: 'Falha ao consultar o PNCP',
        detalhe: mensagem,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
