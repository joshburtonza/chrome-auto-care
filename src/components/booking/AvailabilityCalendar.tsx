import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { StatusBadge } from '@/components/chrome/StatusBadge';
import { cn } from '@/lib/utils';

interface Availability {
  date: string;
  status: 'available' | 'limited' | 'full' | 'unavailable';
  availableSlots: number;
  bookedSlots: number;
}

interface AvailabilityCalendarProps {
  availability: Record<string, Availability>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  className?: string;
}

export const AvailabilityCalendar = ({
  availability,
  selectedDate,
  onSelectDate,
  className,
}: AvailabilityCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate calendar grid (42 cells = 6 weeks)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Days from previous month
    const prevMonthDays = firstDayOfWeek;
    const prevMonth = new Date(year, month, 0);
    const prevMonthTotal = prevMonth.getDate();
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dateString: string;
    }> = [];

    // Previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthTotal - i);
      days.push({
        date,
        isCurrentMonth: false,
        dateString: date.toISOString().split('T')[0],
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        dateString: date.toISOString().split('T')[0],
      });
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        dateString: date.toISOString().split('T')[0],
      });
    }

    return days;
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const today = new Date().toISOString().split('T')[0];
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={1.4} />
        </button>
        <div className="chrome-label text-foreground">{monthName}</div>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground" strokeWidth={1.4} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="chrome-label text-[9px] text-center text-text-tertiary py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, idx) => {
          const dayAvailability = availability[day.dateString];
          const isToday = day.dateString === today;
          const isSelected = day.dateString === selectedDate;
          const isPast = new Date(day.dateString) < new Date(today);
          const isDisabled = !day.isCurrentMonth || isPast || dayAvailability?.status === 'full' || dayAvailability?.status === 'unavailable';

          return (
            <button
              key={`${day.dateString}-${idx}`}
              onClick={() => !isDisabled && onSelectDate(day.dateString)}
              disabled={isDisabled}
              className={cn(
                'relative aspect-square rounded-lg p-2 text-sm transition-all',
                'flex flex-col items-center justify-center',
                !day.isCurrentMonth && 'opacity-30',
                isDisabled && 'cursor-not-allowed',
                !isDisabled && 'hover:chrome-surface hover:border hover:border-primary/30',
                isSelected && 'chrome-surface border border-primary chrome-glow',
                isToday && !isSelected && 'border border-primary/50',
                dayAvailability && {
                  available: 'text-success',
                  limited: 'text-warning',
                  full: 'text-destructive opacity-50',
                  unavailable: 'text-muted-foreground opacity-50',
                }[dayAvailability.status]
              )}
            >
              <span className={cn('font-light', isSelected && 'text-primary')}>
                {day.date.getDate()}
              </span>
              {dayAvailability && day.isCurrentMonth && !isPast && (
                <div
                  className={cn(
                    'absolute bottom-1 w-1 h-1 rounded-full',
                    {
                      available: 'bg-success',
                      limited: 'bg-warning',
                      full: 'bg-destructive',
                      unavailable: 'bg-muted-foreground',
                    }[dayAvailability.status]
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Status Legend */}
      <ChromeSurface className="p-4" glow>
        <div className="chrome-label text-[9px] mb-3">AVAILABILITY</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusBadge status="available" className="text-[9px] px-2 py-1">Available</StatusBadge>
          <StatusBadge status="limited" className="text-[9px] px-2 py-1">Limited</StatusBadge>
          <StatusBadge status="full" className="text-[9px] px-2 py-1">Full</StatusBadge>
          <StatusBadge status="unavailable" className="text-[9px] px-2 py-1">Closed</StatusBadge>
        </div>
      </ChromeSurface>

      {/* Selected date info */}
      {selectedDate && availability[selectedDate] && (
        <ChromeSurface className="p-4" glow>
          <div className="flex items-center justify-between mb-3">
            <div className="chrome-label text-[10px]">SELECTED DATE</div>
            <StatusBadge status={availability[selectedDate].status} className="text-[9px] px-2 py-1">
              {availability[selectedDate].availableSlots} slots available
            </StatusBadge>
          </div>
          <div className="text-foreground">
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </ChromeSurface>
      )}
    </div>
  );
};
