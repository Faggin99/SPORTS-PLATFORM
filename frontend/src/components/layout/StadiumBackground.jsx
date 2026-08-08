// Fundo do estádio — gradient de céu + gramado, holofotes e feixes de luz.
// Usado na HomePage e em todo o app via Layout pra padronizar visual.
// Variante 'soft' (default no Layout): cores mais discretas pra não competir
// com o conteúdo. Variante 'hero' (HomePage): mais saturado pra dar boas-vindas.
// Modality: 'football_11'|'football_7' renderiza estádio aberto; 'futsal' renderiza ginásio indoor.

export function StadiumBackground({ isDark, variant = 'soft', modality = 'football_11' }) {
  if (modality === 'futsal') {
    return <IndoorCourtBackground isDark={isDark} variant={variant} />;
  }
  return <OutdoorStadium isDark={isDark} variant={variant} />;
}

function OutdoorStadium({ isDark, variant = 'soft' }) {
  const isHero = variant === 'hero';

  // Paletas
  const baseColor = isDark
    ? '#050912'
    : (isHero ? '#60a5fa' : '#cbe2fb');
  const horizon = isDark
    ? '#0c1428'
    : (isHero ? '#bfdbfe' : '#e7f1fd');
  const grass = isDark
    ? '#062812'
    : (isHero ? '#65b942' : '#b6d99a');
  const grassDeep = isDark
    ? '#021608'
    : (isHero ? '#3e8c1f' : '#8cba6c');
  const lightBeam = isDark
    ? 'rgba(180,210,255,0.18)'
    : `rgba(255,255,255,${isHero ? 0.5 : 0.32})`;
  const lightHalo = isDark
    ? 'rgba(120,170,255,0.20)'
    : `rgba(255,255,255,${isHero ? 0.4 : 0.28})`;

  // Vinheta — no soft, bem leve, só pra dar profundidade nas bordas
  const vignette = isDark
    ? 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)'
    : (isHero
        ? 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.18) 100%)'
        : 'radial-gradient(ellipse at center, transparent 70%, rgba(0,0,0,0.06) 100%)');

  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `linear-gradient(to bottom, ${baseColor} 0%, ${horizon} 55%, ${grass} 55%, ${grassDeep} 100%)`,
      pointerEvents: 'none',
    }}>
      {/* Halo das luzes */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(ellipse 55% 35% at 50% 22%, ${lightHalo}, transparent 70%),
          radial-gradient(ellipse 25% 15% at 22% 18%, ${lightHalo}, transparent 70%),
          radial-gradient(ellipse 25% 15% at 78% 18%, ${lightHalo}, transparent 70%)
        `,
      }} />

      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
      }}>
        <defs>
          <linearGradient id={`beam-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lightBeam} stopOpacity={isDark ? 0.6 : (isHero ? 0.7 : 0.5)} />
            <stop offset="100%" stopColor={lightBeam} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`grass-shine-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? "0.05" : (isHero ? "0.18" : "0.10")} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Feixes de luz dos holofotes */}
        <polygon points="220,0 200,0 380,330 420,330" fill={`url(#beam-${variant})`} />
        <polygon points="380,0 360,0 470,330 510,330" fill={`url(#beam-${variant})`} />
        <polygon points="500,0 480,0 540,330 580,330" fill={`url(#beam-${variant})`} />
        <polygon points="620,0 600,0 610,330 650,330" fill={`url(#beam-${variant})`} />
        <polygon points="780,0 760,0 700,330 740,330" fill={`url(#beam-${variant})`} />

        {/* Estrutura dos holofotes */}
        <rect x="0" y="0" width="1000" height={isDark ? "20" : "12"} fill={isDark ? "#0a0f1e" : "#1e293b"} opacity={isDark ? "0.95" : (isHero ? "0.25" : "0.18")} />
        {[150, 290, 430, 570, 710, 850].map((cx) => (
          <g key={cx}>
            <rect x={cx - 18} y={isDark ? "10" : "6"} width="36" height={isDark ? "14" : "10"} fill={isDark ? "#0e1830" : "#334155"} rx="2" opacity={isHero || isDark ? 1 : 0.7} />
            <circle cx={cx - 10} cy={isDark ? "17" : "10"} r="2.5" fill="#fff" opacity="0.95" />
            <circle cx={cx} cy={isDark ? "17" : "10"} r="2.5" fill="#fff" opacity="0.95" />
            <circle cx={cx + 10} cy={isDark ? "17" : "10"} r="2.5" fill="#fff" opacity="0.95" />
          </g>
        ))}

        {/* Estrelas no céu (só dark) */}
        {isDark && [
          [80, 70], [180, 120], [240, 60], [340, 130], [620, 80], [770, 140], [880, 60], [940, 110],
          [60, 200], [120, 240], [300, 220], [400, 260], [560, 230], [700, 210], [820, 250], [920, 230],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1" fill="#ffffff" opacity={0.4 + Math.random() * 0.4} />
        ))}

        {/* Brilho no horizonte */}
        <rect x="0" y="330" width="1000" height="40" fill={`url(#grass-shine-${variant})`} />

        {/* Linhas do campo */}
        <g stroke="#ffffff" strokeOpacity={isDark ? "0.18" : (isHero ? "0.55" : "0.35")} strokeWidth="1.5" fill="none">
          <line x1="0" y1="350" x2="1000" y2="350" />
          <line x1="500" y1="350" x2="500" y2="600" />
          <ellipse cx="500" cy="475" rx="120" ry="35" />
          <path d="M0,400 L 200,400 L 220,520 L 0,520 Z" />
          <path d="M1000,400 L 800,400 L 780,520 L 1000,520 Z" />
          <path d="M0,440 L 80,440 L 95,500 L 0,500 Z" />
          <path d="M1000,440 L 920,440 L 905,500 L 1000,500 Z" />
        </g>

        <rect x="0" y="550" width="1000" height="60" fill="black" opacity={isDark ? "0.45" : (isHero ? "0.15" : "0.08")} />

        {/* ───────── Elementos de treino ───────── */}
        {(() => {
          // Opacidades por variante — bem sutis no soft pra não competir com o conteúdo
          const trainingOpacity = isDark ? 0.55 : (isHero ? 0.85 : 0.42);
          const arrowOpacity    = isDark ? 0.32 : (isHero ? 0.55 : 0.22);

          // SVG path de um cone (visto em perspectiva). Usado várias vezes via <use>.
          // Origem (0,0) é a base centro do cone.
          return (
            <g opacity={trainingOpacity}>
              <defs>
                <symbol id={`cone-${variant}`} viewBox="-10 -22 20 24" overflow="visible">
                  {/* Corpo */}
                  <path d="M -7,0 L 0,-20 L 7,0 Z" fill="#f97316" stroke="#c2410c" strokeWidth="0.6" strokeLinejoin="round" />
                  {/* Listra horizontal branca */}
                  <path d="M -5.2,-6 L 5.2,-6 L 4.4,-10 L -4.4,-10 Z" fill="#ffffff" opacity="0.85" />
                  {/* Sombra elíptica na base */}
                  <ellipse cx="0" cy="0.5" rx="7.5" ry="2" fill="black" opacity="0.25" />
                </symbol>

                {/* Marca de seta tática (ponta) */}
                <marker id={`arrow-${variant}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0,0 L 10,5 L 0,10 Z" fill="#fde047" opacity="0.95" />
                </marker>
              </defs>

              {/* Cones espalhados pelo campo (perspectiva: maiores embaixo, menores em cima) */}
              <use href={`#cone-${variant}`} x="120" y="565" width="22" height="26" />
              <use href={`#cone-${variant}`} x="210" y="540" width="18" height="22" />
              <use href={`#cone-${variant}`} x="305" y="555" width="20" height="24" />
              <use href={`#cone-${variant}`} x="690" y="558" width="20" height="24" />
              <use href={`#cone-${variant}`} x="790" y="540" width="18" height="22" />
              <use href={`#cone-${variant}`} x="870" y="568" width="22" height="26" />

              {/* Linha de cones em zigue-zague mais ao fundo */}
              <use href={`#cone-${variant}`} x="430" y="430" width="12" height="15" />
              <use href={`#cone-${variant}`} x="480" y="438" width="12" height="15" />
              <use href={`#cone-${variant}`} x="530" y="430" width="12" height="15" />
              <use href={`#cone-${variant}`} x="580" y="438" width="12" height="15" />

              {/* Bola */}
              <g transform="translate(640 575)">
                <circle r="9" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8" />
                {/* Pentágonos pretos pra simular a textura */}
                <polygon points="-2,-4 2,-4 3,-1 0,2 -3,-1" fill="#0f172a" />
                <polygon points="4,1 7,2 6,5 3,4" fill="#0f172a" opacity="0.7" />
                <polygon points="-4,1 -7,2 -6,5 -3,4" fill="#0f172a" opacity="0.7" />
                <ellipse cx="0" cy="10" rx="10" ry="2.5" fill="black" opacity="0.3" />
              </g>

              {/* Prancheta tática no canto inferior esquerdo */}
              <g transform="translate(60 510) rotate(-8)">
                <rect x="0" y="0" width="68" height="86" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
                {/* Clipe */}
                <rect x="24" y="-4" width="20" height="6" rx="1.5" fill="#92400e" />
                {/* Mini-campo */}
                <rect x="4" y="6" width="60" height="72" fill="#1e3a5f" opacity="0.85" />
                <rect x="4" y="6" width="60" height="72" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
                <line x1="4" y1="42" x2="64" y2="42" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
                <circle cx="34" cy="42" r="6" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
                {/* Jogadores como pontos */}
                <circle cx="14" cy="28" r="1.5" fill="#3b82f6" />
                <circle cx="34" cy="22" r="1.5" fill="#3b82f6" />
                <circle cx="54" cy="28" r="1.5" fill="#3b82f6" />
                <circle cx="22" cy="58" r="1.5" fill="#ef4444" />
                <circle cx="46" cy="58" r="1.5" fill="#ef4444" />
                {/* Seta tática mini */}
                <path d="M 16,30 Q 28,18 44,24" fill="none" stroke="#fde047" strokeWidth="0.8" markerEnd={`url(#arrow-${variant})`} opacity="0.9" />
              </g>

              {/* Setas táticas no campo — movimentação de jogadores */}
              <g opacity={arrowOpacity}>
                <path d="M 180,500 Q 260,440 360,480" fill="none" stroke="#fde047" strokeWidth="1.8" strokeDasharray="5,4" markerEnd={`url(#arrow-${variant})`} />
                <path d="M 820,495 Q 740,435 640,475" fill="none" stroke="#fde047" strokeWidth="1.8" strokeDasharray="5,4" markerEnd={`url(#arrow-${variant})`} />
              </g>
            </g>
          );
        })()}
      </svg>

      <div style={{
        position: 'absolute', inset: 0,
        background: vignette,
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Indoor (futsal): ginásio com piso azul-cobalto + painéis de LED de teto
// + linhas circulares da área do goleiro e marcas duplas de pênalti.
// Mantém cones, bola e prancheta (universais pra qualquer modalidade).
// ─────────────────────────────────────────────────────────────────────────────
function IndoorCourtBackground({ isDark, variant = 'soft' }) {
  const isHero = variant === 'hero';

  // Paleta indoor: parede do ginásio em cima, piso cobalto embaixo.
  // Light/soft: pastéis bem claros pra não competir com o conteúdo (espelha o outdoor #cbe2fb).
  const ceilingColor = isDark
    ? '#0a0f1c'                            // teto dark
    : (isHero ? '#bfdbfe' : '#e6efff');    // teto claro: branco-azulado bem suave
  const wallBand = isDark
    ? '#101627'
    : (isHero ? '#93c5fd' : '#c7dbf4');    // faixa wall-to-floor sutil
  const courtColor = isDark
    ? '#0d2444'                            // cobalto noturno
    : (isHero ? '#1E5AA8' : '#a8c8eb');    // soft light: azul claro pastel (combina com UI)
  const courtDeep = isDark
    ? '#08182f'
    : (isHero ? '#164785' : '#8cb4dd');
  const ledGlow = isDark
    ? 'rgba(220,235,255,0.22)'
    : `rgba(255,255,255,${isHero ? 0.55 : 0.32})`;
  const lineColor = '#ffffff';

  const vignette = isDark
    ? 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)'
    : (isHero
        ? 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.18) 100%)'
        : 'radial-gradient(ellipse at center, transparent 70%, rgba(0,0,0,0.08) 100%)');

  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      // Teto (até 50%), faixa fina de transição, piso até embaixo
      background: `linear-gradient(to bottom,
        ${ceilingColor} 0%,
        ${ceilingColor} 48%,
        ${wallBand} 50%,
        ${wallBand} 52%,
        ${courtColor} 54%,
        ${courtDeep} 100%)`,
      pointerEvents: 'none',
    }}>
      {/* Halos suaves dos painéis de LED — substituem os holofotes do estádio */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(ellipse 55% 30% at 50% 28%, ${ledGlow}, transparent 70%),
          radial-gradient(ellipse 22% 14% at 20% 25%, ${ledGlow}, transparent 70%),
          radial-gradient(ellipse 22% 14% at 80% 25%, ${ledGlow}, transparent 70%)
        `,
      }} />

      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
      }}>
        <defs>
          <linearGradient id={`led-beam-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ledGlow} stopOpacity={isDark ? 0.5 : (isHero ? 0.6 : 0.4)} />
            <stop offset="100%" stopColor={ledGlow} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`floor-shine-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? "0.06" : (isHero ? "0.20" : "0.12")} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/* Microtextura sutil do piso — pontinhos repetidos */}
          <pattern id={`court-pores-${variant}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.5" fill="rgba(255,255,255,0.05)" />
            <circle cx="6" cy="6" r="0.5" fill="rgba(0,0,0,0.08)" />
          </pattern>
        </defs>

        {/* Feixes de luz cônicos dos painéis (mais discretos que holofotes) */}
        <polygon points="200,30 180,30 320,280 360,280" fill={`url(#led-beam-${variant})`} />
        <polygon points="500,30 480,30 510,280 530,280" fill={`url(#led-beam-${variant})`} />
        <polygon points="800,30 780,30 680,280 720,280" fill={`url(#led-beam-${variant})`} />

        {/* Estrutura de painéis LED no teto — retângulos longos com cantos arredondados */}
        <rect x="0" y="0" width="1000" height={isDark ? "16" : "10"} fill={isDark ? "#050a16" : "#1e293b"} opacity={isDark ? "0.95" : (isHero ? "0.3" : "0.2")} />
        {[120, 280, 440, 560, 720, 880].map((cx) => (
          <g key={cx}>
            {/* Painel — caixa do LED */}
            <rect x={cx - 30} y={isDark ? "6" : "4"} width="60" height={isDark ? "10" : "8"} rx="2" fill={isDark ? "#101830" : "#475569"} opacity={isHero || isDark ? 0.95 : 0.6} />
            {/* Tira luminosa central — emissor */}
            <rect x={cx - 26} y={isDark ? "9" : "6"} width="52" height={isDark ? "4" : "3"} rx="1.5" fill="#ffffff" opacity={isDark ? "0.85" : "0.95"} />
          </g>
        ))}

        {/* Faixa fina de "rodapé" entre parede e piso — bem sutil no soft light */}
        <rect x="0" y="297" width="1000" height="6" fill="#0f172a" opacity={isDark ? "0.5" : (isHero ? "0.18" : "0.06")} />
        <rect x="0" y="303" width="1000" height="2" fill={lineColor} opacity={isDark ? "0.15" : (isHero ? "0.35" : "0.25")} />

        {/* Piso da quadra — microtextura sutil + brilho no horizonte */}
        <rect x="0" y="305" width="1000" height="295" fill={`url(#court-pores-${variant})`} opacity={isDark ? "0.5" : (isHero ? "0.8" : "0.5")} />
        <rect x="0" y="305" width="1000" height="40" fill={`url(#floor-shine-${variant})`} />

        {/* Linhas da quadra de futsal — vista em perspectiva (achatada no eixo Y) */}
        <g stroke={lineColor} strokeOpacity={isDark ? "0.18" : (isHero ? "0.55" : "0.35")} strokeWidth="1.5" fill="none">
          {/* Linha central horizontal (linha do meio) */}
          <line x1="0" y1="375" x2="1000" y2="375" />
          {/* Linha central vertical (campo dividido em 2) */}
          <line x1="500" y1="375" x2="500" y2="600" />
          {/* Círculo central — elipse pq estamos em perspectiva */}
          <ellipse cx="500" cy="490" rx="100" ry="28" />
          {/* Áreas semicirculares dos goleiros — característica do futsal */}
          {/* Esquerda — meia elipse abrindo pra direita */}
          <path d="M 0,420 A 220,80 0 0 1 0,560 Z" />
          {/* Direita — meia elipse abrindo pra esquerda */}
          <path d="M 1000,420 A 220,80 0 0 0 1000,560 Z" />
          {/* Marcas de pênalti (1ª penalidade) */}
          <circle cx="120" cy="490" r="2" fill={lineColor} stroke="none" opacity={isDark ? "0.3" : "0.5"} />
          <circle cx="880" cy="490" r="2" fill={lineColor} stroke="none" opacity={isDark ? "0.3" : "0.5"} />
          {/* Marcas de 2ª penalidade (10m) — exclusivo de futsal */}
          <circle cx="190" cy="490" r="2" fill={lineColor} stroke="none" opacity={isDark ? "0.25" : "0.4"} />
          <circle cx="810" cy="490" r="2" fill={lineColor} stroke="none" opacity={isDark ? "0.25" : "0.4"} />
        </g>

        {/* Sombra na base pra dar profundidade */}
        <rect x="0" y="555" width="1000" height="45" fill="black" opacity={isDark ? "0.4" : (isHero ? "0.15" : "0.08")} />

        {/* ───────── Elementos de treino (mesmos do outdoor) ───────── */}
        {(() => {
          const trainingOpacity = isDark ? 0.55 : (isHero ? 0.85 : 0.42);
          const arrowOpacity    = isDark ? 0.32 : (isHero ? 0.55 : 0.22);

          return (
            <g opacity={trainingOpacity}>
              <defs>
                <symbol id={`cone-indoor-${variant}`} viewBox="-10 -22 20 24" overflow="visible">
                  <path d="M -7,0 L 0,-20 L 7,0 Z" fill="#f97316" stroke="#c2410c" strokeWidth="0.6" strokeLinejoin="round" />
                  <path d="M -5.2,-6 L 5.2,-6 L 4.4,-10 L -4.4,-10 Z" fill="#ffffff" opacity="0.85" />
                  <ellipse cx="0" cy="0.5" rx="7.5" ry="2" fill="black" opacity="0.25" />
                </symbol>
                <marker id={`arrow-indoor-${variant}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0,0 L 10,5 L 0,10 Z" fill="#fde047" opacity="0.95" />
                </marker>
              </defs>

              <use href={`#cone-indoor-${variant}`} x="120" y="565" width="22" height="26" />
              <use href={`#cone-indoor-${variant}`} x="210" y="540" width="18" height="22" />
              <use href={`#cone-indoor-${variant}`} x="305" y="555" width="20" height="24" />
              <use href={`#cone-indoor-${variant}`} x="690" y="558" width="20" height="24" />
              <use href={`#cone-indoor-${variant}`} x="790" y="540" width="18" height="22" />
              <use href={`#cone-indoor-${variant}`} x="870" y="568" width="22" height="26" />

              <use href={`#cone-indoor-${variant}`} x="430" y="455" width="12" height="15" />
              <use href={`#cone-indoor-${variant}`} x="480" y="463" width="12" height="15" />
              <use href={`#cone-indoor-${variant}`} x="530" y="455" width="12" height="15" />
              <use href={`#cone-indoor-${variant}`} x="580" y="463" width="12" height="15" />

              {/* Bola — futsal é amarela com gomos (PVC), mas pra simplicidade visual mantemos design genérico */}
              <g transform="translate(640 575)">
                <circle r="9" fill="#fef3c7" stroke="#0f172a" strokeWidth="0.8" />
                <polygon points="-2,-4 2,-4 3,-1 0,2 -3,-1" fill="#0f172a" opacity="0.8" />
                <polygon points="4,1 7,2 6,5 3,4" fill="#0f172a" opacity="0.6" />
                <polygon points="-4,1 -7,2 -6,5 -3,4" fill="#0f172a" opacity="0.6" />
                <ellipse cx="0" cy="10" rx="10" ry="2.5" fill="black" opacity="0.3" />
              </g>

              {/* Prancheta */}
              <g transform="translate(60 510) rotate(-8)">
                <rect x="0" y="0" width="68" height="86" rx="3" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
                <rect x="24" y="-4" width="20" height="6" rx="1.5" fill="#92400e" />
                <rect x="4" y="6" width="60" height="72" fill="#1e3a5f" opacity="0.85" />
                <rect x="4" y="6" width="60" height="72" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
                <line x1="4" y1="42" x2="64" y2="42" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
                <circle cx="34" cy="42" r="6" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
                <circle cx="14" cy="28" r="1.5" fill="#3b82f6" />
                <circle cx="34" cy="22" r="1.5" fill="#3b82f6" />
                <circle cx="54" cy="28" r="1.5" fill="#3b82f6" />
                <circle cx="22" cy="58" r="1.5" fill="#ef4444" />
                <circle cx="46" cy="58" r="1.5" fill="#ef4444" />
                <path d="M 16,30 Q 28,18 44,24" fill="none" stroke="#fde047" strokeWidth="0.8" markerEnd={`url(#arrow-indoor-${variant})`} opacity="0.9" />
              </g>

              {/* Setas táticas */}
              <g opacity={arrowOpacity}>
                <path d="M 180,505 Q 260,455 360,490" fill="none" stroke="#fde047" strokeWidth="1.8" strokeDasharray="5,4" markerEnd={`url(#arrow-indoor-${variant})`} />
                <path d="M 820,505 Q 740,455 640,490" fill="none" stroke="#fde047" strokeWidth="1.8" strokeDasharray="5,4" markerEnd={`url(#arrow-indoor-${variant})`} />
              </g>
            </g>
          );
        })()}
      </svg>

      <div style={{
        position: 'absolute', inset: 0,
        background: vignette,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
