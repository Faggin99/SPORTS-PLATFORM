import { supabase, getCurrentTenantId } from '../../../lib/supabase';

export const microcycleService = {
  /**
   * Get existing microcycle for a week (does NOT create if not found)
   * @param {string} weekIdentifier - ISO week format "YYYY-WW"
   * @param {string} clubId - Club ID to filter by
   * @returns {Promise<Object|null>} Microcycle with sessions and blocks, or null if doesn't exist
   */
  async get(weekIdentifier, clubId) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    if (!clubId) {
      console.log('No club selected, returning null');
      return null;
    }

    // Tentar buscar microcycle existente (filtrado por club_id)
    const { data: existing, error: fetchError } = await supabase
      .from('training_microcycles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('club_id', clubId)
      .eq('week_identifier', weekIdentifier)
      .maybeSingle();

    // Se erro e não for "not found", lançar erro
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(fetchError.message || 'Erro ao buscar microciclo');
    }

    // Se não existe, retornar null (NÃO criar)
    if (!existing) {
      return null;
    }

    // Carregar as sessões desta semana com todos os dados
    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select(`
        *,
        blocks:training_activity_blocks(
          *,
          activity:training_activities(
            *,
            title:activity_titles(*),
            stages:training_activity_stages(*),
            contents:training_activity_contents(
              content:contents(*)
            )
          )
        )
      `)
      .eq('microcycle_id', existing.id)
      .order('date', { ascending: true });

    if (sessionsError) {
      console.error('Error loading sessions:', sessionsError);
      return { ...existing, sessions: [] };
    }

    console.log('Loaded microcycle from DB:', existing.week_identifier, 'sessions:', sessions?.length);

    // Processar as sessões para agrupar corretamente os dados
    const processedSessions = (sessions || []).map(session => {
      // Ordenar blocos por order
      const sortedBlocks = (session.blocks || []).sort((a, b) => a.order - b.order);

      // Processar cada bloco para estruturar os contents corretamente
      const processedBlocks = sortedBlocks.map(block => {
        // FIX: Supabase retorna activity como array [], converter para objeto ou null
        let activity = block.activity;
        if (Array.isArray(activity)) {
          activity = activity.length > 0 ? activity[0] : null;
        }

        if (activity && activity.contents) {
          // Extrair apenas o content object de dentro de training_activity_contents
          const flatContents = activity.contents
            .map(tc => tc.content)
            .filter(c => c !== null);

          return {
            ...block,
            activity: {
              ...activity,
              contents: flatContents
            }
          };
        }

        return {
          ...block,
          activity: activity
        };
      });

      return {
        ...session,
        blocks: processedBlocks
      };
    });

    return { ...existing, sessions: processedSessions };
  },

  /**
   * Ensure microcycle structure exists (creates microcycle, sessions, and blocks if needed)
   * Only called when actually saving data
   * @param {string} weekIdentifier - ISO week format "YYYY-WW"
   * @param {string} clubId - Club ID to filter/create for
   * @returns {Promise<Object>} Complete microcycle with sessions and blocks
   */
  async ensureStructure(weekIdentifier, clubId) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    if (!clubId) {
      throw new Error('Nenhum clube selecionado');
    }

    console.log('Ensuring structure for week:', weekIdentifier, 'club:', clubId);

    // Tentar buscar microcycle existente (filtrado por club_id)
    const { data: existing, error: fetchError } = await supabase
      .from('training_microcycles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('club_id', clubId)
      .eq('week_identifier', weekIdentifier)
      .maybeSingle();

    let microcycle = existing;

    // Se erro e não for "not found", lançar erro
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(fetchError.message || 'Erro ao buscar microciclo');
    }

    // Se não existe, criar novo
    if (!microcycle) {
      console.log('Creating new microcycle for week:', weekIdentifier);

      const parts = weekIdentifier.includes('-W')
        ? weekIdentifier.split('-W')
        : weekIdentifier.split('-');
      const year = parseInt(parts[0]);
      const week = parseInt(parts[1]);

      const startDate = getDateOfISOWeek(week, year);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const { data: newMicrocycle, error: createError } = await supabase
        .from('training_microcycles')
        .insert([{
          tenant_id: tenantId,
          club_id: clubId,
          week_identifier: weekIdentifier,
          name: `Semana ${week}/${year}`,
          start_date: formatLocalDate(startDate),
          end_date: formatLocalDate(endDate),
        }])
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message || 'Erro ao criar microciclo');
      }

      microcycle = newMicrocycle;
    }

    // Buscar sessões existentes
    const { data: existingSessions, error: existingError } = await supabase
      .from('training_sessions')
      .select('id, date, day_name, day_of_week')
      .eq('microcycle_id', microcycle.id)
      .order('date', { ascending: true });

    if (existingError) {
      console.error('Error fetching existing sessions:', existingError);
    }

    const existingDates = new Set((existingSessions || []).map(s => s.date));
    const allSessions = existingSessions || [];

    // Parse start_date without timezone to avoid UTC offset issues
    const [sy, sm, sd] = microcycle.start_date.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    // Identificar quais sessões precisam ser criadas
    const sessionsToCreate = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!existingDates.has(dateStr)) {
        sessionsToCreate.push({
          microcycle_id: microcycle.id,
          tenant_id: tenantId,
          club_id: clubId, // Incluir club_id para suportar múltiplos clubes
          date: dateStr,
          day_name: dayNames[i],
          day_of_week: i + 1,
        });
      }
    }

    // Criar apenas as sessões que não existem
    if (sessionsToCreate.length > 0) {
      console.log(`Creating ${sessionsToCreate.length} missing sessions for club:`, clubId);

      // Tentar inserir as sessões
      const { data: createdSessions, error: createSessionsError } = await supabase
        .from('training_sessions')
        .insert(sessionsToCreate)
        .select('id, date, day_name, day_of_week');

      if (createSessionsError) {
        // Se erro for de constraint duplicada, pode ser que a constraint antiga ainda existe
        // Neste caso, tentar uma abordagem alternativa: buscar sessões existentes por microcycle_id
        if (createSessionsError.code === '23505') {
          console.warn('Duplicate key error - constraint needs update. Trying to fetch existing sessions...');

          // Buscar todas as sessões deste microciclo novamente
          const { data: refetchedSessions } = await supabase
            .from('training_sessions')
            .select('id, date, day_name, day_of_week')
            .eq('microcycle_id', microcycle.id);

          if (refetchedSessions && refetchedSessions.length > 0) {
            // Usar as sessões existentes
            allSessions.length = 0; // Limpar array
            allSessions.push(...refetchedSessions);
          } else {
            console.error('Error creating sessions and no existing sessions found:', createSessionsError);
            throw new Error('Erro ao criar sessões. Execute o script SQL fix-training-sessions-constraint.sql no Supabase para corrigir a constraint.');
          }
        } else {
          console.error('Error creating sessions:', createSessionsError);
        }
      } else {
        allSessions.push(...(createdSessions || []));
      }
    }

    // Para cada sessão, verificar se tem blocos e criar se necessário
    for (const session of allSessions) {
      const { data: existingBlocks, error: blocksCheckError } = await supabase
        .from('training_activity_blocks')
        .select('id')
        .eq('session_id', session.id);

      if (blocksCheckError) {
        console.error('Error checking blocks:', blocksCheckError);
        continue;
      }

      // Se não tem blocos, criar os 6 padrão
      if (!existingBlocks || existingBlocks.length === 0) {
        const blocksToCreate = [
          { session_id: session.id, name: 'Aquecimento', order: 1 },
          { session_id: session.id, name: 'Preparatório', order: 2 },
          { session_id: session.id, name: 'Atividade 1', order: 3 },
          { session_id: session.id, name: 'Atividade 2', order: 4 },
          { session_id: session.id, name: 'Atividade 3', order: 5 },
          { session_id: session.id, name: 'Complementos', order: 6 },
        ];

        const { error: blocksError } = await supabase
          .from('training_activity_blocks')
          .insert(blocksToCreate);

        if (blocksError) {
          console.error('Error creating blocks for session', session.id, ':', blocksError);
        }
      }
    }

    // Recarregar sessões completas com blocos e atividades
    const { data: reloadedSessions } = await supabase
      .from('training_sessions')
      .select(`
        *,
        blocks:training_activity_blocks(
          *,
          activity:training_activities(
            *,
            title:activity_titles(*),
            stages:training_activity_stages(*),
            contents:training_activity_contents(
              content:contents(*)
            )
          )
        )
      `)
      .eq('microcycle_id', microcycle.id)
      .order('date', { ascending: true });

    // Processar as sessões - fix day_name based on actual date (corrects UTC offset bug)
    const dayNamesFromDate = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const processedSessions = (reloadedSessions || []).map(session => {
      // Recalculate day_name from actual date to fix any UTC offset issues
      if (session.date) {
        const [y, m, d] = session.date.split('-').map(Number);
        const realDate = new Date(y, m - 1, d);
        const correctDayName = dayNamesFromDate[realDate.getDay()];
        if (session.day_name !== correctDayName) {
          session.day_name = correctDayName;
        }
      }
      const sortedBlocks = (session.blocks || []).sort((a, b) => a.order - b.order);

      const processedBlocks = sortedBlocks.map(block => {
        let activity = block.activity;
        if (Array.isArray(activity)) {
          activity = activity.length > 0 ? activity[0] : null;
        }

        if (activity && activity.contents) {
          const flatContents = activity.contents
            .map(tc => tc.content)
            .filter(c => c !== null);

          return {
            ...block,
            activity: {
              ...activity,
              contents: flatContents
            }
          };
        }

        return {
          ...block,
          activity: activity
        };
      });

      return {
        ...session,
        blocks: processedBlocks
      };
    });

    console.log('Structure ensured. Sessions:', processedSessions.length);

    return { ...microcycle, sessions: processedSessions };
  },
};

