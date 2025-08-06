
'use client';

import dynamic from "next/dynamic";
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapPage() {
    const searchParams = useSearchParams();
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const waypoints = searchParams.getAll('waypoints');

    const waypointsFormatted = waypoints.map(waypoint => ({ location: waypoint }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Task Map</CardTitle>
        <CardDescription>
            {destination ? "Showing route to your destination." : "A map of your task locations."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[60vh] rounded-lg overflow-hidden">
          <Map origin={origin} destination={destination} waypoints={waypointsFormatted}/>
        </div>
      </CardContent>
    </Card>
  );
}
