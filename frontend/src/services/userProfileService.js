import { supabase } from '../lib/supabase';

export const userProfileService = {
  /**
   * Get current user profile from Supabase Auth
   */
  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Return user profile from auth metadata
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
      phone: user.user_metadata?.phone || '',
      bio: user.user_metadata?.bio || '',
      profile_photo: user.user_metadata?.profile_photo || null,
    };
  },

  /**
   * Update user profile in auth metadata
   */
  async updateProfile(profileData) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Update user metadata in Supabase Auth
    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: profileData.name,
        phone: profileData.phone,
        bio: profileData.bio,
      }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao atualizar perfil');
    }

    return data.user;
  },

  /**
   * Get photo URL from Supabase Storage
   */
  getPhotoUrl(photoPath) {
    if (!photoPath) {
      console.log('No photo path provided');
      return null;
    }

    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(photoPath);

    console.log('Photo URL for', photoPath, ':', data?.publicUrl);
    return data?.publicUrl || null;
  },

  /**
   * Upload user profile photo
   */
  async uploadPhoto(file) {
    console.log('uploadPhoto called with file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Delete old photo if exists in user metadata
    const oldPhoto = user.user_metadata?.profile_photo;
    if (oldPhoto) {
      console.log('Removing old photo:', oldPhoto);
      await supabase.storage
        .from('profile-photos')
        .remove([oldPhoto]);
    }

    // Upload new photo
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
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
      .from('profile-photos')
      .upload(fileName, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(uploadError.message || 'Erro ao fazer upload da foto');
    }

    console.log('Upload successful, updating user metadata...');

    // Update user metadata with new photo path
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        profile_photo: fileName
      }
    });

    if (error) {
      console.error('Metadata update error:', error);
      throw new Error(error.message || 'Erro ao atualizar perfil');
    }

    console.log('User metadata updated successfully');
    return data.user;
  },

  /**
   * Change user password
   */
  async changePassword(currentPassword, newPassword) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Senha atual incorreta');
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(error.message || 'Erro ao alterar senha');
    }

    return true;
  },
};