/**
 * Create empty week structure for UI display (no database records)
 * @param {string} weekIdentifier - ISO week format "YYYY-WW"
 * @returns {Object} Empty week structure with null IDs
 */
export function createEmptyWeekStructure(weekIdentifier) {
  const parts = weekIdentifier.includes('-W')
    ? weekIdentifier.split('-W')
    : weekIdentifier.split('-');
  const year = parseInt(parts[0]);
  const week = parseInt(parts[1]);

  const startDate = getDateOfISOWeek(week, year);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return {
    id: null, // No database ID
    week_identifier: weekIdentifier,
    name: `Semana ${week}/${year}`,
    start_date: formatLocalDate(startDate),
    end_date: formatLocalDate(endDate),
    sessions: Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      return {
        id: null, // No database ID
        microcycle_id: null,
        date: formatLocalDate(date),
        day_name: dayNames[i],
        day_of_week: i + 1,
        session_type: 'training',
        blocks: [
          { id: null, name: 'Aquecimento', order: 1, activity: null },
          { id: null, name: 'Preparatório', order: 2, activity: null },
          { id: null, name: 'Atividade 1', order: 3, activity: null },
          { id: null, name: 'Atividade 2', order: 4, activity: null },
          { id: null, name: 'Atividade 3', order: 5, activity: null },
          { id: null, name: 'Complementos', order: 6, activity: null },
        ]
      };
    })
  };
}

// Helper function to get date of ISO week
// Format date as YYYY-MM-DD using local timezone (avoids UTC offset shifting the day)
function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDateOfISOWeek(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}
