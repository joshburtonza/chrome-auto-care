import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Lead, 
  LeadActivity, 
  LeadStatus, 
  LeadPriority, 
  ActivityType,
  LEAD_STATUS_CONFIG, 
  LEAD_PRIORITY_CONFIG,
  LEAD_SOURCE_OPTIONS,
  ACTIVITY_TYPE_CONFIG
} from '@/hooks/useLeads';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Mail, Car, Calendar, User, DollarSign, Loader2, Trash2, ArrowRightCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  full_name: string | null;
}

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onLogActivity: (leadId: string, type: ActivityType, description: string, metadata?: Record<string, any>) => Promise<boolean>;
  getActivities: (leadId: string) => Promise<LeadActivity[]>;
  onRecordDeposit: (leadId: string, amount: number) => Promise<boolean>;
}

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'quoted', 'follow_up', 'deposit_paid', 'booked', 'lost'];
const PRIORITY_OPTIONS: LeadPriority[] = ['normal', 'high', 'urgent'];
const ACTIVITY_OPTIONS: ActivityType[] = ['call', 'whatsapp', 'email', 'quote_sent', 'follow_up', 'note'];

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onLogActivity,
  getActivities,
  onRecordDeposit,
}: LeadDetailDialogProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form states
  const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
  const [newActivityType, setNewActivityType] = useState<ActivityType>('note');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [quotedAmount, setQuotedAmount] = useState('');

  useEffect(() => {
    if (lead && open) {
      setEditedLead(lead);
      setQuotedAmount(lead.quoted_amount?.toString() || '');
      setDepositAmount('');
      loadActivities();
      fetchStaffMembers();
    }
  }, [lead, open]);

  const loadActivities = async () => {
    if (!lead) return;
    setLoadingActivities(true);
    const data = await getActivities(lead.id);
    setActivities(data);
    setLoadingActivities(false);
  };

  const fetchStaffMembers = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['staff', 'admin']);

    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      setStaffMembers(profiles || []);
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    
    const updates: Partial<Lead> = {
      ...editedLead,
      quoted_amount: quotedAmount ? parseFloat(quotedAmount) : null,
    };
    
    await onUpdate(lead.id, updates);
    setSaving(false);
  };

  const handleAddActivity = async () => {
    if (!lead || !newActivityDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    await onLogActivity(lead.id, newActivityType, newActivityDescription);
    setNewActivityDescription('');
    loadActivities();
  };

  const handleRecordDeposit = async () => {
    if (!lead || !depositAmount) {
      toast.error('Please enter a deposit amount');
      return;
    }
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    await onRecordDeposit(lead.id, amount);
    setDepositAmount('');
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!lead) return;
    await onDelete(lead.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  if (!lead) return null;

  const statusConfig = LEAD_STATUS_CONFIG[lead.status];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{lead.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={statusConfig.bgColor + ' ' + statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                  {lead.priority !== 'normal' && (
                    <Badge className={LEAD_PRIORITY_CONFIG[lead.priority].color}>
                      {LEAD_PRIORITY_CONFIG[lead.priority].label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 h-[60vh]">
              {/* Details Tab */}
              <TabsContent value="details" className="p-4 space-y-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
                  </div>
                  {lead.email && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.email}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vehicle */}
                {(lead.vehicle_make || lead.vehicle_model) && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Vehicle</Label>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {[lead.vehicle_year, lead.vehicle_make, lead.vehicle_model, lead.vehicle_color]
                          .filter(Boolean)
                          .join(' ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Service Interest */}
                {lead.service_interest.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Interested In</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.service_interest.map(s => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editable Fields */}
                <div className="border-t pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={editedLead.status || lead.status}
                        onValueChange={(v) => setEditedLead(prev => ({ ...prev, status: v as LeadStatus }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={editedLead.priority || lead.priority}
                        onValueChange={(v) => setEditedLead(prev => ({ ...prev, priority: v as LeadPriority }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map(p => (
                            <SelectItem key={p} value={p}>{LEAD_PRIORITY_CONFIG[p].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Assigned To</Label>
                      <Select
                        value={editedLead.assigned_to || lead.assigned_to || 'unassigned'}
                        onValueChange={(v) => setEditedLead(prev => ({ ...prev, assigned_to: v === 'unassigned' ? null : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {staffMembers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.full_name || 'Unknown'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quoted Amount (R)</Label>
                      <Input
                        type="number"
                        value={quotedAmount}
                        onChange={(e) => setQuotedAmount(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Next Follow-up</Label>
                    <Input
                      type="date"
                      value={editedLead.next_follow_up_at?.split('T')[0] || lead.next_follow_up_at?.split('T')[0] || ''}
                      onChange={(e) => setEditedLead(prev => ({ 
                        ...prev, 
                        next_follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                      }))}
                    />
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={editedLead.notes ?? lead.notes ?? ''}
                      onChange={(e) => setEditedLead(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="p-4">
                {/* Add Activity Form */}
                <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium mb-2 block">Log Activity</Label>
                  <div className="flex gap-2 mb-2">
                    <Select value={newActivityType} onValueChange={(v) => setNewActivityType(v as ActivityType)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_OPTIONS.map(a => (
                          <SelectItem key={a} value={a}>{ACTIVITY_TYPE_CONFIG[a].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Description..."
                      value={newActivityDescription}
                      onChange={(e) => setNewActivityDescription(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddActivity} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Activity Timeline */}
                {loadingActivities ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : (
                  <LeadActivityTimeline activities={activities} />
                )}
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="p-4 space-y-4">
                {/* Record Deposit */}
                {lead.status !== 'booked' && lead.status !== 'deposit_paid' && (
                  <div className="p-4 border rounded-lg">
                    <Label className="text-sm font-medium mb-2 block">Record Deposit</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount (R)"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                      <Button onClick={handleRecordDeposit}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Record
                      </Button>
                    </div>
                  </div>
                )}

                {/* Convert to Booking */}
                {lead.status === 'deposit_paid' && !lead.converted_to_booking_id && (
                  <div className="p-4 border rounded-lg border-primary/50 bg-primary/5">
                    <Label className="text-sm font-medium mb-2 block">Ready for Booking</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Deposit has been received. Convert this lead to a booking.
                    </p>
                    <Button className="w-full">
                      <ArrowRightCircle className="h-4 w-4 mr-2" />
                      Convert to Booking
                    </Button>
                  </div>
                )}

                {/* Delete Lead */}
                <div className="p-4 border border-destructive/30 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block text-destructive">Danger Zone</Label>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Lead
                  </Button>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lead and all associated activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
