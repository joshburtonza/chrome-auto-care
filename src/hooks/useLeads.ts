import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'follow_up' | 'deposit_paid' | 'booked' | 'lost';
export type LeadPriority = 'normal' | 'high' | 'urgent';
export type LeadSource = 'whatsapp' | 'email' | 'phone' | 'walk_in' | 'referral' | 'website';
export type ActivityType = 'call' | 'whatsapp' | 'email' | 'quote_sent' | 'follow_up' | 'note' | 'status_change' | 'deposit_received';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: string | null;
  vehicle_color: string | null;
  service_interest: string[];
  notes: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  assigned_to: string | null;
  created_by: string | null;
  quoted_amount: number | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  converted_to_booking_id: string | null;
  // Joined data
  assigned_profile?: { full_name: string | null } | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: ActivityType;
  description: string | null;
  created_by: string | null;
  created_at: string;
  metadata: Record<string, any>;
  // Joined data
  created_by_profile?: { full_name: string | null } | null;
}

export interface LeadFormData {
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  vehicle_color?: string;
  service_interest: string[];
  notes?: string;
  priority: LeadPriority;
  assigned_to?: string | null;
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  contacted: { label: 'Contacted', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  quoted: { label: 'Quoted', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  follow_up: { label: 'Follow Up', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  deposit_paid: { label: 'Deposit Paid', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  booked: { label: 'Booked', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  lost: { label: 'Lost', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
};

export const LEAD_PRIORITY_CONFIG: Record<LeadPriority, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'bg-muted text-muted-foreground' },
  high: { label: 'High', color: 'bg-orange-500 text-white' },
  urgent: { label: 'Urgent', color: 'bg-destructive text-destructive-foreground' },
};

export const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
];

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: string }> = {
  call: { label: 'Phone Call', icon: 'Phone' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle' },
  email: { label: 'Email', icon: 'Mail' },
  quote_sent: { label: 'Quote Sent', icon: 'FileText' },
  follow_up: { label: 'Follow Up', icon: 'Clock' },
  note: { label: 'Note', icon: 'StickyNote' },
  status_change: { label: 'Status Change', icon: 'ArrowRightLeft' },
  deposit_received: { label: 'Deposit Received', icon: 'Banknote' },
};

export function useLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch assigned profiles
      const assignedIds = [...new Set((data || []).filter(l => l.assigned_to).map(l => l.assigned_to!))];
      let profilesMap = new Map<string, { full_name: string | null }>();
      
      if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', assignedIds);
        
        profiles?.forEach(p => profilesMap.set(p.id, { full_name: p.full_name }));
      }

      const enrichedLeads: Lead[] = (data || []).map(lead => ({
        ...lead,
        source: lead.source as LeadSource,
        status: lead.status as LeadStatus,
        priority: lead.priority as LeadPriority,
        service_interest: lead.service_interest || [],
        assigned_profile: lead.assigned_to ? profilesMap.get(lead.assigned_to) : null,
      }));

      setLeads(enrichedLeads);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const createLead = async (data: LeadFormData): Promise<Lead | null> => {
    try {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          ...data,
          created_by: user?.id,
          last_contact_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logActivity(newLead.id, 'note', 'Lead created');

      toast.success('Lead created successfully');
      await fetchLeads();
      return newLead as Lead;
    } catch (err: any) {
      console.error('Error creating lead:', err);
      toast.error('Failed to create lead');
      return null;
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Lead updated');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('Error updating lead:', err);
      toast.error('Failed to update lead');
      return false;
    }
  };

  const updateLeadStatus = async (id: string, newStatus: LeadStatus, oldStatus: LeadStatus): Promise<boolean> => {
    try {
      const updates: Partial<Lead> = {
        status: newStatus,
        last_contact_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log activity
      await logActivity(id, 'status_change', `Status changed from ${oldStatus} to ${newStatus}`, {
        old_status: oldStatus,
        new_status: newStatus,
      });

      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('Error updating lead status:', err);
      toast.error('Failed to update status');
      return false;
    }
  };

  const deleteLead = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Lead deleted');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      toast.error('Failed to delete lead');
      return false;
    }
  };

  const logActivity = async (
    leadId: string, 
    activityType: ActivityType, 
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          activity_type: activityType,
          description,
          created_by: user?.id,
          metadata,
        });

      if (error) throw error;

      // Update last_contact_at
      await supabase
        .from('leads')
        .update({ last_contact_at: new Date().toISOString() })
        .eq('id', leadId);

      return true;
    } catch (err: any) {
      console.error('Error logging activity:', err);
      return false;
    }
  };

  const getLeadActivities = async (leadId: string): Promise<LeadActivity[]> => {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles
      const creatorIds = [...new Set((data || []).filter(a => a.created_by).map(a => a.created_by!))];
      let profilesMap = new Map<string, { full_name: string | null }>();
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        
        profiles?.forEach(p => profilesMap.set(p.id, { full_name: p.full_name }));
      }

      return (data || []).map(activity => ({
        ...activity,
        activity_type: activity.activity_type as ActivityType,
        metadata: (activity.metadata as Record<string, any>) || {},
        created_by_profile: activity.created_by ? profilesMap.get(activity.created_by) : null,
      }));
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      return [];
    }
  };

  const recordDeposit = async (leadId: string, amount: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          deposit_amount: amount,
          deposit_paid_at: new Date().toISOString(),
          status: 'deposit_paid',
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      await logActivity(leadId, 'deposit_received', `Deposit of R${amount.toLocaleString()} received`, { amount });

      toast.success('Deposit recorded');
      await fetchLeads();
      return true;
    } catch (err: any) {
      console.error('Error recording deposit:', err);
      toast.error('Failed to record deposit');
      return false;
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Computed metrics
  const metrics = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    unassigned: leads.filter(l => !l.assigned_to).length,
    needsFollowUp: leads.filter(l => 
      l.next_follow_up_at && new Date(l.next_follow_up_at) <= new Date()
    ).length,
    conversionRate: leads.length > 0 
      ? Math.round((leads.filter(l => l.status === 'booked' || l.status === 'deposit_paid').length / leads.filter(l => l.status !== 'new').length) * 100) || 0
      : 0,
    bySource: LEAD_SOURCE_OPTIONS.reduce((acc, source) => {
      acc[source.value] = leads.filter(l => l.source === source.value).length;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    leads,
    loading,
    error,
    metrics,
    fetchLeads,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
    logActivity,
    getLeadActivities,
    recordDeposit,
  };
}
