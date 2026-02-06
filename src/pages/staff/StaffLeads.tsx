import { useState, useEffect } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Phone, 
  Mail, 
  Car,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLeads, Lead, LeadStatus, LEAD_STATUS_CONFIG, LEAD_PRIORITY_CONFIG } from '@/hooks/useLeads';
import { LeadPipeline } from '@/components/leads/LeadPipeline';
import { LeadMetrics } from '@/components/leads/LeadMetrics';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog';
import { AddLeadDialog } from '@/components/leads/AddLeadDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ViewMode = 'pipeline' | 'list';
type FilterMode = 'all' | 'mine' | 'unassigned' | 'follow_up';

export default function StaffLeads() {
  const { user } = useAuth();
  const { 
    leads, 
    loading, 
    metrics, 
    createLead, 
    updateLead, 
    updateLeadStatus,
    deleteLead, 
    logActivity, 
    getLeadActivities,
    recordDeposit 
  } = useLeads();
  
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchServiceCategories();
  }, []);

  const fetchServiceCategories = async () => {
    const { data } = await supabase
      .from('services')
      .select('category')
      .eq('is_active', true);
    
    if (data) {
      const unique = [...new Set(data.map(s => s.category))];
      setServiceCategories(unique);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailDialogOpen(true);
  };

  const filteredLeads = leads.filter(lead => {
    // Filter by mode
    if (filterMode === 'mine' && lead.assigned_to !== user?.id) return false;
    if (filterMode === 'unassigned' && lead.assigned_to) return false;
    if (filterMode === 'follow_up') {
      if (!lead.next_follow_up_at) return false;
      if (new Date(lead.next_follow_up_at) > new Date()) return false;
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.vehicle_make?.toLowerCase().includes(query) ||
        lead.vehicle_model?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background staff-theme pb-24 md:pb-8">
      <StaffNav />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                <Target className="w-7 h-7 text-primary" strokeWidth={1.5} />
                Lead Management
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Track and manage sales leads
              </p>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </motion.div>

        {/* Metrics */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <LeadMetrics metrics={metrics} />
        </motion.div>

        {/* Filters & View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <TabsList>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="mine" className="text-xs">Mine</TabsTrigger>
                <TabsTrigger value="unassigned" className="text-xs">
                  Open
                  {metrics.unassigned > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                      {metrics.unassigned}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="follow_up" className="text-xs">
                  Follow Up
                  {metrics.needsFollowUp > 0 && (
                    <Badge className="ml-1 h-4 px-1 text-[10px] bg-orange-500">
                      {metrics.needsFollowUp}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'pipeline' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('pipeline')}
                className="rounded-none h-9 w-9"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-none h-9 w-9"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
        ) : filteredLeads.length === 0 ? (
          <ChromeSurface className="text-center py-12">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No leads found</p>
            <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Lead
            </Button>
          </ChromeSurface>
        ) : viewMode === 'pipeline' ? (
          <LeadPipeline
            leads={filteredLeads}
            onLeadClick={handleLeadClick}
            onStatusChange={updateLeadStatus}
          />
        ) : (
          <ChromeSurface className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Quote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const statusConfig = LEAD_STATUS_CONFIG[lead.status];
                  const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date();
                  
                  return (
                    <TableRow 
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleLeadClick(lead)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lead.priority !== 'normal' && (
                            <AlertTriangle className={`h-4 w-4 ${lead.priority === 'urgent' ? 'text-destructive' : 'text-orange-500'}`} />
                          )}
                          <span className="font-medium">{lead.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(lead.vehicle_make || lead.vehicle_model) ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            {[lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="ml-1 text-xs">
                            Overdue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {lead.assigned_profile?.full_name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.last_contact_at ? (
                          formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true })
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.quoted_amount ? (
                          <span className="font-medium text-primary">
                            R{lead.quoted_amount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ChromeSurface>
        )}
      </main>

      {/* Dialogs */}
      <AddLeadDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={createLead}
        serviceCategories={serviceCategories}
      />

      <LeadDetailDialog
        lead={selectedLead}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdate={updateLead}
        onDelete={deleteLead}
        onLogActivity={logActivity}
        getActivities={getLeadActivities}
        onRecordDeposit={recordDeposit}
      />
    </div>
  );
}
