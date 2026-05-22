'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Contratacao, RespostaContratacoes } from '@/types/pncp';
import CardLicitacao from './components/CardLicitacao';
import PainelFiltros from './components/PainelFiltros';
import Paginacao from './components/Paginacao';

interface Filtros {
  q: string;
  modalidade: string;
  portal: string;
  uf: string;
}

const FILTROS_INICIAIS: Filtros = { q: '', modalidade: '6', portal: '', uf: '' };
const TAMANHO_PAGINA = 50;
const CHAVE_FAVORITOS = 'pncp_favoritos';

export default function HomePage() {
  const [montado, setMontado] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<RespostaContratacoes | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [abaSelecionada, setAbaSelecionada] = useState<'resultados' | 'favoritos'>('resultados');
  const [favoritosData, setFavoritosData] = useState<Contratacao[]>([]);
  const buscouInicial = useRef(false);

  // Garante que só roda no client
  useEffect(() => {
    setMontado(true);
    try {
      const raw = localStorage.getItem(CHAVE_FAVORITOS);
      if (raw) setFavoritos(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  const buscar = useCallback(async (f: Filtros, p: number) => {
    setCarregando(true);
    setErro(null);
    const params = new URLSearchParams();
    params.set('tamanhoPagina', String(TAMANHO_PAGINA));
    params.set('pagina', String(p));
    if (f.q)          params.set('q', f.q);
    if (f.modalidade) params.set('codigoModalidadeContratacao', f.modalidade);
    if (f.portal)     params.set('idUsuario', f.portal);
    if (f.uf)         params.set('ufSigla', f.uf);
    try {
      const res = await fetch('/api/contratacoes?' + params.toString());
      const dados = await res.json();
      if (!res.ok || dados.erro) {
        setErro(dados.detalhe ?? dados.erro ?? 'Erro ao consultar o PNCP');
        setResultado(null);
      } else {
        setResultado(dados);
      }
    } catch (e) {
      setErro('Nao foi possivel conectar ao servidor. Verifique se o servidor esta rodando.');
      setResultado(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Busca inicial — só uma vez após montar
  useEffect(() => {
    if (montado && !buscouInicial.current) {
      buscouInicial.current = true;
      buscar(FILTROS_INICIAIS, 1);
    }
  }, [montado, buscar]);

  const handleBuscar = () => {
    setPagina(1);
    buscar(filtros, 1);
    setAbaSelecionada('resultados');
  };

  const handleLimpar = () => {
    setFiltros(FILTROS_INICIAIS);
    setPagina(1);
    buscar(FILTROS_INICIAIS, 1);
  };

  const handlePagina = (p: number) => {
    setPagina(p);
    buscar(filtros, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorito = useCallback((id: string, item?: Contratacao) => {
    setFavoritos(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) {
        novo.delete(id);
        setFavoritosData(fd => fd.filter(f => f.numeroControlePNCP !== id));
      } else {
        novo.add(id);
        if (item) setFavoritosData(fd => [item, ...fd.filter(f => f.numeroControlePNCP !== id)]);
      }
      try { localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify([...novo])); } catch {}
      return novo;
    });
  }, []);

  // Enquanto não montou no client, mostra tela em branco simples (evita hydration mismatch)
  if (!montado) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando...</p>
      </div>
    );
  }

  const itens = resultado?.data ?? [];
  const totalPaginas = resultado?.totalPaginas ?? 0;
  const totalRegistros = resultado?.totalRegistros ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 32px', position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', height: '56px', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>P</span>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>PNCP Buscador</span>
          </div>
          <nav style={{ display: 'flex', gap: '2px', height: '100%', alignItems: 'stretch' }}>
            {(['resultados', 'favoritos'] as const).map(aba => (
              <button key={aba} onClick={() => setAbaSelecionada(aba)} style={{
                padding: '0 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: abaSelecionada === aba ? 600 : 400,
                color: abaSelecionada === aba ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: abaSelecionada === aba ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'color 0.15s',
              }}>
                {aba === 'favoritos'
                  ? 'Favoritos' + (favoritos.size > 0 ? ' (' + favoritos.size + ')' : '')
                  : 'Resultados'}
              </button>
            ))}
          </nav>
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
            Portal Nacional de Contratacoes Publicas
          </div>
        </div>
      </header>

      {/* Corpo */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {abaSelecionada === 'resultados' && (
          <PainelFiltros
            filtros={filtros}
            total={totalRegistros}
            carregando={carregando}
            onChange={setFiltros}
            onBuscar={handleBuscar}
            onLimpar={handleLimpar}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ABA FAVORITOS */}
          {abaSelecionada === 'favoritos' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Favoritos</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  {favoritos.size === 0 ? 'Nenhuma licitacao salva ainda.' : favoritos.size + ' salva(s)'}
                </p>
              </div>
              {favoritosData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>☆</div>
                  <p>Clique na estrela em qualquer licitacao para salva-la aqui.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {favoritosData.map(item => (
                    <CardLicitacao
                      key={item.numeroControlePNCP}
                      item={item}
                      favorito={favoritos.has(item.numeroControlePNCP)}
                      onToggleFavorito={id => toggleFavorito(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA RESULTADOS */}
          {abaSelecionada === 'resultados' && (
            <div>
              {/* Erro */}
              {erro && !carregando && (
                <div style={{
                  padding: '16px 20px', background: 'var(--danger-bg)',
                  border: '1px solid #fca5a5', borderRadius: 'var(--radius-lg)',
                  color: 'var(--danger)', marginBottom: '20px',
                }}>
                  <strong>Erro ao consultar o PNCP</strong>
                  <p style={{ marginTop: '4px', fontSize: '12px' }}>{erro}</p>
                </div>
              )}

              {/* Skeleton loading */}
              {carregando && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
                    }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <span className="skeleton" style={{ width: '60px', height: '22px' }} />
                        <span className="skeleton" style={{ width: '120px', height: '22px' }} />
                      </div>
                      <span className="skeleton" style={{ width: '100%', height: '16px', marginBottom: '8px' }} />
                      <span className="skeleton" style={{ width: '70%', height: '16px', marginBottom: '16px' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                        {[1,2,3,4,5,6,7,8].map(j => (
                          <div key={j}>
                            <span className="skeleton" style={{ width: '60%', height: '10px', marginBottom: '4px' }} />
                            <span className="skeleton" style={{ width: '90%', height: '12px' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sem resultados */}
              {!carregando && !erro && itens.length === 0 && (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                  <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>Nenhuma licitacao encontrada</p>
                  <p style={{ fontSize: '13px' }}>Tente ajustar os filtros.</p>
                </div>
              )}

              {/* Resultados */}
              {!carregando && itens.length > 0 && (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Pagina <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
                    {' · '}
                    <strong>{itens.length}</strong> de <strong>{totalRegistros.toLocaleString('pt-BR')}</strong> registros
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {itens.map(item => (
                      <CardLicitacao
                        key={item.numeroControlePNCP}
                        item={item}
                        favorito={favoritos.has(item.numeroControlePNCP)}
                        onToggleFavorito={id => toggleFavorito(id, item)}
                      />
                    ))}
                  </div>
                  <Paginacao pagina={pagina} totalPaginas={totalPaginas} onChange={handlePagina} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
