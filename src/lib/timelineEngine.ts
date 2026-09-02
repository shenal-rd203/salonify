// 1. Core Interfaces
export interface SolidBlock {
  id: string;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  status: 'BOOKED' | string;
}

export interface LiquidBlock {
  id: string;
  joinedAt: Date | string;
  durationMins?: number;
  totalEstDuration?: number;
  status: string;
  calculatedStart?: Date; // To be calculated by the engine
  calculatedEnd?: Date;   // To be calculated by the engine
}

export interface ActiveService {
  isIdle: boolean;
  projectedEndTime?: Date | string;
}

/**
 * Calculates the dynamic ETA timeline for a queue of walk-ins, weaving them around fixed appointments.
 * 
 * @param currentTime The current time
 * @param activeService The active service state (whether the barber is idle or when they finish their current cut)
 * @param appointments Array of SolidBlocks (Appointments), assumed sorted chronologically
 * @param queue Array of LiquidBlocks (Walk-ins), assumed sorted by joinedAt
 * @returns A new array of LiquidBlocks with calculatedStart and calculatedEnd, sorted chronologically
 */
export function calculateTimeline(
  currentTime: Date | string,
  activeService: ActiveService,
  appointments: SolidBlock[],
  queue: LiquidBlock[]
): LiquidBlock[] {
  // Deep copy the queue to remain pure and side-effect-free
  const remainingQueue: LiquidBlock[] = queue.map(q => ({ ...q }));
  const processedQueue: LiquidBlock[] = [];

  const getDuration = (w: LiquidBlock) => w.durationMins ?? w.totalEstDuration ?? 30;

  // Rule 1: Initialize the Pointer
  const parsedCurrentTime = new Date(currentTime);
  let timePointer = activeService.isIdle
    ? (isNaN(parsedCurrentTime.getTime()) ? new Date() : parsedCurrentTime)
    : (activeService.projectedEndTime ? new Date(activeService.projectedEndTime) : new Date());

  if (isNaN(timePointer.getTime())) {
    timePointer = new Date();
  }

  // Ignore any appointments that ended before or exactly at our starting timePointer
  const futureAppts = appointments
    .map(a => ({
      ...a,
      scheduledStart: new Date(a.scheduledStart),
      scheduledEnd: new Date(a.scheduledEnd)
    }))
    .filter(a => !isNaN(a.scheduledEnd.getTime()) && a.scheduledEnd > timePointer);

  // Rule 2: Process the Queue
  while (remainingQueue.length > 0) {
    const walkIn = remainingQueue[0];
    const duration = getDuration(walkIn);
    let placed = false;

    while (!placed) {
      const proposedEnd = new Date(timePointer.getTime() + duration * 60000);

      // Rule 3: Collision Detection
      // Find the first appointment that overlaps with [timePointer, proposedEnd]
      const overlap = futureAppts.find(
        (a) => timePointer < a.scheduledEnd && proposedEnd > a.scheduledStart
      );

      if (!overlap) {
        // NO OVERLAP: Assign times and advance pointer
        walkIn.calculatedStart = new Date(timePointer);
        walkIn.calculatedEnd = new Date(proposedEnd);
        
        timePointer = new Date(proposedEnd);
        
        processedQueue.push(walkIn);
        remainingQueue.shift(); // Remove processed walk-in
        placed = true;
      } else {
        // OVERLAP DETECTED (Rule 4: Collision Handling & The Unlucky Gap)
        const gapDurationMs = overlap.scheduledStart.getTime() - timePointer.getTime();
        const gapDurationMins = gapDurationMs / 60000;

        // Look ahead in the remaining queue for a walk-in small enough to fit in the gap
        const jumpIndex = remainingQueue.findIndex(
          (w, index) => index > 0 && getDuration(w) <= gapDurationMins
        );

        if (jumpIndex !== -1) {
          // QUEUE JUMP: Found a smaller walk-in that fits
          const jumper = remainingQueue[jumpIndex];
          const jumperDuration = getDuration(jumper);
          jumper.calculatedStart = new Date(timePointer);
          jumper.calculatedEnd = new Date(timePointer.getTime() + jumperDuration * 60000);
          
          timePointer = new Date(jumper.calculatedEnd);
          
          processedQueue.push(jumper);
          remainingQueue.splice(jumpIndex, 1); // Remove the jumper
          
          // Note: `placed` is still false for the original walk-in, so the while loop repeats 
          // and re-evaluates it at the new timePointer.
        } else {
          // NO ONE FITS: Skip the appointment block entirely
          // If the pointer is already past the start (e.g., inside the appointment), 
          // we just jump to the end.
          const jumpTime = overlap.scheduledEnd > timePointer ? overlap.scheduledEnd : timePointer;
          timePointer = new Date(jumpTime);
          
          // Loop repeats to re-evaluate the current walk-in at this new timePointer.
        }
      }
    }
  }

  return processedQueue;
}
