
'use client';

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reroute, RerouteInput, RerouteOutput } from '@/ai/flows/reroute-flow';

const Map = dynamic(() => import("@/components/Map"), { 
    ssr: false,
    loading: () => <p>Loading map...</p>
});

export default function MapPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [origin, setOrigin] = useState<string | null>(searchParams.get('origin'));
    const [destination, setDestination] = useState<string | null>(searchParams.get('destination'));
    const [waypoints, setWaypoints] = useState<{ location: string }[]>(searchParams.getAll('waypoints').map(w => ({ location: w })));
    const [userLocation, setUserLocation] = useState<string | null>(null);
    const [isRecalculating, setIsRecalculating] = useState(false);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = `${latitude},${longitude}`;
                    setUserLocation(newLocation);
                    // Set initial origin to user's location if not provided in params
                    if (!searchParams.get('origin')) {
                        setOrigin(newLocation);
                    }
                },
                (error) => {
                    console.error("Error getting user location:", error);
                    toast({
                        title: "Could not get location",
                        description: "Location features will be limited.",
                        variant: "destructive",
                        duration: 3000,
                    });
                },
                { enableHighAccuracy: true } // Request high accuracy
            );
        }
    }, [toast, searchParams]);

    const handleRecalculateRoute = useCallback(async () => {
        if (!userLocation || !destination) {
            toast({
                title: 'Cannot Recalculate',
                description: 'Your current location or a destination is missing.',
                variant: 'destructive',
                duration: 3000,
            });
            return;
        }

        setIsRecalculating(true);
        toast({ title: 'Re-optimizing your route...', duration: 3000 });

        const allDestinations = [...waypoints.map(wp => wp.location), destination];

        try {
            const result = await reroute({
                userLocation: userLocation,
                destinations: allDestinations,
            });

            if (result.optimizedRoute && result.optimizedRoute.length > 0) {
                const newOptimizedRoute = [...result.optimizedRoute];
                const newDestination = newOptimizedRoute.pop()!;
                const newWaypoints = newOptimizedRoute;

                // Update state to re-render the map
                setOrigin(userLocation);
                setDestination(newDestination);
                setWaypoints(newWaypoints.map(wp => ({ location: wp })));

                // Update URL without reloading the page
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Your Task Map</CardTitle>
            <CardDescription>
                {destination ? "Showing route to your destination." : "A map of your task locations."}
            </CardDescription>
        </div>
         {destination && (
             <Button
                onClick={handleRecalculateRoute}
                disabled={!userLocation || isRecalculating}
                variant="outline"
             >
                {isRecalculating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Recalculate Route
            </Button>
         )}
      </CardHeader>
      <CardContent>
        <div className="h-[60vh] rounded-lg overflow-hidden">
          <Map origin={origin} destination={destination} waypoints={waypoints}/>
        </div>
      </CardContent>
    </Card>
  );
}
