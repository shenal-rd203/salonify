import * as React from 'react';
import { CalendarClock } from 'lucide-react';
import { type SolidBlock } from '@/lib/timelineEngine';
import { cn } from '@/lib/utils';

export interface EnrichedAppointment extends SolidBlock {
  customerName: string;
  barberName: string;
  services: string[];
}

export interface AppointmentRailProps {
  appointments: EnrichedAppointment[];
}

export function AppointmentRail({ appointments }: AppointmentRailProps) {
  if (appointments.length === 0) return null;

  const formatTime = (date?: Date | string | null) => {
    if (!date) return '--:--';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  };

  return (
    <div className="flex w-full flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-foreground-muted">
        <CalendarClock className="h-4 w-4" />
        <h3>Upcoming Appointments</h3>
      </div>
      
      {/* Horizontal scrolling container */}
      <div className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar">
        {appointments.map((appt) => (
          <div
            key={appt.id}
            className="flex min-w-[240px] snap-start flex-col gap-2 rounded-xl border border-surface-2 bg-surface-1 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{formatTime(appt.scheduledStart)}</span>
              <span className="rounded bg-surface-3 px-2 py-0.5 text-xs font-medium text-foreground-muted">
                {appt.barberName}
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{appt.customerName}</span>
              <span className="truncate text-xs text-foreground-muted">{appt.services.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
