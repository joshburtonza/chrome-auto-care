import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessTemplateStage {
  id: string;
  template_id: string;
  stage_name: string;
  stage_order: number;
  description: string | null;
  requires_photo: boolean;
  estimated_duration_minutes: number | null;
  created_at: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description: string | null;
  service_id: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stages?: ProcessTemplateStage[];
}

export const useProcessTemplates = () => {
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('process_templates')
        .select('*')
        .order('name');

      if (templatesError) throw templatesError;

      // Fetch stages for each template
      const templatesWithStages = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: stages } = await supabase
            .from('process_template_stages')
            .select('*')
            .eq('template_id', template.id)
            .order('stage_order');

          return { ...template, stages: stages || [] };
        })
      );

      setTemplates(templatesWithStages);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (
    name: string,
    description?: string,
    serviceId?: string,
    isDefault?: boolean
  ): Promise<ProcessTemplate | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('process_templates')
        .insert({
          name,
          description: description || null,
          service_id: serviceId || null,
          is_default: isDefault || false,
        })
        .select()
        .single();

      if (createError) throw createError;
      await fetchTemplates();
      return data;
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  }, [fetchTemplates]);

  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<Pick<ProcessTemplate, 'name' | 'description' | 'service_id' | 'is_default' | 'is_active'>>
  ): Promise<ProcessTemplate | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('process_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      await fetchTemplates();
      return data;
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('process_templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchTemplates();
      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  }, [fetchTemplates]);

  const addStage = useCallback(async (
    templateId: string,
    stageName: string,
    stageOrder: number,
    description?: string,
    requiresPhoto?: boolean,
    estimatedDuration?: number
  ): Promise<ProcessTemplateStage | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('process_template_stages')
        .insert({
          template_id: templateId,
          stage_name: stageName,
          stage_order: stageOrder,
          description: description || null,
          requires_photo: requiresPhoto || false,
          estimated_duration_minutes: estimatedDuration || null,
        })
        .select()
        .single();

      if (createError) throw createError;
      await fetchTemplates();
      return data;
    } catch (err) {
      console.error('Error adding stage:', err);
      throw err;
    }
  }, [fetchTemplates]);

  const updateStage = useCallback(async (
    stageId: string,
    updates: Partial<Pick<ProcessTemplateStage, 'stage_name' | 'stage_order' | 'description' | 'requires_photo' | 'estimated_duration_minutes'>>
  ): Promise<ProcessTemplateStage | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('process_template_stages')
        .update(updates)
        .eq('id', stageId)
        .select()
        .single();

      if (updateError) throw updateError;
      await fetchTemplates();
      return data;
    } catch (err) {
      console.error('Error updating stage:', err);
      throw err;
    }
  }, [fetchTemplates]);

  const deleteStage = useCallback(async (stageId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('process_template_stages')
        .delete()
        .eq('id', stageId);

      if (deleteError) throw deleteError;
      await fetchTemplates();
      return true;
    } catch (err) {
      console.error('Error deleting stage:', err);
      throw err;
    }
  }, [fetchTemplates]);

  const getTemplateForService = useCallback((serviceId: string): ProcessTemplate | undefined => {
    return templates.find(t => t.service_id === serviceId && t.is_active);
  }, [templates]);

  const getDefaultTemplate = useCallback((): ProcessTemplate | undefined => {
    return templates.find(t => t.is_default && t.is_active);
  }, [templates]);

  useEffect(() => {
    fetchTemplates();

    // Set up realtime subscriptions
    const templatesChannel = supabase
      .channel('templates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'process_templates' },
        () => fetchTemplates()
      )
      .subscribe();

    const stagesChannel = supabase
      .channel('template-stages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'process_template_stages' },
        () => fetchTemplates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(templatesChannel);
      supabase.removeChannel(stagesChannel);
    };
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    error,
    refresh: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addStage,
    updateStage,
    deleteStage,
    getTemplateForService,
    getDefaultTemplate,
  };
};
