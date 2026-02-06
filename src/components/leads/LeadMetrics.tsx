import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Target, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface LeadMetricsProps {
  metrics: {
    total: number;
    new: number;
    unassigned: number;
    needsFollowUp: number;
    conversionRate: number;
    bySource: Record<string, number>;
  };
}

export function LeadMetrics({ metrics }: LeadMetricsProps) {
  const cards = [
    {
      label: 'Total Leads',
      value: metrics.total,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'New This Week',
      value: metrics.new,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Unassigned',
      value: metrics.unassigned,
      icon: AlertCircle,
      color: metrics.unassigned > 0 ? 'text-destructive' : 'text-muted-foreground',
      bgColor: metrics.unassigned > 0 ? 'bg-destructive/10' : 'bg-muted',
      alert: metrics.unassigned > 0,
    },
    {
      label: 'Needs Follow-up',
      value: metrics.needsFollowUp,
      icon: Clock,
      color: metrics.needsFollowUp > 0 ? 'text-orange-500' : 'text-muted-foreground',
      bgColor: metrics.needsFollowUp > 0 ? 'bg-orange-500/10' : 'bg-muted',
    },
    {
      label: 'Conversion Rate',
      value: `${metrics.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <ChromeSurface
          key={card.label}
          className={`p-4 ${card.alert ? 'border-destructive/50' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        </ChromeSurface>
      ))}
    </div>
  );
}
