import * as React from 'react';
import { Button } from '@/components/atoms/Button';
import { Play } from 'lucide-react';

export interface ForceStartBarProps {
  nextCustomerId: string | null;
  nextCustomerName: string | null;
  onForceStart: (id: string) => void;
  isStarting?: boolean;
}

export function ForceStartBar({
  nextCustomerId,
  nextCustomerName,
  onForceStart,
  isStarting = false,
}: ForceStartBarProps) {
  if (!nextCustomerId) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-surface-2 bg-surface-0/80 p-4 backdrop-blur-xl sm:static sm:border sm:rounded-2xl sm:bg-surface-1 sm:backdrop-blur-none">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Next Up</span>
          <span className="font-semibold text-foreground">{nextCustomerName}</span>
        </div>
        <Button
          onClick={() => onForceStart(nextCustomerId)}
          isLoading={isStarting}
          size="lg"
          className="w-full sm:w-auto"
        >
          {!isStarting && <Play className="mr-2 h-5 w-5 fill-current" />}
          Force Start
        </Button>
      </div>
    </div>
  );
}
