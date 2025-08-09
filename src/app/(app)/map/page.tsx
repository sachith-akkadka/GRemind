
'use client';

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reroute, RerouteInput, RerouteOutput } from '@/ai/flows/reroute-flow';

const Map = dynamic(() => import("@/components/Map"), { 
    ssr: false,
    loading: () => <div className="h-screen w-full bg-muted flex items-center justify-center"><p>Loading map...</p></div>
});

export default function MapPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [origin, setOrigin] = useState<string | null>(null);
    const [destination, setDestination] = useState<string | null>(null);
    const [waypoints, setWaypoints] = useState<{ location: string }[]>([]);
    const [userLocation, setUserLocation] = useState<string | null>(null);
    const [isRecalculating, setIsRecalculating] = useState(false);

    useEffect(() => {
        // Set state from URL params on initial load
        const originParam = searchParams.get('origin');
        const destinationParam = searchParams.get('destination');
        const waypointsParam = searchParams.getAll('waypoints').map(w => ({ location: w }));

        setDestination(destinationParam);
        setWaypoints(waypointsParam);
        
        // Get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = `${latitude},${longitude}`;
                    setUserLocation(newLocation);
                    // Use user's location as origin if not provided in URL
                    setOrigin(originParam || newLocation);
                },
                (error) => {
                    console.error("Error getting user location:", error);
                    toast({
                        title: "Could not get location",
                        description: "Location features will be limited.",
                        variant: "destructive",
                        duration: 3000,
                    });
                    // Fallback to origin from params if geolocation fails
                    if(originParam) setOrigin(originParam);
                },
                { enableHighAccuracy: true }
            );
        } else {
            // Fallback for browsers without geolocation
            if(originParam) setOrigin(originParam);
        }
    }, [searchParams, toast]);

    const handleRecalculateRoute = useCallback(async () => {
        if (!userLocation) {
            toast({
                title: 'Cannot Recalculate',
                description: 'Your current location is missing.',
                variant: 'destructive',
                duration: 3000,
            });
            return;
        }

        const currentStops = [
            ...(waypoints?.map(wp => wp.location) || []),
            ...(destination ? [destination] : [])
        ];

        if (currentStops.length === 0) {
            toast({
                title: 'No destinations to route to.',
                variant: 'destructive',
                duration: 3000,
            });
            return;
        }

        setIsRecalculating(true);
        toast({ title: 'Re-optimizing your route...', duration: 3000 });

        try {
            const result = await reroute({
                userLocation: userLocation,
                destinations: currentStops,
            });

            if (result.optimizedRoute && result.optimizedRoute.length > 0) {
                const newOptimizedRoute = [...result.optimizedRoute];
                const newDestination = newOptimizedRoute.pop()!;
                const newWaypoints = newOptimizedRoute;

                // Update URL to reflect the new, optimized route without reloading the page
                const params = new URLSearchParams();
                params.set('origin', userLocation);
                params.set('destination', newDestination);
                newWaypoints.forEach(wp => params.append('waypoints', wp));
                router.replace(`/map?${params.toString()}`);
                
                toast({ title: 'Route Recalculated!', description: 'Your map has been updated with the most efficient route.', duration: 3000 });
            } else {
                 toast({ title: 'Could not recalculate', description: 'No new route could be determined.', variant: 'destructive', duration: 3000 });
            }

        } catch (error) {
            console.error('Error recalculating route:', error);
            toast({ title: 'Recalculation Failed', description: 'An error occurred while re-optimizing.', variant: 'destructive', duration: 3000 });
        } finally {
            setIsRecalculating(false);
        }

    }, [userLocation, destination, waypoints, toast, router]);

  return (
    <div className="w-screen h-screen relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
         <Button
            onClick={() => router.push('/tasks')}
            size="icon"
            variant="outline"
            className="rounded-full bg-background/80"
         >
             <ArrowLeft className="h-5 w-5" />
             <span className="sr-only">Back to Tasks</span>
         </Button>
         {destination && (
             <Button
                onClick={handleRecalculateRoute}
                disabled={!userLocation || isRecalculating}
                variant="outline"
                className="rounded-full bg-background/80"
             >
                {isRecalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Recalculate
            </Button>
         )}
      </div>
      <Map origin={origin} destination={destination} waypoints={waypoints}/>
    </div>
  );
}
