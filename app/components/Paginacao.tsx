'use client';

interface Props {
  pagina: number;
  totalPaginas: number;
  onChange: (p: number) => void;
}

export default function Paginacao({ pagina, totalPaginas, onChange }: Props) {
  if (totalPaginas <= 1) return null;

  const btnStyle = (ativo: boolean, desabilitado?: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: ativo ? 'var(--accent)' : 'var(--surface)',
    color: ativo ? '#fff' : desabilitado ? 'var(--text-muted)' : 'var(--text-primary)',
    fontSize: '13px', fontWeight: ativo ? 600 : 400,
    cursor: desabilitado ? 'not-allowed' : 'pointer',
    opacity: desabilitado ? 0.5 : 1,
    transition: 'background 0.15s, border-color 0.15s',
    minWidth: '36px', textAlign: 'center',
  });

  // Gera lista de páginas visíveis (máx 7 botões)
  const paginas: (number | '...')[] = [];
  if (totalPaginas <= 7) {
    for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
  } else {
    paginas.push(1);
    if (pagina > 3) paginas.push('...');
    for (let i = Math.max(2, pagina - 1); i <= Math.min(totalPaginas - 1, pagina + 1); i++) paginas.push(i);
    if (pagina < totalPaginas - 2) paginas.push('...');
    paginas.push(totalPaginas);
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '24px 0', flexWrap: 'wrap' }}>
      <button onClick={() => onChange(pagina - 1)} disabled={pagina === 1} style={btnStyle(false, pagina === 1)}>
        ← Anterior
      </button>

      {paginas.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} style={{ padding: '6px 4px', color: 'var(--text-muted)' }}>…</span>
          : <button key={p} onClick={() => onChange(p as number)} style={btnStyle(p === pagina)}>
              {p}
            </button>
      )}

      <button onClick={() => onChange(pagina + 1)} disabled={pagina === totalPaginas} style={btnStyle(false, pagina === totalPaginas)}>
        Próxima →
      </button>
    </nav>
  );
}
