'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/atoms/Button';
import { BarberSelect, type Barber } from '@/components/molecules/BarberSelect';
import { ServicePicker, type Service } from '@/components/molecules/ServicePicker';
import { QueueList, type EnrichedWalkIn } from '@/components/organisms/QueueList';

interface BookingFlowProps {
  shopId: string;
  shopName: string;
  barbers: Barber[];
  services: Service[];
}

export function BookingFlow({ shopId, shopName, barbers, services }: BookingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedWalkIn, setCompletedWalkIn] = useState<EnrichedWalkIn | null>(null);
  const [liveQueue, setLiveQueue] = useState<EnrichedWalkIn[]>([]);

  // Step 4: Submit and fetch live queue
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Upsert Customer
      const customerRes = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customerName, phoneNumber }),
      });
      const customer = await customerRes.json();

      if (!customer.id) throw new Error('Failed to create customer');

      // Calculate total duration
      const totalEstDuration = services
        .filter((s) => selectedServices.includes(s.id))
        .reduce((sum, s) => sum + s.durationMins, 0);

      // 2. Create Walk-In
      const walkInRes = await fetch('/api/walk-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          customerId: customer.id,
          serviceIds: selectedServices,
          totalEstDuration,
          barberId: selectedBarber,
        }),
      });
      const newWalkIn = await walkInRes.json();
      
      // Map to EnrichedWalkIn for the QueueList
      const enrichedWalkIn: EnrichedWalkIn = {
        ...newWalkIn,
        joinedAt: new Date(newWalkIn.joinedAt),
        durationMins: newWalkIn.totalEstDuration ?? totalEstDuration ?? 30,
        totalEstDuration: newWalkIn.totalEstDuration ?? totalEstDuration ?? 30,
        customerName: newWalkIn.customer?.name || customerName || 'You',
        services: newWalkIn.serviceIds?.map((id: string) => services.find(s => s.id === id)?.name || 'Unknown') || [],
      };
      
      setCompletedWalkIn(enrichedWalkIn);

      // 3. Fetch full live queue to show ETA
      const queueRes = await fetch(`/api/walk-ins?shopId=${shopId}`);
      const rawQueue = await queueRes.json();
      const enrichedQueue = rawQueue.map((w: any) => ({
        ...w,
        joinedAt: new Date(w.joinedAt),
        durationMins: w.totalEstDuration ?? 30,
        totalEstDuration: w.totalEstDuration ?? 30,
        customerName: w.customer?.name || 'Walk-in Guest',
        services: w.serviceIds?.map((id: string) => services.find(s => s.id === id)?.name || 'Unknown') || [],
      }));
      setLiveQueue(enrichedQueue);
      
      setStep(4);
    } catch (error) {
      console.error(error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render Steps
  // ---------------------------------------------------------------------------

  if (step === 4 && completedWalkIn) {
    return (
      <div className="flex w-full flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 p-6 text-center border border-emerald-500/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-surface-0 font-bold text-xl mb-2">
            ✓
          </div>
          <h2 className="text-xl font-bold text-emerald-500">You're in line!</h2>
          <p className="text-sm text-foreground-muted">
            We've calculated your dynamic ETA based on the current queue.
          </p>
        </div>
        
        <h3 className="text-lg font-bold">Live Queue Status</h3>
        <QueueList
          walkIns={liveQueue}
          appointments={[]} // Simplified for demo, ideally fetch today's appointments
          activeService={{ isIdle: false, projectedEndTime: new Date() }} // Baseline assumption
          currentUserId={completedWalkIn.id}
        />
        
        <Button variant="ghost" onClick={() => window.location.reload()} className="mt-4">
          Book Another
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{shopName}</h1>
        <p className="text-foreground-muted">Walk-in Booking</p>
      </div>

      <div className="flex w-full gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step >= i ? 'bg-accent' : 'bg-surface-2'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <ServicePicker
            services={services}
            selectedIds={selectedServices}
            onChange={setSelectedServices}
          />
          <Button
            size="lg"
            disabled={selectedServices.length === 0}
            onClick={() => setStep(2)}
          >
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <BarberSelect
            barbers={barbers}
            selectedId={selectedBarber}
            onSelect={setSelectedBarber}
          />
          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button size="lg" onClick={() => setStep(3)} className="flex-2 w-full">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <div className="flex flex-col gap-4 rounded-xl border border-surface-2 bg-surface-1 p-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground-muted">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-lg border border-surface-3 bg-surface-2 p-3 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="e.g. John Doe"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-sm font-medium text-foreground-muted">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="rounded-lg border border-surface-3 bg-surface-2 p-3 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="e.g. +1 555 000 0000"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button type="button" variant="ghost" size="lg" onClick={() => setStep(2)} className="flex-1" disabled={isSubmitting}>
              Back
            </Button>
            <Button type="submit" size="lg" isLoading={isSubmitting} className="flex-2 w-full">
              Confirm & Join Queue
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
