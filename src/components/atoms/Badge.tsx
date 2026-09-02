import * as React from 'react';
import { cn } from '@/lib/utils';

export type QueueStatus = 'WAITING' | 'IN_CHAIR' | 'COMPLETED' | 'NO_SHOW' | 'LEFT_LINE';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: QueueStatus;
}

export function Badge({ status, className, ...props }: BadgeProps) {
  const statusConfig: Record<QueueStatus, { label: string; classes: string }> = {
    WAITING: { label: 'Waiting', classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    IN_CHAIR: { label: 'In Chair', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 relative' },
    COMPLETED: { label: 'Done', classes: 'bg-surface-3 text-foreground-muted border-surface-3' },
    NO_SHOW: { label: 'No Show', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
    LEFT_LINE: { label: 'Left', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        config.classes,
        className
      )}
      {...props}
    >
      {status === 'IN_CHAIR' && (
        <span className="mr-1.5 flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
      {config.label}
    </div>
  );
}
