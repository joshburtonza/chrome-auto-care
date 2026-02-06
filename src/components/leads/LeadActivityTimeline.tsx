import { LeadActivity, ACTIVITY_TYPE_CONFIG } from '@/hooks/useLeads';
import { formatDistanceToNow, format } from 'date-fns';
import { Phone, MessageCircle, Mail, FileText, Clock, StickyNote, ArrowRightLeft, Banknote } from 'lucide-react';

interface LeadActivityTimelineProps {
  activities: LeadActivity[];
}

const ICON_MAP: Record<string, typeof Phone> = {
  Phone,
  MessageCircle,
  Mail,
  FileText,
  Clock,
  StickyNote,
  ArrowRightLeft,
  Banknote,
};

export function LeadActivityTimeline({ activities }: LeadActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activities recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const config = ACTIVITY_TYPE_CONFIG[activity.activity_type];
        const Icon = ICON_MAP[config?.icon] || StickyNote;
        
        return (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className="p-2 rounded-full bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {index < activities.length - 1 && (
                <div className="w-px flex-1 bg-border mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{config?.label || activity.activity_type}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
              {activity.description && (
                <p className="text-sm text-muted-foreground">{activity.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                by {activity.created_by_profile?.full_name || 'System'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
