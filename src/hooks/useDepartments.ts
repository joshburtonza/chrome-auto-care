import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useDepartments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setDepartments(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDepartment = useCallback(async (
    name: string,
    description?: string,
    managerId?: string
  ): Promise<Department | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('departments')
        .insert({
          name,
          description: description || null,
          manager_id: managerId || null,
        })
        .select()
        .single();

      if (createError) throw createError;
      await fetchDepartments();
      return data;
    } catch (err) {
      console.error('Error creating department:', err);
      throw err;
    }
  }, [fetchDepartments]);

  const updateDepartment = useCallback(async (
    id: string,
    updates: Partial<Pick<Department, 'name' | 'description' | 'manager_id' | 'is_active'>>
  ): Promise<Department | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      await fetchDepartments();
      return data;
    } catch (err) {
      console.error('Error updating department:', err);
      throw err;
    }
  }, [fetchDepartments]);

  const deleteDepartment = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchDepartments();
      return true;
    } catch (err) {
      console.error('Error deleting department:', err);
      throw err;
    }
  }, [fetchDepartments]);

  useEffect(() => {
    fetchDepartments();

    // Set up realtime subscription
    const channel = supabase
      .channel('departments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        () => fetchDepartments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDepartments]);

  return {
    departments,
    loading,
    error,
    refresh: fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
};
