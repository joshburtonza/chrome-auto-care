import { Lead, LEAD_STATUS_CONFIG, LEAD_PRIORITY_CONFIG } from '@/hooks/useLeads';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Car, User, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
}

export function LeadCard({ lead, onClick, isDragging }: LeadCardProps) {
  const statusConfig = LEAD_STATUS_CONFIG[lead.status];
  const priorityConfig = LEAD_PRIORITY_CONFIG[lead.priority];
  
  const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date();
  const vehicleInfo = [lead.vehicle_year, lead.vehicle_make, lead.vehicle_model].filter(Boolean).join(' ');

  return (
    <div
      onClick={onClick}
      className={`
        bg-card border border-border rounded-lg p-3 cursor-pointer
        hover:border-primary/50 hover:shadow-md transition-all
        ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}
      `}
    >
      {/* Priority & Follow-up Alert */}
      <div className="flex items-center gap-2 mb-2">
        {lead.priority !== 'normal' && (
          <Badge className={`${priorityConfig.color} text-xs gap-1`}>
            <AlertTriangle className="h-3 w-3" />
            {priorityConfig.label}
          </Badge>
        )}
        {isOverdue && (
          <Badge variant="destructive" className="text-xs gap-1">
            <Clock className="h-3 w-3" />
            Overdue
          </Badge>
        )}
      </div>

      {/* Name */}
      <h4 className="font-medium text-foreground mb-1 truncate">{lead.name}</h4>

      {/* Contact Info */}
      <div className="space-y-1 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3" />
          <span className="truncate">{lead.phone}</span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {/* Vehicle */}
      {vehicleInfo && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Car className="h-3 w-3 shrink-0" />
          <span className="truncate">{vehicleInfo}</span>
        </div>
      )}

      {/* Quoted Amount */}
      {lead.quoted_amount && (
        <div className="text-sm font-medium text-primary mb-2">
          R{lead.quoted_amount.toLocaleString()}
        </div>
      )}

      {/* Footer: Assigned & Last Contact */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[80px]">
            {lead.assigned_profile?.full_name || 'Unassigned'}
          </span>
        </div>
        {lead.last_contact_at && (
          <span className="text-xs">
            {formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}
