// app/api/sync/route.ts
// ============================================================
// Sincroniza dados do PNCP → Supabase.
// Deve ser chamado pelo Vercel Cron ou manualmente.
//
// Auth: Authorization: Bearer <SYNC_SECRET>
//       ou Authorization: Bearer <CRON_SECRET>  (Vercel injeta automaticamente)
//
// Query params:
//   dataInicial  YYYYMMDD  padrão: 7 dias atrás
//   dataFinal    YYYYMMDD  padrão: hoje
//   maxPaginas   número    padrão: 20 (20 × 50 = 1.000 registros por chamada)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { buscarPublicacoes } from '@/lib/pncp';
import { createAdminClient } from '@/lib/supabase';
import { contratacaoToRow } from '@/lib/mappers';
import type { LicitacaoRow } from '@/types/db';

export const maxDuration = 60;

function hoje(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

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
  const dataInicial = params.get('dataInicial') ?? diasAtras(7);
  const dataFinal   = params.get('dataFinal')   ?? hoje();
  const maxPaginas  = Math.min(50, Math.max(1, Number(params.get('maxPaginas') ?? '20')));

  const admin = createAdminClient();

  // Registra início do sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logData } = await (admin.from('sync_log') as any)
    .insert({ data_inicial: dataInicial, data_final: dataFinal })
    .select('id')
    .single();

  const logId: number | null = logData?.id ?? null;

  let registrosUpserted  = 0;
  let paginasProcessadas = 0;
  let temMais            = false;

  try {
    // Primeira página para descobrir o total
    const primeira = await buscarPublicacoes({ dataInicial, dataFinal, pagina: 1, tamanhoPagina: 50 });

    const totalPaginas = Math.min(primeira.totalPaginas, maxPaginas);
    temMais = primeira.totalPaginas > maxPaginas;

    await upsertBatch(admin, primeira.data.map(contratacaoToRow));
    registrosUpserted  += primeira.data.length;
    paginasProcessadas  = 1;

    // Páginas restantes em lotes paralelos de 5
    const pagRestantes = Array.from({ length: totalPaginas - 1 }, (_, i) => i + 2);

    for (let i = 0; i < pagRestantes.length; i += 5) {
      const lote      = pagRestantes.slice(i, i + 5);
      const resultados = await Promise.all(
        lote.map(p => buscarPublicacoes({ dataInicial, dataFinal, pagina: p, tamanhoPagina: 50 })),
      );
      const rows = resultados.flatMap(r => r.data.map(contratacaoToRow));
      await upsertBatch(admin, rows);
      registrosUpserted  += rows.length;
      paginasProcessadas += lote.length;
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
      dataInicial,
      dataFinal,
      temMais,
      ...(temMais && { dica: 'Chame novamente ajustando dataFinal para cobrir datas mais antigas' }),
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
