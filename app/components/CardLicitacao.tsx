'use client';

import type { Contratacao } from '@/types/pncp';
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
  const badge = badgeSituacao(item.situacaoCompraNome);
  const comprasNet = isComprasNet(item.usuarioNome);
  const encerramento = item.dataEncerramentoProposta
    ? new Date(item.dataEncerramentoProposta)
    : null;
  const encerrouHoje = encerramento
    ? encerramento.toDateString() === new Date().toDateString()
    : false;

  return (
    <article className="card fade-in" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)',
      transition: 'box-shadow 0.15s, border-color 0.15s',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
    }}
    >
      {/* Linha superior: badges + favorito */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {/* Badge situação */}
        <span style={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em',
          padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase',
          background: badge.cor === 'success' ? 'var(--success-bg)' : badge.cor === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)',
          color: badge.cor === 'success' ? 'var(--success)' : badge.cor === 'danger' ? 'var(--danger)' : 'var(--warning)',
        }}>{badge.label}</span>

        {/* Badge modalidade */}
        <span style={{
          fontSize: '11px', fontWeight: 500, padding: '3px 8px',
          borderRadius: '20px', background: 'var(--accent-light)', color: 'var(--accent)',
        }}>{item.modalidadeNome}</span>

        {/* Badge SRP */}
        {item.srp && (
          <span style={{
            fontSize: '11px', fontWeight: 500, padding: '3px 8px',
            borderRadius: '20px', background: 'var(--surface-2)', color: 'var(--text-secondary)',
          }}>SRP</span>
        )}

        {/* Badge ComprasNet */}
        {comprasNet && (
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 8px',
            borderRadius: '20px', background: '#e8f5e9', color: '#2e7d32',
          }}>ComprasNet</span>
        )}

        {/* Encerra hoje */}
        {encerrouHoje && (
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '3px 8px',
            borderRadius: '20px', background: '#fff3e0', color: '#e65100',
          }}>⏰ Encerra hoje</span>
        )}

        {/* Favorito — empurrado para direita */}
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
      <p style={{
        fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)',
        lineHeight: 1.55, marginBottom: '14px',
      }}>
        {item.objetoCompra}
      </p>

      {/* Grid de metadados */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '10px 24px',
        paddingTop: '14px',
        borderTop: '1px solid var(--border)',
      }}>
        <Meta label="Órgão" value={item.orgaoEntidade.razaoSocial} />
        <Meta label="Unidade" value={item.unidadeOrgao.nomeUnidade} />
        <Meta label="Município / UF" value={`${item.unidadeOrgao.municipioNome} — ${item.unidadeOrgao.ufSigla}`} />
        <Meta label="Esfera" value={esferaLabel(item.orgaoEntidade.esferaId)} />
        <Meta label="Valor estimado" value={formatarValor(item.valorTotalEstimado)} accent />
        <Meta label="Encerramento" value={formatarDataHora(item.dataEncerramentoProposta)} warning={encerrouHoje} />
        <Meta label="Processo" value={item.processo || '—'} mono />
        <Meta label="Nº PNCP" value={item.numeroControlePNCP} mono />
        <Meta label="Portal" value={item.usuarioNome || '—'} />
        <Meta label="Modo disputa" value={item.modoDisputaNome || '—'} />
      </div>

      {/* Link externo */}
      {item.linkSistemaOrigem && (
        <div style={{ marginTop: '14px' }}>
          <a
            href={item.linkSistemaOrigem}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px', fontWeight: 600, color: 'var(--accent)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            Abrir no sistema de origem ↗
          </a>
        </div>
      )}
    </article>
  );
}

function Meta({ label, value, accent, warning, mono }: {
  label: string; value: string;
  accent?: boolean; warning?: boolean; mono?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '12px',
        fontWeight: accent ? 600 : 400,
        fontFamily: mono ? 'monospace' : 'inherit',
        color: accent ? 'var(--accent)' : warning ? 'var(--warning)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }} title={value}>
        {value}
      </div>
    </div>
  );
}
