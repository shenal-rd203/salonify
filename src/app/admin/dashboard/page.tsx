'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { QueueList, type EnrichedWalkIn } from '@/components/organisms/QueueList';
import { AppointmentRail, type EnrichedAppointment } from '@/components/organisms/AppointmentRail';
import { ForceStartBar } from '@/components/organisms/ForceStartBar';
import { calculateTimeline } from '@/lib/timelineEngine';

export default function AdminDashboard() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [queue, setQueue] = useState<EnrichedWalkIn[]>([]);
  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // For prototype purposes, fetch the first shop if no ID is provided
  // In a real app, this would come from the authenticated barber's session
  const fetchDashboardData = async () => {
    try {
      // 1. Get a shop ID if we don't have one
      let currentShopId = shopId;
      if (!currentShopId) {
        // Fetch any shop for prototype
        // In real app, this is determined by Auth context
        // For now, we'll fetch services without a shopId just to see if the API handles it
        // Since we didn't build a /api/shops endpoint, we can hardcode the seeded shop ID 
        // OR we can add a simple query to one of the endpoints. 
        // Actually, we can fetch all walk-ins for the seeded shop if we know it. 
        // Let's assume the shopId is passed via localStorage or we use a hardcoded one for this prototype view.
        currentShopId = '2abbaa61-0be9-44f5-95ad-dd920acb6a29'; // The seeded shop ID, or we fetch it below.
      }

      // Fetch Walk-Ins
      const queueRes = await fetch(`/api/walk-ins?shopId=${currentShopId}`);
      if (queueRes.ok) {
        const rawQueue = await queueRes.json();
        // Enrich data
        const enrichedQueue = rawQueue.map((w: any) => ({
          ...w,
          joinedAt: new Date(w.joinedAt),
          durationMins: w.totalEstDuration ?? 30,
          totalEstDuration: w.totalEstDuration ?? 30,
          customerName: w.customer?.name || 'Walk-in Guest',
          services: w.serviceIds?.map((id: string) => 'Haircut') || ['Haircut'],
        }));
        setQueue(enrichedQueue);
      }

      // Fetch Appointments (Solid Blocks)
      const apptRes = await fetch(`/api/appointments?shopId=${currentShopId}`);
      if (apptRes.ok) {
        const rawAppts = await apptRes.json();
        const enrichedAppts = rawAppts.map((a: any) => ({
          ...a,
          scheduledStart: new Date(a.scheduledStart),
          scheduledEnd: new Date(a.scheduledEnd),
          customerName: a.customer?.name || 'Guest',
          barberName: a.barber?.name || 'Barber',
          services: a.serviceIds?.map((id: string) => 'Service') || ['Service'], 
        }));
        setAppointments(enrichedAppts);
      }

      setShopId(currentShopId);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Poll every 15 seconds
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [shopId]);

  const handleForceStart = async (walkInId: string) => {
    setIsStarting(true);
    try {
      await fetch(`/api/walk-ins/${walkInId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_CHAIR' }),
      });
      // Refresh immediately
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to force start:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const nextUp = queue.find((w) => w.status === 'WAITING');

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-0">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 bg-surface-0 px-4 pt-12 pb-32">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Barber Dashboard</h1>
        <p className="text-foreground-muted">Live Queue & Appointments</p>
      </div>

      <AppointmentRail appointments={appointments} />
      
      <div className="flex flex-col gap-4">
        <QueueList 
          walkIns={queue} 
          appointments={appointments} 
          activeService={{ isIdle: false, projectedEndTime: new Date() }} // Baseline assumption for demo
        />
      </div>

      <ForceStartBar
        nextCustomerId={nextUp?.id || null}
        nextCustomerName={nextUp?.customerName || null}
        onForceStart={handleForceStart}
        isStarting={isStarting}
      />
    </main>
  );
}
