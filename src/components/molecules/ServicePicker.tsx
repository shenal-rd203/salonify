import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface Service {
  id: string;
  name: string;
  durationMins: number;
}

export interface ServicePickerProps {
  services: Service[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function ServicePicker({ services, selectedIds, onChange }: ServicePickerProps) {
  const toggleService = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const totalDuration = services
    .filter((s) => selectedIds.includes(s.id))
    .reduce((acc, curr) => acc + curr.durationMins, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wider">Select Services</h3>
        {totalDuration > 0 && (
          <span className="text-sm font-semibold text-accent">{totalDuration} mins</span>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selectedIds.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => toggleService(service.id)}
              className={cn(
                'flex items-center justify-between rounded-xl border border-surface-2 bg-surface-1 p-4 text-left transition-all hover:bg-surface-2',
                {
                  'border-accent bg-accent/5 ring-1 ring-accent': isSelected,
                }
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">{service.name}</span>
                <span className="text-sm text-foreground-muted">{service.durationMins} mins</span>
              </div>
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                  {
                    'border-accent bg-accent text-surface-0': isSelected,
                    'border-surface-3 bg-transparent': !isSelected,
                  }
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
