
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
    loading: () => <div className="h-[60vh] w-full bg-muted rounded-lg flex items-center justify-center"><p>Loading map...</p></div>
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
        setOrigin(searchParams.get('origin'));
        setDestination(searchParams.get('destination'));
        setWaypoints(searchParams.getAll('waypoints').map(w => ({ location: w })));

        // Get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = `${latitude},${longitude}`;
                    setUserLocation(newLocation);
                    // Set origin to user's location if it's not already in the URL
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
                { enableHighAccuracy: true }
            );
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

                // Update URL to reflect the new, optimized route
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
                {destination ? "Showing the optimized route to your destinations." : "Your current location."}
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
                Recalculate From My Location
            </Button>
         )}
      </CardHeader>
      <CardContent>
        <div className="h-[60vh] rounded-lg overflow-hidden border">
          <Map origin={origin} destination={destination} waypoints={waypoints}/>
        </div>
      </CardContent>
    </Card>
  );
}
