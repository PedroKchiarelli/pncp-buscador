// app/api/sync/route.ts
// ============================================================
// Sincroniza licitações abertas do PNCP → Supabase.
// Deve ser chamado pelo Vercel Cron ou manualmente.
//
// Auth: Authorization: Bearer <SYNC_SECRET>
//       ou Authorization: Bearer <CRON_SECRET>  (Vercel injeta automaticamente)
//
// Query params:
//   maxPaginas   número    padrão: 20 (20 × 50 = 1.000 registros por chamada)
//   pagInicio    número    padrão: 1  (para paginar syncs grandes manualmente)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { buscarPublicacoes } from '@/lib/pncp';
import { createAdminClient } from '@/lib/supabase';
import { contratacaoToRow } from '@/lib/mappers';
import type { LicitacaoRow } from '@/types/db';

export const maxDuration = 60;

function autorizado(request: NextRequest): boolean {
  const syncSecret = process.env.SYNC_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (!syncSecret && !cronSecret) return true;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  return token === syncSecret || token === cronSecret;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBatch(admin: ReturnType<typeof createAdminClient>, rows: Omit<LicitacaoRow, 'sincronizado_em'>[]): Promise<void> {
  if (rows.length === 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('licitacoes') as any).upsert(rows, { onConflict: 'numero_controle_pncp' });
  if (error) throw new Error(`Supabase upsert: ${error.message}`);
}

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  const params      = request.nextUrl.searchParams;
  const maxPaginas  = Math.min(200, Math.max(1, Number(params.get('maxPaginas') ?? '100')));
  const pagInicio   = Math.max(1, Number(params.get('pagInicio') ?? '1'));

  const admin = createAdminClient();

  // Registra início do sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logData } = await (admin.from('sync_log') as any)
    .insert({ data_inicial: String(pagInicio), data_final: String(pagInicio + maxPaginas - 1) })
    .select('id')
    .single();

  const logId: number | null = logData?.id ?? null;

  let registrosUpserted  = 0;
  let paginasProcessadas = 0;
  let temMais            = false;

  try {
    // Primeira página para descobrir o total de páginas disponíveis
    // tamanhoPagina=10 é mais confiável no PNCP para janelas de data largas
    const TAM_PAG = 10;
    const primeira = await buscarPublicacoes({ pagina: pagInicio, tamanhoPagina: TAM_PAG });

    const totalDisponiveis = primeira.totalPaginas;
    const ultimaPagina     = Math.min(pagInicio + maxPaginas - 1, totalDisponiveis);
    temMais = ultimaPagina < totalDisponiveis;

    await upsertBatch(admin, primeira.data.map(contratacaoToRow));
    registrosUpserted  += primeira.data.length;
    paginasProcessadas  = 1;

    // Páginas restantes em lotes paralelos de 5
    const pagRestantes = Array.from(
      { length: ultimaPagina - pagInicio },
      (_, i) => pagInicio + i + 1,
    );

    for (let i = 0; i < pagRestantes.length; i += 5) {
      const lote = pagRestantes.slice(i, i + 5);
      const resultados = await Promise.allSettled(
        lote.map(p => buscarPublicacoes({ pagina: p, tamanhoPagina: TAM_PAG })),
      );

      // Para graciosamente em páginas inválidas (PNCP retorna erro além do limite)
      const sucesso = resultados.filter(r => r.status === 'fulfilled');
      if (sucesso.length === 0) { temMais = false; break; }

      const rows = sucesso.flatMap(r =>
        (r as PromiseFulfilledResult<typeof primeira>).value.data.map(contratacaoToRow),
      );
      await upsertBatch(admin, rows);
      registrosUpserted  += rows.length;
      paginasProcessadas += sucesso.length;

      if (sucesso.length < lote.length) { temMais = false; break; }
    }

    // Fecha log
    if (logId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('sync_log') as any).update({
        concluido_em:        new Date().toISOString(),
        registros_upserted:  registrosUpserted,
        paginas_processadas: paginasProcessadas,
        tem_mais:            temMais,
        status:              'concluido',
      }).eq('id', logId);
    }

    return NextResponse.json({
      status:    'ok',
      registros: registrosUpserted,
      paginas:   paginasProcessadas,
      temMais,
      ...(temMais && { proximaPagInicio: pagInicio + maxPaginas, dica: `Chame com ?pagInicio=${pagInicio + maxPaginas} para continuar` }),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    if (logId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('sync_log') as any).update({
        concluido_em: new Date().toISOString(),
        status:       'erro',
        erro:         msg,
      }).eq('id', logId);
    }
    console.error('[sync]', msg);
    return NextResponse.json({ status: 'erro', erro: msg }, { status: 500 });
  }
}
