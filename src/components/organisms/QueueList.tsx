import * as React from 'react';
import { QueueCard } from '@/components/molecules/QueueCard';
import { calculateTimeline, type LiquidBlock, type SolidBlock, type ActiveService } from '@/lib/timelineEngine';
import type { QueueStatus } from '@/components/atoms/Badge';

// Extended type from the DB join
export interface EnrichedWalkIn extends LiquidBlock {
  customerName: string;
  services: string[];
}

export interface QueueListProps {
  walkIns: EnrichedWalkIn[];
  appointments: SolidBlock[];
  activeService: ActiveService;
  currentUserId?: string;
}

export function QueueList({ walkIns, appointments, activeService, currentUserId }: QueueListProps) {
  // Find in-chair person from the raw walkIns
  const inChairRaw = walkIns.find((w) => w.status === 'IN_CHAIR');
  const waitingWalkIns = walkIns.filter((w) => w.status === 'WAITING');

  // Compute realistic active service based on the current in-chair customer
  const effectiveActiveService: ActiveService = React.useMemo(() => {
    if (inChairRaw) {
      const duration = inChairRaw.durationMins ?? inChairRaw.totalEstDuration ?? 30;
      const joined = inChairRaw.joinedAt ? new Date(inChairRaw.joinedAt) : new Date();
      const projectedEnd = new Date(joined.getTime() + duration * 60000);
      return {
        isIdle: false,
        projectedEndTime: !isNaN(projectedEnd.getTime()) && projectedEnd > new Date()
          ? projectedEnd
          : new Date(Date.now() + 10 * 60000),
      };
    }
    return activeService;
  }, [inChairRaw, activeService]);

  // Calculate timeline only for WAITING customers (weaving around appointments)
  const waitingList = React.useMemo(() => {
    return calculateTimeline(new Date(), effectiveActiveService, appointments, waitingWalkIns) as EnrichedWalkIn[];
  }, [waitingWalkIns, appointments, effectiveActiveService]);

  // In-chair display item
  const inChair = React.useMemo(() => {
    if (!inChairRaw) return null;
    const duration = inChairRaw.durationMins ?? inChairRaw.totalEstDuration ?? 30;
    const start = inChairRaw.joinedAt ? new Date(inChairRaw.joinedAt) : new Date();
    const end = effectiveActiveService.projectedEndTime
      ? new Date(effectiveActiveService.projectedEndTime)
      : new Date(start.getTime() + duration * 60000);
    return {
      ...inChairRaw,
      calculatedStart: start,
      calculatedEnd: end,
    };
  }, [inChairRaw, effectiveActiveService]);

  if (!inChair && waitingList.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-surface-3 py-12 text-center text-foreground-muted">
        <p>The queue is empty.</p>
        <p className="text-sm">Walk right in!</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {inChair && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Currently Serving</h2>
          <div className="relative">
            {/* Soft glow behind the in-chair card */}
            <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-lg" />
            <div className="relative">
              <QueueCard
                customerName={inChair.customerName}
                services={inChair.services}
                status={inChair.status as QueueStatus}
                position={1}
                calculatedStart={inChair.calculatedStart}
                calculatedEnd={inChair.calculatedEnd}
                isCurrentUser={inChair.id === currentUserId}
              />
            </div>
          </div>
        </div>
      )}

      {waitingList.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">Up Next</h2>
          <div className="flex flex-col gap-3">
            {waitingList.map((walkIn, idx) => (
              <QueueCard
                key={walkIn.id}
                customerName={walkIn.customerName}
                services={walkIn.services}
                status={walkIn.status as QueueStatus}
                position={inChair ? idx + 2 : idx + 1}
                calculatedStart={walkIn.calculatedStart}
                calculatedEnd={walkIn.calculatedEnd}
                isCurrentUser={walkIn.id === currentUserId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
