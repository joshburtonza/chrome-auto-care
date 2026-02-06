import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { MessageSquare, Users, Target, Banknote, Smartphone, Award } from 'lucide-react';

const PROTOCOLS = [
  {
    icon: MessageSquare,
    title: 'Official Channels Only',
    description: 'All enquiries through WhatsApp Business or official email only',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Users,
    title: 'Shared Responsibility',
    description: 'See a lead, respond to it. No lead goes unanswered.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Target,
    title: 'Track Every Lead',
    description: 'Every lead must be tracked until closed. No exceptions.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: Banknote,
    title: 'No Booking Without Deposit',
    description: 'All bookings require deposit before confirmation.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Smartphone,
    title: 'App Handover Mandatory',
    description: 'Technicians work only from app. No verbal or side instructions.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Award,
    title: 'One Team. One Standard.',
    description: 'Unified processes. Consistent quality. Every time.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
];

export function TeamProtocols() {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        Team Protocols
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROTOCOLS.map((protocol, index) => (
          <ChromeSurface key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${protocol.bgColor}`}>
                <protocol.icon className={`h-4 w-4 ${protocol.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-sm">{protocol.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{protocol.description}</p>
              </div>
            </div>
          </ChromeSurface>
        ))}
      </div>
    </div>
  );
}
