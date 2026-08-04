// Modal de 3 passos para importar jogos de um campeonato via api-football:
//   1. Busca o time (ex.: "Uberlândia") → escolhe entre resultados
//   2. Escolhe a liga + temporada
//   3. Preview com checkboxes → "Importar selecionados"
//
// Só renderiza se a integração estiver habilitada (a CompetitionsConfigPage
// já filtra antes de abrir).

import { useState, useEffect } from 'react';
import { Search, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { externalApiService } from '../../services/externalApiService';

export function ImportFixturesModal({ isOpen, competition, onClose, onImported }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // step 1: team search
  const [teamQuery, setTeamQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // step 2: leagues
  const [leagues, setLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);

  // step 3: fixtures preview
  const [previewing, setPreviewing] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1); setError(''); setTeamQuery(''); setTeams([]); setSelectedTeam(null);
      setLeagues([]); setSelectedLeague(null); setSelectedSeason(null);
      setFixtures([]); setSelectedIds(new Set()); setResult(null);
    }
  }, [isOpen]);

  async function handleSearchTeam() {
    if (teamQuery.trim().length < 3) { setError('Digite ao menos 3 letras.'); return; }
    setSearching(true); setError('');
    try {
      const list = await externalApiService.searchTeams(teamQuery.trim());
      setTeams(list || []);
    } catch (err) {
      setError(err?.message || 'Erro na busca');
    } finally {
      setSearching(false);
    }
  }

  async function handlePickTeam(team) {
    setSelectedTeam(team); setError(''); setLoadingLeagues(true);
    try {
      const list = await externalApiService.listLeagues({ country: team.country || 'Brazil' });
      setLeagues(list || []);
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Erro ao buscar ligas');
    } finally {
      setLoadingLeagues(false);
    }
  }

  async function handlePickLeagueSeason(league, season) {
    setSelectedLeague(league); setSelectedSeason(season); setPreviewing(true); setError('');
    try {
      const list = await externalApiService.previewFixtures({
        leagueId: league.id, season: season.year, teamId: selectedTeam.id,
      });
      setFixtures(list || []);
      // pré-seleciona todos os não importados
      setSelectedIds(new Set((list || []).filter(f => !f.already_imported).map(f => f.external_event_id)));
      setStep(3);
    } catch (err) {
      setError(err?.message || 'Erro ao buscar jogos');
    } finally {
      setPreviewing(false);
    }
  }

  function toggleFixture(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  }

  async function handleImport() {
    if (selectedIds.size === 0) { setError('Selecione pelo menos 1 jogo.'); return; }
    setImporting(true); setError('');
    try {
      const r = await externalApiService.importFixtures({
        competitionId: competition.id,
        teamId: selectedTeam.id,
        leagueId: selectedLeague.id,
        season: selectedSeason.year,
        eventIds: Array.from(selectedIds),
      });
      setResult(r);
    } catch (err) {
      setError(err?.message || 'Falha na importação');
    } finally {
      setImporting(false);
    }
  }

  const stepLabel = (n) => ({
    1: '1. Buscar time',
    2: '2. Liga + temporada',
    3: '3. Selecionar jogos',
  }[n]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Importar jogos · ${competition?.name || ''}`}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
            {stepLabel(step)} {selectedTeam && `· ${selectedTeam.name}`} {selectedLeague && `· ${selectedLeague.name}`} {selectedSeason && `· ${selectedSeason.year}`}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step > 1 && !result && (
              <Button variant="outline" onClick={() => { setStep(step - 1); setError(''); }}>Voltar</Button>
            )}
            {result ? (
              <Button onClick={() => onImported?.()}>Concluir</Button>
            ) : (
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            )}
          </div>
        </div>
      }
    >
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.7rem', backgroundColor: '#ef444415', color: '#ef4444', borderRadius: '0.375rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem', backgroundColor: '#22c55e15', color: '#22c55e', borderRadius: '0.375rem', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          <CheckCircle2 size={18} />
          <div>
            <strong>{result.created || 0}</strong> criados · <strong>{result.updated || 0}</strong> atualizados
            {result.skipped > 0 && ` · ${result.skipped} ignorados (edição manual)`}
          </div>
        </div>
      )}

      {!result && step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <Input
              label="Nome do time"
              value={teamQuery}
              onChange={(e) => setTeamQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchTeam(); } }}
              placeholder="Ex.: Uberlandia, Cruzeiro, Flamengo..."
              fullWidth
            />
            <Button onClick={handleSearchTeam} disabled={searching} icon={searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}>
              {searching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          {teams.length > 0 && (
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: '0.375rem', maxHeight: '320px', overflowY: 'auto' }}>
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handlePickTeam(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.7rem',
                    padding: '0.6rem 0.8rem', width: '100%',
                    background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.border}40`,
                    color: colors.text, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {t.logo && <img src={t.logo} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.7rem', color: colors.textSecondary }}>
                      {t.country}{t.founded ? ` · fundado ${t.founded}` : ''}{t.venue ? ` · ${t.venue}` : ''}
                    </div>
                  </div>
                  <ChevronRight size={14} color={colors.textSecondary} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && step === 2 && (
        <div>
          {loadingLeagues ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>Carregando ligas…</div>
          ) : (
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: '0.375rem', maxHeight: '400px', overflowY: 'auto' }}>
              {leagues.map((l) => (
                <div key={l.id} style={{ borderBottom: `1px solid ${colors.border}40`, padding: '0.6rem 0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    {l.logo && <img src={l.logo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: colors.text }}>{l.name}</div>
                    <span style={{ fontSize: '0.65rem', color: colors.textSecondary, textTransform: 'uppercase' }}>{l.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {(l.seasons || []).slice(-5).reverse().map((s) => (
                      <button
                        key={s.year}
                        onClick={() => handlePickLeagueSeason(l, s)}
                        disabled={previewing}
                        style={{
                          padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 600,
                          backgroundColor: s.current ? `${colors.primary}20` : colors.background,
                          color: s.current ? colors.primary : colors.text,
                          border: `1px solid ${s.current ? colors.primary : colors.border}`,
                          borderRadius: '0.3rem', cursor: previewing ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {s.year}{s.current ? ' ●' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && step === 3 && (
        <div>
          {previewing ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>Carregando jogos…</div>
          ) : fixtures.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: colors.textSecondary, fontSize: '0.85rem' }}>
              Nenhum jogo encontrado para este time nesta liga/temporada.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.78rem', color: colors.textSecondary }}>
                  {selectedIds.size} de {fixtures.length} selecionados
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={() => setSelectedIds(new Set(fixtures.map(f => f.external_event_id)))}
                    style={{ background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '0.75rem' }}>Todos</button>
                  <span style={{ color: colors.textSecondary }}>·</span>
                  <button onClick={() => setSelectedIds(new Set())}
                    style={{ background: 'transparent', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '0.75rem' }}>Nenhum</button>
                </div>
              </div>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: '0.375rem', maxHeight: '420px', overflowY: 'auto' }}>
                {fixtures.map((f) => (
                  <label key={f.external_event_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.5rem 0.7rem',
                      borderBottom: `1px solid ${colors.border}40`,
                      cursor: f.already_imported ? 'default' : 'pointer',
                      opacity: f.already_imported ? 0.55 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(f.external_event_id)}
                      disabled={f.already_imported}
                      onChange={() => toggleFixture(f.external_event_id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: colors.text }}>
                        {f.date} · {f.match_round ? `Rodada ${f.match_round}` : '—'} · {f.match_location === 'home' ? 'Casa' : 'Fora'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        vs {f.opponent_name}
                        {f.finished && f.goals_scored != null && (
                          <strong style={{ marginLeft: '0.5rem', color: colors.text }}>
                            {f.goals_scored}×{f.goals_conceded}
                          </strong>
                        )}
                        {f.already_imported && <span style={{ marginLeft: '0.5rem', color: '#22c55e' }}>· já importado</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleImport} disabled={importing || selectedIds.size === 0} icon={importing ? <Loader2 size={14} className="animate-spin" /> : null}>
                  {importing ? 'Importando…' : `Importar ${selectedIds.size} jogo${selectedIds.size === 1 ? '' : 's'}`}
                </Button>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: colors.textSecondary, textAlign: 'right' }}>
                Dados de API-Football (api-sports.io)
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
