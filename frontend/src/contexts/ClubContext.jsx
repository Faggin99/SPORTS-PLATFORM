import { createContext, useContext, useState, useEffect } from 'react';
import { clubService } from '../services/clubService';
import { supabase, getCurrentTenantId } from '../lib/supabase';

const ClubContext = createContext();

export function ClubProvider({ children }) {
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load clubs on mount, but wait for auth session to be ready
  useEffect(() => {
    const initClubs = async () => {
      // Wait for Supabase session to be ready
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Session is ready, load clubs
        await loadClubs();
      } else {
        // No session, stop loading
        setLoading(false);
      }
    };

    initClubs();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User just signed in, load clubs
        loadClubs();
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear clubs
        setClubs([]);
        setSelectedClub(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadClubs() {
    try {
      setLoading(true);
      const data = await clubService.getAll();
      setClubs(data);

      // Auto-select first club or previously selected club from localStorage
      const savedClubId = localStorage.getItem('selectedClubId');
      if (savedClubId && data.find(c => c.id === savedClubId)) {
        setSelectedClub(data.find(c => c.id === savedClubId));
      } else if (data.length > 0) {
        setSelectedClub(data[0]);
      }
    } catch (error) {
      console.error('Error loading clubs:', error);
    } finally {
      setLoading(false);
    }
  }

  function selectClub(club) {
    setSelectedClub(club);
    if (club) {
      localStorage.setItem('selectedClubId', club.id);
    } else {
      localStorage.removeItem('selectedClubId');
    }
  }

  async function createClub(clubData) {
    try {
      // Check for duplicate name
      const duplicate = clubs.find(c => c.name.toLowerCase() === clubData.name.toLowerCase());
      if (duplicate) {
        throw new Error('Já existe um clube com este nome');
      }

      const newClub = await clubService.create(clubData);

      // If this is the first club, migrate old data
      const isFirstClub = clubs.length === 0;
      if (isFirstClub) {
        await migrateOldDataToClub(newClub.id);
      }

      setClubs([...clubs, newClub]);
      // Auto-select newly created club
      selectClub(newClub);
      return newClub;
    } catch (error) {
      console.error('Error creating club:', error);
      throw error;
    }
  }

  async function migrateOldDataToClub(clubId) {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;

      // Migrate training_microcycles without club_id
      await supabase
        .from('training_microcycles')
        .update({ club_id: clubId })
        .eq('tenant_id', tenantId)
        .is('club_id', null);

      // Migrate athletes without club_id
      await supabase
        .from('athletes')
        .update({ club_id: clubId })
        .eq('tenant_id', tenantId)
        .is('club_id', null);

      console.log('Migrated old data to club:', clubId);
    } catch (error) {
      console.error('Error migrating old data:', error);
    }
  }

  async function updateClub(clubId, clubData) {
    try {
      // Check for duplicate name (excluding current club)
      const duplicate = clubs.find(c =>
        c.id !== clubId &&
        c.name.toLowerCase() === clubData.name.toLowerCase()
      );
      if (duplicate) {
        throw new Error('Já existe um clube com este nome');
      }

      const updatedClub = await clubService.update(clubId, clubData);
      setClubs(clubs.map(c => c.id === clubId ? updatedClub : c));
      if (selectedClub?.id === clubId) {
        setSelectedClub(updatedClub);
      }
      return updatedClub;
    } catch (error) {
      console.error('Error updating club:', error);
      throw error;
    }
  }

  async function deleteClub(clubId) {
    try {
      await clubService.delete(clubId);
      const newClubs = clubs.filter(c => c.id !== clubId);
      setClubs(newClubs);

      // If deleted club was selected, select first available club
      if (selectedClub?.id === clubId) {
        if (newClubs.length > 0) {
          selectClub(newClubs[0]);
        } else {
          selectClub(null);
        }
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      throw error;
    }
  }

  async function uploadLogo(clubId, file) {
    try {
      const updatedClub = await clubService.uploadLogo(clubId, file);
      setClubs(clubs.map(c => c.id === clubId ? updatedClub : c));
      if (selectedClub?.id === clubId) {
        setSelectedClub(updatedClub);
      }
      return updatedClub;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  }

  const value = {
    clubs,
    selectedClub,
    loading,
    selectClub,
    createClub,
    updateClub,
    deleteClub,
    uploadLogo,
    refreshClubs: loadClubs,
    getLogoUrl: clubService.getLogoUrl,
  };

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}
