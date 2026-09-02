import * as React from 'react';
import { Avatar } from '@/components/atoms/Avatar';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

export interface Barber {
  id: string;
  name: string;
}

export interface BarberSelectProps {
  barbers: Barber[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function BarberSelect({ barbers, selectedId, onSelect }: BarberSelectProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider">Select Barber</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {/* Any Barber (Global Pool) */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border border-surface-2 bg-surface-1 p-4 transition-all hover:bg-surface-2',
            {
              'border-accent bg-accent/10 ring-1 ring-accent': selectedId === null,
            }
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-3 text-foreground">
            <Users className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium">Any Barber</span>
        </button>

        {/* Specific Barbers */}
        {barbers.map((barber) => (
          <button
            key={barber.id}
            type="button"
            onClick={() => onSelect(barber.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-xl border border-surface-2 bg-surface-1 p-4 transition-all hover:bg-surface-2',
              {
                'border-accent bg-accent/10 ring-1 ring-accent': selectedId === barber.id,
              }
            )}
          >
            <Avatar name={barber.name} size="md" />
            <span className="text-sm font-medium truncate w-full text-center">{barber.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
