'use client';

import { MODALIDADES, UFS } from '@/types/pncp';

interface Filtros {
  q: string;
  modalidade: string;
  portal: string;
  uf: string;
  somenteAtivas: boolean;
}

interface Props {
  filtros: Filtros;
  total: number;
  carregando: boolean;
  onChange: (f: Filtros) => void;
  onBuscar: () => void;
  onLimpar: () => void;
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239a9890' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '28px',
};

export default function PainelFiltros({ filtros, total, carregando, onChange, onBuscar, onLimpar }: Props) {
  const set = (key: keyof Filtros) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...filtros, [key]: e.target.value });

  const temFiltros = filtros.q || filtros.modalidade || filtros.portal || filtros.uf || filtros.somenteAtivas;

  return (
    <aside style={{
      width: '280px', flexShrink: 0,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      boxShadow: 'var(--shadow-sm)',
      height: 'fit-content',
      position: 'sticky',
      top: '24px',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Filtros
        </h2>
        {total > 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {total.toLocaleString('pt-BR')} resultado{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Busca por palavra-chave */}
      <div style={{ marginBottom: '16px' }}>
        <Label>Palavra-chave</Label>
        <input
          type="text"
          placeholder="Ex: válvula, medicamento, TI..."
          value={filtros.q}
          onChange={set('q')}
          onKeyDown={e => e.key === 'Enter' && onBuscar()}
          style={{
            width: '100%', padding: '8px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '13px', color: 'var(--text-primary)',
            background: 'var(--surface)',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Modalidade */}
      <div style={{ marginBottom: '16px' }}>
        <Label>Modalidade</Label>
        <select value={filtros.modalidade} onChange={set('modalidade')} style={selectStyle}>
          <option value="">Todas</option>
          {MODALIDADES.map(m => (
            <option key={m.id} value={String(m.id)}>{m.nome}</option>
          ))}
        </select>
      </div>

      {/* Portal */}
      <div style={{ marginBottom: '16px' }}>
        <Label>Portal</Label>
        <select value={filtros.portal} onChange={set('portal')} style={selectStyle}>
          <option value="">Todos os portais</option>
          <option value="1">ComprasNet / Compras.gov.br</option>
        </select>
      </div>

      {/* UF */}
      <div style={{ marginBottom: '24px' }}>
        <Label>Estado (UF)</Label>
        <select value={filtros.uf} onChange={set('uf')} style={selectStyle}>
          <option value="">Todos</option>
          {UFS.map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
      </div>

      {/* Toggle apenas abertas */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
        }}>
          <input
            type="checkbox"
            checked={filtros.somenteAtivas}
            onChange={e => onChange({ ...filtros, somenteAtivas: e.target.checked })}
            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
          Apenas com propostas abertas
        </label>
      </div>

      {/* Botões */}
      <button
        onClick={onBuscar}
        disabled={carregando}
        style={{
          width: '100%', padding: '10px',
          background: carregando ? 'var(--border)' : 'var(--accent)',
          color: carregando ? 'var(--text-muted)' : '#fff',
          border: 'none', borderRadius: 'var(--radius)',
          fontSize: '13px', fontWeight: 600, cursor: carregando ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
          marginBottom: '8px',
        }}
        onMouseEnter={e => !carregando && ((e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')}
        onMouseLeave={e => !carregando && ((e.currentTarget as HTMLElement).style.background = 'var(--accent)')}
      >
        {carregando ? 'Buscando...' : 'Buscar'}
      </button>

      {temFiltros && (
        <button
          onClick={onLimpar}
          style={{
            width: '100%', padding: '8px',
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: '12px',
            color: 'var(--text-secondary)', cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
        >
          Limpar filtros
        </button>
      )}
    </aside>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: '11px', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      color: 'var(--text-muted)', marginBottom: '6px',
    }}>
      {children}
    </label>
  );
}
