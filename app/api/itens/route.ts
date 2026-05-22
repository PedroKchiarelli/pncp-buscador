// app/api/itens/route.ts
// Proxy para buscar itens de uma contratação no PNCP.
// Query params: cnpj, ano, sequencial

import { NextRequest, NextResponse } from 'next/server';
import { buscarItens } from '@/lib/pncp';

export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const cnpj       = sp.get('cnpj');
  const ano        = Number(sp.get('ano'));
  const sequencial = Number(sp.get('sequencial'));

  if (!cnpj || !ano || !sequencial) {
    return NextResponse.json({ erro: 'cnpj, ano e sequencial são obrigatórios' }, { status: 400 });
  }

  try {
    const itens = await buscarItens(cnpj, ano, sequencial);
    return NextResponse.json(itens, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
