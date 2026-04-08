import { microcycleService, createEmptyWeekStructure } from '../modules/training-management/services/microcycleService';
import { sessionService } from '../modules/training-management/services/sessionService';
import { supabase, getCurrentTenantId } from '../lib/supabase';
import { cache } from '../utils/cache';

// Helper function para cores dos conteúdos
function getColorForContent(contentName) {
  const colorMap = {
    'Bola Parada Ofensiva': '#8b5cf6',
    'Bola Parada Defensiva': '#ec4899',
    'Transição Ofensiva': '#10b981',
    'Transição Defensiva': '#f59e0b',
    'Organização Ofensiva': '#3b82f6',
    'Organização Defensiva': '#ef4444',
    'Físico': '#06b6d4',
    'Tomada de Decisão': '#84cc16',
  };
  return colorMap[contentName] || '#6b7280';
}

export const trainingService = {
  async getMicrocycle(weekIdentifier, clubId) {
    // Only GET, don't create. Return empty structure if doesn't exist
    const microcycle = await microcycleService.get(weekIdentifier, clubId);

    if (!microcycle) {
      console.log('Microcycle not found in DB, returning empty structure for UI:', weekIdentifier, 'club:', clubId);
      return { data: createEmptyWeekStructure(weekIdentifier) };
    }

    return { data: microcycle };
  },

  async ensureMicrocycleStructure(weekIdentifier, clubId) {
    // Create structure if needed (called only when saving data)
    const microcycle = await microcycleService.ensureStructure(weekIdentifier, clubId);
    return { data: microcycle };
  },

  async getSession(sessionId) {
    const session = await sessionService.get(sessionId);
    return { data: session };
  },

  async updateSession(sessionId, data) {
    const session = await sessionService.update(sessionId, data.blocks || []);
    return { data: session };
  },

  async updateSessionType(sessionId, data) {
    const { error } = await supabase
      .from('training_sessions')
      .update({
        session_type: data.session_type,
        opponent_name: data.opponent_name || null,
      })
      .eq('id', sessionId);

    if (error) throw new Error(error.message);
    return { data: { message: 'Tipo de sessão atualizado' } };
  },

  async updateActivity(activityId, data) {
    const tenantId = await getCurrentTenantId();

    const updateData = {
      title_id: data.titleId || data.title_id || null,
      description: data.description || null,
      duration_minutes: data.duration_minutes || data.durationMinutes || null,
      groups: data.groups || data.selectedGroups || [],
      is_rest: data.is_rest || false,
      tenant_id: tenantId,
    };

    const { data: activity, error } = await supabase
      .from('training_activities')
      .update(updateData)
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // SEMPRE deletar contents antigos primeiro
    await supabase
      .from('training_activity_contents')
      .delete()
      .eq('activity_id', activityId);

    // Inserir novos contents apenas se houver
    if (data.selectedContents && data.selectedContents.length > 0) {
      const contentsToInsert = data.selectedContents.map(contentId => ({
        activity_id: activityId,
        content_id: contentId,
      }));

      await supabase
        .from('training_activity_contents')
        .insert(contentsToInsert);
    }

    // SEMPRE deletar stages antigos primeiro
    await supabase
      .from('training_activity_stages')
      .delete()
      .eq('activity_id', activityId);

    // Inserir novos stages apenas se houver
    if (data.selectedStages && data.selectedStages.length > 0) {
      // Buscar nomes das stages pelos IDs
      const { data: stages } = await supabase
        .from('stages')
        .select('id, name')
        .in('id', data.selectedStages);

      const stageMap = {};
      stages?.forEach(stage => {
        stageMap[stage.id] = stage.name;
      });

      // Inserir novos stages
      const stagesToInsert = data.selectedStages.map((stageId, index) => ({
        activity_id: activityId,
        stage_name: stageMap[stageId] || stageId,
        order: index + 1,
      }));

      await supabase
        .from('training_activity_stages')
        .insert(stagesToInsert);
    }

    return { data: activity };
  },

  async createActivity(data) {
    const tenantId = await getCurrentTenantId();

    const activityData = {
      block_id: data.block_id,
      title_id: data.titleId || data.title_id || null,
      description: data.description || null,
      duration_minutes: data.duration_minutes || data.durationMinutes || null,
      groups: data.groups || data.selectedGroups || [],
      is_rest: data.is_rest || false,
      tenant_id: tenantId,
    };

    const { data: activity, error } = await supabase
      .from('training_activities')
      .insert([activityData])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Inserir contents
    if (data.selectedContents && data.selectedContents.length > 0) {
      const contentsToInsert = data.selectedContents.map(contentId => ({
        activity_id: activity.id,
        content_id: contentId,
      }));

      await supabase
        .from('training_activity_contents')
        .insert(contentsToInsert);
    }

    // Inserir stages
    if (data.selectedStages && data.selectedStages.length > 0) {
      // Buscar nomes das stages pelos IDs
      const { data: stages } = await supabase
        .from('stages')
        .select('id, name')
        .in('id', data.selectedStages);

      const stageMap = {};
      stages?.forEach(stage => {
        stageMap[stage.id] = stage.name;
      });

      const stagesToInsert = data.selectedStages.map((stageId, index) => ({
        activity_id: activity.id,
        stage_name: stageMap[stageId] || stageId, // Usar nome se encontrado
        order: index + 1,
      }));

      await supabase
        .from('training_activity_stages')
        .insert(stagesToInsert);
    }

    return { data: activity };
  },

  async upsertActivityForBlock(blockId, data) {
    // Verificar se já existe uma atividade para este bloco
    const { data: existingActivity } = await supabase
      .from('training_activities')
      .select('id')
      .eq('block_id', blockId)
      .single();

    if (existingActivity) {
      // Atualizar atividade existente
      return await this.updateActivity(existingActivity.id, data);
    } else {
      // Criar nova atividade
      return await this.createActivity({ ...data, block_id: blockId });
    }
  },

  async deleteActivityByBlockId(blockId) {
    // Buscar atividade existente (use maybeSingle para evitar erro 406 quando não existe)
    const { data: existingActivity } = await supabase
      .from('training_activities')
      .select('id')
      .eq('block_id', blockId)
      .maybeSingle();

    if (existingActivity) {
      // Deletar contents associados
      await supabase
        .from('training_activity_contents')
        .delete()
        .eq('activity_id', existingActivity.id);

      // Deletar stages associados
      await supabase
        .from('training_activity_stages')
        .delete()
        .eq('activity_id', existingActivity.id);

      // Deletar a atividade
      const { error } = await supabase
        .from('training_activities')
        .delete()
        .eq('id', existingActivity.id);

      if (error) throw new Error(error.message);
      return { data: { deleted: true } };
    }

    return { data: { deleted: false, reason: 'No activity found' } };
  },

  async getContents() {
    const cacheKey = 'training_contents';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Contents são dados padrão do sistema, não filtrar por tenant
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);

    const result = { data: data || [] };
    cache.set(cacheKey, result, 300000);
    return result;
  },

  async getStages() {
    const cacheKey = 'training_stages';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Stages são dados padrão do sistema, não filtrar por tenant
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);

    const result = { data: data || [] };
    cache.set(cacheKey, result, 300000);
    return result;
  },

  async getTitles(includeArchived = false) {
    const tenantId = await getCurrentTenantId();

    // Buscar títulos do tenant ou sem tenant (dados legados)
    let query = supabase
      .from('activity_titles')
      .select('*')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('title');

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    // Filtrar arquivados no cliente
    let filteredData = data || [];
    if (!includeArchived) {
      filteredData = filteredData.filter(item => !item.is_archived);
    }

    return { data: filteredData };
  },

  async getTitlesWithContent(includeArchived = false) {
    const tenantId = await getCurrentTenantId();

    // Buscar todos os títulos do tenant (ou sem tenant para dados legados)
    let query = supabase
      .from('activity_titles')
      .select(`
        *,
        content:contents(id, name)
      `)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('title');

    // Filtrar arquivados apenas se a coluna existir
    // Por enquanto, não filtrar por is_archived pois a coluna pode não existir
    // if (!includeArchived) {
    //   query = query.or('is_archived.is.null,is_archived.eq.false');
    // }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    // Filtrar arquivados no cliente se necessário
    let filteredData = data || [];
    if (!includeArchived) {
      filteredData = filteredData.filter(item => !item.is_archived);
    }

    return { data: filteredData };
  },

  async createTitle(titleData) {
    const tenantId = await getCurrentTenantId();
    // Não incluir is_archived se a coluna ainda não existir no banco
    const insertData = { ...titleData, tenant_id: tenantId };

    const { data, error } = await supabase
      .from('activity_titles')
      .insert([insertData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  async updateTitle(titleId, titleData) {
    const tenantId = await getCurrentTenantId();

    // Primeiro, verificar se o título pertence ao tenant atual ou é legado (tenant_id null)
    const { data: existingTitle, error: fetchError } = await supabase
      .from('activity_titles')
      .select('id, tenant_id')
      .eq('id', titleId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    // Verificar se o usuário tem permissão para editar
    if (existingTitle.tenant_id && existingTitle.tenant_id !== tenantId) {
      throw new Error('Você não tem permissão para editar este título');
    }

    // Atualizar o título e garantir que tenant_id seja definido
    const { data, error } = await supabase
      .from('activity_titles')
      .update({
        title: titleData.title,
        content_id: titleData.content_id,
        description: titleData.description,
        tenant_id: tenantId, // Atribuir ao tenant atual se era legado
      })
      .eq('id', titleId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  async archiveTitle(titleId) {
    const tenantId = await getCurrentTenantId();

    // Verificar permissão
    const { data: existingTitle, error: fetchError } = await supabase
      .from('activity_titles')
      .select('id, tenant_id')
      .eq('id', titleId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    if (existingTitle.tenant_id && existingTitle.tenant_id !== tenantId) {
      throw new Error('Você não tem permissão para arquivar este título');
    }

    const { data, error } = await supabase
      .from('activity_titles')
      .update({
        is_archived: true,
        tenant_id: tenantId, // Atribuir ao tenant atual se era legado
      })
      .eq('id', titleId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  async unarchiveTitle(titleId) {
    const tenantId = await getCurrentTenantId();

    // Verificar permissão
    const { data: existingTitle, error: fetchError } = await supabase
      .from('activity_titles')
      .select('id, tenant_id')
      .eq('id', titleId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    if (existingTitle.tenant_id && existingTitle.tenant_id !== tenantId) {
      throw new Error('Você não tem permissão para restaurar este título');
    }

    const { data, error } = await supabase
      .from('activity_titles')
      .update({
        is_archived: false,
        tenant_id: tenantId, // Atribuir ao tenant atual se era legado
      })
      .eq('id', titleId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  async getTitleUsageCount(titleId) {
    const { count, error } = await supabase
      .from('training_activities')
      .select('id', { count: 'exact', head: true })
      .eq('title_id', titleId);

    if (error) throw new Error(error.message);
    return { count: count || 0 };
  },

  // Session Files
  async uploadSessionFile(sessionId, file, title) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    // Debug: Log file info
    console.log('uploadSessionFile received:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      isFile: file instanceof File,
      isBlob: file instanceof Blob,
    });

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/${sessionId}/${Date.now()}.${fileExt}`;

    // Determine correct MIME type
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/json') {
      // Fallback based on extension
      const mimeMap = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'webm': 'video/webm',
      };
      mimeType = mimeMap[fileExt.toLowerCase()] || 'application/octet-stream';
    }

    console.log('Using MIME type:', mimeType);

    // Read file as ArrayBuffer and create a proper Blob
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mimeType });

    const { error: uploadError } = await supabase.storage
      .from('session-files')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(uploadError.message || 'Erro ao fazer upload do arquivo');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('session-files')
      .getPublicUrl(fileName);

    // Save file reference in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('training_activity_files')
      .insert([{
        session_id: sessionId,
        tenant_id: tenantId,
        title: title,
        file_name: file.name,
        file_path: fileName,
        mime_type: file.type,
        file_size: file.size,
        url: urlData.publicUrl
      }])
      .select()
      .single();

    if (dbError) {
      // Try to delete uploaded file if DB insert fails
      await supabase.storage.from('session-files').remove([fileName]);
      throw new Error(dbError.message || 'Erro ao salvar referência do arquivo');
    }

    return { data: fileRecord };
  },

  async getSessionFiles(sessionId) {
    const { data, error } = await supabase
      .from('training_activity_files')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw new Error(error.message);
    return { data: data || [] };
  },

  async deleteSessionFile(fileId) {
    const { error } = await supabase
      .from('training_activity_files')
      .delete()
      .eq('id', fileId);

    if (error) throw new Error(error.message);
    return { data: { message: 'Arquivo deletado' } };
  },

  async getSessionFile(fileId) {
    const { data, error } = await supabase
      .from('training_activity_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) throw new Error(error.message);
    return { data };
  },

  // Statistics
  async getStats(params = {}) {
    const tenantId = await getCurrentTenantId();
    const { period = 'month', start_date, end_date, clubId } = params;

    // Calcular datas baseado no período
    let startDate, endDate;
    const today = new Date();

    if (period === 'custom' && start_date && end_date) {
      startDate = start_date;
      endDate = end_date;
    } else if (period === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else if (period === '3months') {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      startDate = threeMonthsAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else { // month (default)
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }

    // Buscar todas as sessões do período com atividades relacionadas
    console.log('Stats query:', { tenantId, clubId, startDate, endDate, period });

    // Se tiver clubId, primeiro buscar os microcycle_ids do clube
    let microcycleIds = null;
    if (clubId) {
      const { data: microcycles, error: microcycleError } = await supabase
        .from('training_microcycles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('club_id', clubId);

      if (microcycleError) {
        console.error('Error loading microcycles for stats:', microcycleError);
        throw new Error(microcycleError.message);
      }

      microcycleIds = microcycles?.map(m => m.id) || [];
      console.log('Filtered by club, microcycle_ids:', microcycleIds.length);

      // Se não há microciclos para esse clube, retornar stats vazias
      if (microcycleIds.length === 0) {
        return {
          data: {
            totalSessions: 0,
            totalMinutes: 0,
            avgMinutesPerSession: 0,
            utilizationRate: 0,
            contentDistribution: [],
            durationByDay: [],
            topTitles: [],
            groupDistribution: [],
          }
        };
      }
    }

    // Build query
    let query = supabase
      .from('training_sessions')
      .select(`
        *,
        blocks:training_activity_blocks(
          *,
          activity:training_activities(
            *,
            title:activity_titles(title),
            contents:training_activity_contents(
              content:contents(*)
            ),
            stages:training_activity_stages(*)
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('session_type', 'training')
      .order('date', { ascending: true });

    // Filter by microcycle_ids if we have them (when clubId is provided)
    if (microcycleIds) {
      query = query.in('microcycle_id', microcycleIds);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error('Error loading stats:', sessionsError);
      throw new Error(sessionsError.message);
    }

    console.log('Stats sessions found:', sessions?.length, 'sessions');

    // Processar dados para estatísticas
    // Contar apenas sessões que TÊM atividades (não vazias)
    let sessionsWithActivities = 0;
    let totalMinutes = 0;
    const contentMap = new Map();
    const titleMap = new Map();
    const groupMap = new Map();
    const dayMap = new Map(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(d => [d, 0]));

    sessions?.forEach(session => {
      const dayName = session.day_name;
      let hasActivities = false;

      session.blocks?.forEach(block => {
        // Converter activity de array para objeto (fix Supabase)
        let activity = block.activity;
        if (Array.isArray(activity)) {
          activity = activity.length > 0 ? activity[0] : null;
        }

        if (activity) {
          hasActivities = true; // Marcar que esta sessão tem atividades
          const duration = activity.duration_minutes || 0;
          totalMinutes += duration;

          // Duração por dia
          if (dayName) {
            dayMap.set(dayName, (dayMap.get(dayName) || 0) + duration);
          }

          // Conteúdos
          if (activity.contents) {
            activity.contents.forEach(contentItem => {
              const content = contentItem.content || contentItem;
              if (content && content.name) {
                const current = contentMap.get(content.name) || {
                  name: content.name,
                  abbr: content.abbreviation || content.name.slice(0, 6),
                  value: 0,
                  color: getColorForContent(content.name)
                };
                current.value += duration;
                contentMap.set(content.name, current);
              }
            });
          }

          // Temas (titles)
          if (activity.title && activity.title.title) {
            const titleName = activity.title.title;
            titleMap.set(titleName, (titleMap.get(titleName) || 0) + 1);
          }

          // Grupos
          if (activity.groups && Array.isArray(activity.groups)) {
            activity.groups.forEach(group => {
              if (group) {
                groupMap.set(group, (groupMap.get(group) || 0) + duration);
              }
            });
          }
        }
      });

      // Incrementar contador se a sessão tem pelo menos uma atividade
      if (hasActivities) {
        sessionsWithActivities++;
      }
    });

    // Formatar dados para retorno
    const contentDistribution = Array.from(contentMap.values())
      .sort((a, b) => b.value - a.value);

    const topTitles = Array.from(titleMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);

    const groupDistribution = Array.from(groupMap.entries())
      .map(([group, minutes]) => ({ group, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    const durationByDay = Array.from(dayMap.entries())
      .map(([day, minutes]) => ({ day, minutes }));

    const avgMinutesPerSession = sessionsWithActivities > 0 ? Math.round(totalMinutes / sessionsWithActivities) : 0;

    console.log('Stats computed:', {
      totalSessionsInDB: sessions?.length,
      sessionsWithActivities,
      totalMinutes,
      avgMinutesPerSession
    });

    return {
      data: {
        totalSessions: sessionsWithActivities, // Usar sessões que têm atividades
        totalMinutes,
        avgMinutesPerSession,
        utilizationRate: 0, // TODO: calcular baseado em meta
        contentDistribution,
        durationByDay,
        topTitles,
        groupDistribution,
      }
    };
  },
};
