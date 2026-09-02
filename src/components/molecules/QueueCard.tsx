import * as React from 'react';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge, type QueueStatus } from '@/components/atoms/Badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QueueCardProps {
  customerName: string;
  services: string[];
  status: QueueStatus;
  position: number;
  calculatedStart?: Date;
  calculatedEnd?: Date;
  isCurrentUser?: boolean;
}

export function QueueCard({
  customerName,
  services,
  status,
  position,
  calculatedStart,
  calculatedEnd,
  isCurrentUser = false,
}: QueueCardProps) {
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
    <div
      className={cn(
        'glass-panel flex w-full flex-col gap-4 rounded-xl p-4 transition-all',
        {
          'border-accent ring-1 ring-accent shadow-lg shadow-accent/10': isCurrentUser,
          'opacity-50': status === 'COMPLETED' || status === 'LEFT_LINE' || status === 'NO_SHOW',
        }
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-foreground-muted">
            #{position}
          </div>
          <Avatar name={customerName} size="sm" />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">
              {customerName}
              {isCurrentUser && <span className="ml-2 text-xs font-normal text-accent">(You)</span>}
            </span>
            <span className="text-xs text-foreground-muted">{services.join(', ')}</span>
          </div>
        </div>
        <Badge status={status} />
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-surface-1 px-3 py-2 text-sm text-foreground-muted">
        <Clock className="h-4 w-4 text-accent" />
        {status === 'IN_CHAIR' ? (
          <span>Finishing around <span className="font-medium text-foreground">{formatTime(calculatedEnd)}</span></span>
        ) : (
          <span>
            ETA: <span className="font-medium text-foreground">{formatTime(calculatedStart)}</span>
            <span className="mx-1.5">-</span>
            {formatTime(calculatedEnd)}
          </span>
        )}
      </div>
    </div>
  );
}
