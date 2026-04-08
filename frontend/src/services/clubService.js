import { supabase, getCurrentTenantId } from '../lib/supabase';

export const clubService = {
  /**
   * Get all clubs for the current user
   * @returns {Promise<Array>} List of clubs
   */
  async getAll() {
    const tenantId = await getCurrentTenantId();

    console.log('[clubService.getAll] Current tenant_id:', tenantId);

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    console.log('[clubService.getAll] Query result:', { data, error });

    if (error) {
      console.error('[clubService.getAll] Error:', error);
      throw new Error(error.message || 'Erro ao buscar clubes');
    }

    console.log('[clubService.getAll] Returning', data?.length || 0, 'clubs');
    return data || [];
  },

  /**
   * Get logo URL from Supabase Storage
   * @param {string} logoPath - Path to logo in storage
   * @returns {string|null} Public URL
   */
  getLogoUrl(logoPath) {
    if (!logoPath) return null;

    const { data } = supabase.storage
      .from('club-logos')
      .getPublicUrl(logoPath);

    return data?.publicUrl || null;
  },

  /**
   * Get a specific club by ID
   * @param {string} clubId - The club ID
   * @returns {Promise<Object>} Club object
   */
  async getById(clubId) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao buscar clube');
    }

    return data;
  },

  /**
   * Create a new club
   * @param {Object} clubData - Club data (name, description)
   * @returns {Promise<Object>} Created club
   */
  async create(clubData) {
    const tenantId = await getCurrentTenantId();

    console.log('[clubService.create] Creating club with tenant_id:', tenantId);
    console.log('[clubService.create] Club data:', clubData);

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const insertData = {
      tenant_id: tenantId,
      name: clubData.name,
      description: clubData.description || null,
      logo_path: null,
    };

    console.log('[clubService.create] Insert data:', insertData);

    const { data, error } = await supabase
      .from('clubs')
      .insert([insertData])
      .select()
      .single();

    console.log('[clubService.create] Insert result:', { data, error });

    if (error) {
      console.error('[clubService.create] Error:', error);
      throw new Error(error.message || 'Erro ao criar clube');
    }

    console.log('[clubService.create] Club created successfully:', data);
    return data;
  },

  /**
   * Update an existing club
   * @param {string} clubId - The club ID
   * @param {Object} clubData - Updated club data
   * @returns {Promise<Object>} Updated club
   */
  async update(clubId, clubData) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const { data, error } = await supabase
      .from('clubs')
      .update({
        name: clubData.name,
        description: clubData.description,
      })
      .eq('id', clubId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Erro ao atualizar clube');
    }

    return data;
  },

  /**
   * Upload club logo
   * @param {string} clubId - The club ID
   * @param {File} file - Image file
   * @returns {Promise<Object>} Updated club
   */
  async uploadLogo(clubId, file) {
    console.log('uploadLogo called with file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    // Get current club to delete old logo if exists
    const { data: club } = await supabase
      .from('clubs')
      .select('logo_path')
      .eq('id', clubId)
      .eq('tenant_id', tenantId)
      .single();

    // Delete old logo if exists
    if (club?.logo_path) {
      console.log('Removing old logo:', club.logo_path);
      await supabase.storage
        .from('club-logos')
        .remove([club.logo_path]);
    }

    // Upload new logo
    const fileExt = file.name.split('.').pop();
    const fileName = `${clubId}/${Date.now()}.${fileExt}`;
    const contentType = 'image/jpeg'; // Force JPEG

    console.log('Uploading with config:', {
      fileName,
      contentType,
      originalFileType: file.type,
      size: file.size
    });

    // Convert File to ArrayBuffer to ensure correct content-type
    const arrayBuffer = await file.arrayBuffer();

    console.log('File converted to ArrayBuffer, size:', arrayBuffer.byteLength);

    const { error: uploadError } = await supabase.storage
      .from('club-logos')
      .upload(fileName, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(uploadError.message || 'Erro ao fazer upload do logo');
    }

    console.log('Upload successful, updating club record...');

    // Update club with new logo path
    const { data, error } = await supabase
      .from('clubs')
      .update({ logo_path: fileName })
      .eq('id', clubId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Club update error:', error);
      throw new Error(error.message || 'Erro ao atualizar clube');
    }

    console.log('Club updated successfully');
    return data;
  },

  /**
   * Delete a club
   * @param {string} clubId - The club ID
   * @returns {Promise<void>}
   */
  async delete(clubId) {
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase
      .from('clubs')
      .delete()
      .eq('id', clubId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(error.message || 'Erro ao excluir clube');
    }
  },
};
