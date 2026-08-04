// Esquema visual da escalação no campo/quadra.
// Lógica de posicionamento mora em lib/lineupLayout.js (compartilhada com o PDF).

import { computeLineup, readJersey } from '../../lib/lineupLayout';

// ---------- Componentes de campo por modalidade ----------
function FutsalCourt() {
  // Quadra cobalto sólida com marcações brancas (estilo padrão de futsal).
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="futsalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="150" fill="url(#futsalGrad)" />
      {/* Linhas brancas */}
      <g stroke="#ffffff" strokeWidth="0.6" fill="none" opacity="0.92">
        {/* Borda */}
        <rect x="3" y="3" width="94" height="144" />
        {/* Meio de campo + círculo central */}
        <line x1="3" y1="75" x2="97" y2="75" />
        <circle cx="50" cy="75" r="9" />
        <circle cx="50" cy="75" r="0.9" fill="#ffffff" />
        {/* Área (D) inferior — nossa */}
        <path d="M 22 147 A 28 28 0 0 1 78 147" />
        {/* Área (D) superior — adversária */}
        <path d="M 22 3 A 28 28 0 0 0 78 3" />
        {/* Marca do pênalti (6m) — pequeno X */}
        <circle cx="50" cy="135" r="0.9" fill="#ffffff" />
        <circle cx="50" cy="15"  r="0.9" fill="#ffffff" />
        {/* Marca do segundo pênalti (10m) */}
        <circle cx="50" cy="119" r="0.9" fill="#ffffff" />
        <circle cx="50" cy="31"  r="0.9" fill="#ffffff" />
        {/* Gols (pequenos retângulos brancos cheios) */}
        <rect x="44" y="1" width="12" height="2" fill="#ffffff" />
        <rect x="44" y="147" width="12" height="2" fill="#ffffff" />
      </g>
    </svg>
  );
}

function FootballField() {
  // Campo verde com listras horizontais sutis. Marcações brancas padrão.
  return (
    <svg viewBox="0 0 100 150" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6f2f" />
          <stop offset="100%" stopColor="#2a672a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="150" fill="url(#grassGrad)" />
      {/* Listras horizontais alternadas (efeito gramado) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="0"
          y={i * 18.75}
          width="100"
          height="18.75"
          fill={i % 2 === 0 ? '#34803f' : '#2c6f33'}
          opacity="0.85"
        />
      ))}
      <g stroke="#ffffff" strokeWidth="0.5" fill="none" opacity="0.95">
        {/* Borda */}
        <rect x="3" y="3" width="94" height="144" />
        {/* Meio + círculo central */}
        <line x1="3" y1="75" x2="97" y2="75" />
        <circle cx="50" cy="75" r="10" />
        <circle cx="50" cy="75" r="0.9" fill="#ffffff" />
        {/* Grande área inferior + pequena área + marca de pênalti */}
        <rect x="20" y="122" width="60" height="25" />
        <rect x="34" y="138" width="32" height="9" />
        <circle cx="50" cy="132" r="0.9" fill="#ffffff" />
        <path d="M 38 122 A 13 13 0 0 0 62 122" />
        {/* Grande área superior + pequena + pênalti */}
        <rect x="20" y="3"  width="60" height="25" />
        <rect x="34" y="3"  width="32" height="9" />
        <circle cx="50" cy="18" r="0.9" fill="#ffffff" />
        <path d="M 38 28 A 13 13 0 0 1 62 28" />
        {/* Gols */}
        <rect x="44" y="1" width="12" height="2" fill="#ffffff" />
        <rect x="44" y="147" width="12" height="2" fill="#ffffff" />
      </g>
    </svg>
  );
}

// ---------- Componente principal ----------
export function LineupField({ players = [], modality = 'football_11', colors }) {
  const starters = (players || []).filter((p) => p.status === 'starter');
  if (starters.length === 0) {
    return (
      <div style={{
        padding: '1.5rem',
        textAlign: 'center',
        color: colors?.textSecondary || '#94a3b8',
        fontSize: '0.85rem',
        fontStyle: 'italic',
      }}>
        Selecione os titulares para visualizar a escalação no campo.
      </div>
    );
  }

  const positioned = computeLineup({ players: starters, modality });
  const isFutsal = modality === 'futsal';

  return (
    <div style={{
      width: '100%',
      maxWidth: '430px',
      margin: '0 auto',
      aspectRatio: '2 / 3',
      position: 'relative',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
    }}>
      {isFutsal ? <FutsalCourt /> : <FootballField />}

      {positioned.map(({ p, coords }, i) => {
        const name = p.name || p.athlete?.name || 'Jogador';
        const num = readJersey(p);
        const last = name.split(' ').slice(-1)[0] || name;
        return (
          <div
            key={p.athlete_id || i}
            title={name}
            style={{
              position: 'absolute',
              left:  `${coords.x}%`,
              top:   `${coords.y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.18rem',
            }}
          >
            {/* Camisa: círculo branco com nº; se vazio mostra "-" cinza */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #0f172a',
              color: '#0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 800,
              boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
            }}>
              {num != null && num !== '' ? num : '–'}
            </div>
            {/* Tag com sobrenome — fundo escuro semi-transparente */}
            <div style={{
              padding: '0.08rem 0.4rem',
              backgroundColor: 'rgba(15,23,42,0.85)',
              color: '#fff', fontSize: '0.62rem', fontWeight: 600,
              borderRadius: '0.3rem',
              whiteSpace: 'nowrap',
              maxWidth: '90px',
              overflow: 'hidden', textOverflow: 'ellipsis',
              letterSpacing: '0.01em',
            }}>{last}</div>
          </div>
        );
      })}
    </div>
  );
}
