'use client';

import { useState } from 'react';
import type { Contratacao, ItemLicitacao } from '@/types/pncp';
import { formatarValor, formatarDataHora, isComprasNet } from '@/lib/pncp';

interface Props {
  item: Contratacao;
  favorito: boolean;
  onToggleFavorito: (id: string) => void;
}

function badgeSituacao(situacao: string) {
  const s = situacao?.toLowerCase() ?? '';
  if (s.includes('divulg'))  return { cor: 'success', label: 'Aberta' };
  if (s.includes('revog'))   return { cor: 'danger',  label: 'Revogada' };
  if (s.includes('homolog')) return { cor: 'warning', label: 'Homologada' };
  if (s.includes('suspens')) return { cor: 'warning', label: 'Suspensa' };
  return { cor: 'muted', label: situacao };
}

function esferaLabel(esfera: string) {
  const map: Record<string, string> = { F: 'Federal', E: 'Estadual', M: 'Municipal', D: 'Distrital' };
  return map[esfera] ?? esfera;
}

export default function CardLicitacao({ item, favorito, onToggleFavorito }: Props) {
  const badge      = badgeSituacao(item.situacaoCompraNome);
  const comprasNet = isComprasNet(item.usuarioNome);
  const encerramento = item.dataEncerramentoProposta ? new Date(item.dataEncerramentoProposta) : null;
  const encerrouHoje = encerramento ? encerramento.toDateString() === new Date().toDateString() : false;

  const [expandido,    setExpandido]    = useState(false);
  const [itens,        setItens]        = useState<ItemLicitacao[] | null>(null);
  const [loadingItens, setLoadingItens] = useState(false);
  const [erroItens,    setErroItens]    = useState<string | null>(null);

  async function toggleItens() {
    if (expandido) { setExpandido(false); return; }
    setExpandido(true);
    if (itens !== null) return; // já carregou

    setLoadingItens(true);
    setErroItens(null);
    try {
      const params = new URLSearchParams({
        cnpj:       item.orgaoEntidade.cnpj,
        ano:        String(item.anoCompra),
        sequencial: String(item.sequencialCompra),
      });
      const res  = await fetch(`/api/itens?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao carregar itens');
      setItens(data);
    } catch (e) {
      setErroItens(e instanceof Error ? e.message : 'Erro desconhecido');
      setItens([]);
    } finally {
      setLoadingItens(false);
    }
  }

  return (
    <article
      className="card fade-in"
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow    = 'var(--shadow-md)';
        (e.currentTarget as HTMLElement).style.borderColor  = 'var(--border-strong)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow    = 'var(--shadow-sm)';
        (e.currentTarget as HTMLElement).style.borderColor  = 'var(--border)';
      }}
    >
      {/* Linha superior: badges + favorito */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
          padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase',
          background: badge.cor === 'success' ? 'var(--success-bg)' : badge.cor === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)',
          color:      badge.cor === 'success' ? 'var(--success)'    : badge.cor === 'danger' ? 'var(--danger)'    : 'var(--warning)',
        }}>{badge.label}</span>

        <span style={{
          fontSize: '11px', fontWeight: 500, padding: '3px 8px',
          borderRadius: '20px', background: 'var(--accent-light)', color: 'var(--accent)',
        }}>{item.modalidadeNome}</span>

        {item.srp && (
          <span style={{
            fontSize: '11px', fontWeight: 500, padding: '3px 8px',
            borderRadius: '20px', background: 'var(--surface-2)', color: 'var(--text-secondary)',
          }}>SRP</span>
        )}

        {comprasNet && (
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 8px',
            borderRadius: '20px', background: '#e8f5e9', color: '#2e7d32',
          }}>ComprasNet</span>
        )}

        {encerrouHoje && (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 8px',
            borderRadius: '20px', background: '#fff3e0', color: '#e65100',
          }}>Encerra hoje</span>
        )}

        <button
          onClick={() => onToggleFavorito(item.numeroControlePNCP)}
          title={favorito ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '18px', lineHeight: 1,
            color: favorito ? '#f59e0b' : 'var(--border-strong)',
            transition: 'color 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {favorito ? '★' : '☆'}
        </button>
      </div>

      {/* Objeto */}
      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: '14px' }}>
        {item.objetoCompra}
      </p>

      {/* Grid de metadados */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '10px 24px', paddingTop: '14px', borderTop: '1px solid var(--border)',
      }}>
        <Meta label="Órgão"         value={item.orgaoEntidade.razaoSocial} />
        <Meta label="Unidade"       value={item.unidadeOrgao.nomeUnidade} />
        <Meta label="Município / UF" value={`${item.unidadeOrgao.municipioNome} — ${item.unidadeOrgao.ufSigla}`} />
        <Meta label="Esfera"        value={esferaLabel(item.orgaoEntidade.esferaId)} />
        <Meta label="Valor estimado" value={formatarValor(item.valorTotalEstimado)} accent />
        <Meta label="Encerramento"  value={formatarDataHora(item.dataEncerramentoProposta)} warning={encerrouHoje} />
        <Meta label="Processo"      value={item.processo || '—'} mono />
        <Meta label="Nº PNCP"       value={item.numeroControlePNCP} mono />
        <Meta label="Portal"        value={item.usuarioNome || '—'} />
        <Meta label="Modo disputa"  value={item.modoDisputaNome || '—'} />
      </div>

      {/* Rodapé: link externo + botão itens */}
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {item.linkSistemaOrigem && (
          <a
            href={item.linkSistemaOrigem}
            target="_blank" rel="noopener noreferrer"
            style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--accent)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            Abrir no sistema de origem ↗
          </a>
        )}

        <button
          onClick={toggleItens}
          style={{
            fontSize: '12px', fontWeight: 600, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-secondary)', padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          {expandido ? 'Ocultar itens ▲' : 'Ver itens ▼'}
        </button>
      </div>

      {/* Seção de itens */}
      {expandido && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {loadingItens && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Carregando itens...</p>
          )}

          {erroItens && (
            <p style={{ fontSize: '12px', color: 'var(--danger)' }}>Erro: {erroItens}</p>
          )}

          {!loadingItens && itens !== null && itens.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum item encontrado.</p>
          )}

          {!loadingItens && itens && itens.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Descrição', 'Tipo', 'Qtd', 'Unid.', 'Vl. Unit. Est.', 'Total Est.'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 8px', fontSize: '10px',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: 'var(--text-muted)', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => (
                    <tr key={it.numeroItem} style={{
                      borderBottom: '1px solid var(--border)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                    }}>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {it.numeroItem}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-primary)', maxWidth: '320px' }}>
                        {it.descricao}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {it.materialOuServico === 'M' ? 'Material' : it.materialOuServico === 'S' ? 'Serviço' : it.materialOuServico}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {it.quantidade?.toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {it.unidadeMedida || '—'}
                      </td>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', textAlign: 'right',
                        color: it.orcamentoSigiloso ? 'var(--text-muted)' : 'var(--accent)', fontWeight: 500 }}>
                        {it.orcamentoSigiloso ? 'Sigiloso' : formatarValor(it.valorUnitarioEstimado)}
                      </td>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', textAlign: 'right',
                        color: it.orcamentoSigiloso ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                        {it.orcamentoSigiloso ? '—' : formatarValor(it.valorTotal ?? (it.valorUnitarioEstimado != null ? it.valorUnitarioEstimado * it.quantidade : null))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {itens.length} item{itens.length !== 1 ? 'ns' : ''} · fonte: PNCP
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Meta({ label, value, accent, warning, mono }: {
  label: string; value: string; accent?: boolean; warning?: boolean; mono?: boolean;
}) {
  return (
    <div>
      <div style={{
        fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '2px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '12px', fontWeight: accent ? 600 : 400,
        fontFamily: mono ? 'monospace' : 'inherit',
        color: accent ? 'var(--accent)' : warning ? 'var(--warning)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }} title={value}>
        {value}
      </div>
    </div>
  );
}
