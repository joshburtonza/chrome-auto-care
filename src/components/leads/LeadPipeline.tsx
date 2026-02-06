import { useState } from 'react';
import { Lead, LeadStatus, LEAD_STATUS_CONFIG, useLeads } from '@/hooks/useLeads';
import { LeadCard } from './LeadCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface LeadPipelineProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus, oldStatus: LeadStatus) => Promise<boolean>;
}

const PIPELINE_STATUSES: LeadStatus[] = ['new', 'contacted', 'quoted', 'follow_up', 'deposit_paid', 'booked'];

export function LeadPipeline({ leads, onLeadClick, onStatusChange }: LeadPipelineProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    
    if (draggedLead && draggedLead.status !== newStatus) {
      await onStatusChange(draggedLead.id, newStatus, draggedLead.status);
    }
    setDraggedLead(null);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStatus(null);
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {PIPELINE_STATUSES.map((status) => {
          const config = LEAD_STATUS_CONFIG[status];
          const statusLeads = getLeadsByStatus(status);
          const isDragOver = dragOverStatus === status;

          return (
            <div
              key={status}
              className={`
                flex-shrink-0 w-[280px] rounded-lg 
                ${config.bgColor} 
                ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}
                transition-all
              `}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${config.color}`}>{config.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {statusLeads.length}
                  </Badge>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
                {statusLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No leads
                  </div>
                ) : (
                  statusLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                    >
                      <LeadCard
                        lead={lead}
                        onClick={() => onLeadClick(lead)}
                        isDragging={draggedLead?.id === lead.id}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
