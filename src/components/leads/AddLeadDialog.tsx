import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import { LeadFormData, LeadPriority, LeadSource, LEAD_SOURCE_OPTIONS } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';

interface StaffMember {
  id: string;
  full_name: string | null;
}

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LeadFormData) => Promise<any>;
  serviceCategories: string[];
}

const PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function AddLeadDialog({ open, onOpenChange, onSubmit, serviceCategories }: AddLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    phone: '',
    email: '',
    source: 'whatsapp',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    service_interest: [],
    notes: '',
    priority: 'normal',
    assigned_to: null,
  });

  useEffect(() => {
    if (open) {
      fetchStaffMembers();
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await onSubmit(formData);
    
    setLoading(false);
    
    if (result) {
      setFormData({
        name: '',
        phone: '',
        email: '',
        source: 'whatsapp',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: '',
        vehicle_color: '',
        service_interest: [],
        notes: '',
        priority: 'normal',
        assigned_to: null,
      });
      onOpenChange(false);
    }
  };

  const toggleServiceInterest = (category: string) => {
    setFormData(prev => ({
      ...prev,
      service_interest: prev.service_interest.includes(category)
        ? prev.service_interest.filter(c => c !== category)
        : [...prev.service_interest, category],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contact name"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email address"
              />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(v) => setFormData(prev => ({ ...prev, source: v as LeadSource }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium text-muted-foreground mb-2 block">Vehicle Details</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Make"
                value={formData.vehicle_make}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_make: e.target.value }))}
              />
              <Input
                placeholder="Model"
                value={formData.vehicle_model}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
              />
              <Input
                placeholder="Year"
                value={formData.vehicle_year}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_year: e.target.value }))}
              />
              <Input
                placeholder="Color"
                value={formData.vehicle_color}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_color: e.target.value }))}
              />
            </div>
          </div>

          {/* Service Interest */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Service Interest</Label>
            <div className="flex flex-wrap gap-2">
              {serviceCategories.map((cat) => (
                <Badge
                  key={cat}
                  variant={formData.service_interest.includes(cat) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleServiceInterest(cat)}
                >
                  {cat}
                  {formData.service_interest.includes(cat) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Priority & Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v as LeadPriority }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to || 'unassigned'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v === 'unassigned' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staffMembers.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.full_name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
