import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotPickerProps {
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  availableSlots: string[];
}

export const TimeSlotPicker = ({ selectedTime, onSelectTime, availableSlots }: TimeSlotPickerProps) => {
  // Default time slots
  const timeSlots = availableSlots.length > 0 ? availableSlots : [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
  ];

  return (
    <div>
      <div className="chrome-label mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" strokeWidth={1.4} />
        SELECT TIME SLOT
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {timeSlots.map((time) => (
          <button
            key={time}
            onClick={() => onSelectTime(time)}
            className={cn(
              'p-3 rounded-lg border transition-all text-sm',
              selectedTime === time
                ? 'chrome-surface border-primary chrome-glow text-primary'
                : 'bg-background-alt border-border hover:border-primary/50 text-foreground hover:chrome-surface'
            )}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
};
