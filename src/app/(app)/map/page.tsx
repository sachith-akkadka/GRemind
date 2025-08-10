
'use client';

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LocateFixed, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findNextLocationAndRoute } from "@/ai/flows/find-next-location-and-route";
import ProximityManager from "@/components/ProximityManager";

// Dynamically import MapNavigation to ensure it's client-side only
const MapNavigation = dynamic(() => import("@/components/MapNavigation"), { 
    ssr: false,
    loading: () => <div className="h-screen w-full bg-muted flex items-center justify-center"><p>Loading map...</p></div>
});

function MapPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Route and location states
    const [origin, setOrigin] = useState<string | null>(null);
    const [destination, setDestination] = useState<string | null>(null);
    const [waypoints, setWaypoints] = useState<{ location: string }[]>([]);
    
    // State to track the user's real-time location from the GPS
    const [userLocation, setUserLocation] = useState<string | null>(null);

    // This state will hold the map's center to allow for manual re-centering
    const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);

    useEffect(() => {
        // Set route details from URL params on initial load
        const originParam = searchParams.get('origin');
        const destParam = searchParams.get('destination');
        const waypointsParam = searchParams.getAll('waypoints').map(w => ({ location: w }));

        setOrigin(originParam);
        setDestination(destParam);
        setWaypoints(waypointsParam);
        
        let watchId: number;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = `${latitude},${longitude}`;
                    setUserLocation(newLocation);
                    
                    // If origin is not set by param, use real-time location
                    if (!originParam) {
                        setOrigin(newLocation);
                    }
                },
                (error) => {
                    console.error("Error getting user location:", error.message);
                    if (!toast) return;
                    toast({
                        title: "Could not get location",
                        description: `Error: ${error.message || 'Please enable location services.'}`,
                        variant: "destructive",
                        duration: 5000,
                    });
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );
        }

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [searchParams, toast]);

    const handleRecenter = () => {
        if (userLocation) {
            const [lat, lng] = userLocation.split(',').map(Number);
            setMapCenter({ lat, lng });
            toast({ title: 'Re-centered map to your location!', duration: 2000 });
        } else {
            toast({ title: 'Current location not available', variant: 'destructive', duration: 3000 });
        }
    };

    const handleReroute = useCallback(async () => {
        if (!userLocation || !destination) return;

        toast({ title: "Deviated from route", description: "Re-optimizing your path...", duration: 3000 });
        
        const activeTaskTitle = localStorage.getItem("gremind_active_task_title") || "current task";

        try {
            const result = await findNextLocationAndRoute({
                taskTitle: activeTaskTitle,
                userLocation: userLocation,
                locationToExclude: destination, 
                remainingDestinations: waypoints.map(w => w.location),
            });
            
            if (result.newDestination) {
                setDestination(result.newDestination);
                setWaypoints(result.newWaypoints.map(w => ({ location: w })));
                toast({ title: "Route Updated!", description: `Now heading to ${result.newLocation?.name || 'next stop'}.`, duration: 4000 });
            } else {
                 toast({ title: "No alternative routes found", description: "Continuing on previous route.", duration: 4000 });
            }

        } catch (error) {
            console.error("Error during reroute:", error);
            toast({ title: "Rerouting Failed", description: "Could not re-optimize your route.", variant: "destructive", duration: 4000 });
        }
    }, [userLocation, destination, waypoints, toast]);


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
      </div>
       <div className="absolute bottom-20 right-4 z-10 flex flex-col gap-2">
         <Button
            onClick={handleReroute}
            variant="outline"
            className="rounded-full bg-background/80 w-auto h-14"
         >
             <RefreshCw className="h-6 w-6" />
             <span className="ml-2">Re-optimize</span>
         </Button>
         <Button
            onClick={handleRecenter}
            size="icon"
            variant="outline"
            className="rounded-full bg-background/80 w-14 h-14"
         >
             <LocateFixed className="h-6 w-6" />
             <span className="sr-only">Recenter Map</span>
         </Button>
      </div>
       {origin && destination ? (
        <MapNavigation
          origin={origin}
          destination={destination}
          waypoints={waypoints}
          onRerouteRequested={handleReroute}
          voiceEnabled={true}
        />
      ) : (
         <div className="h-screen w-full bg-muted flex items-center justify-center"><p>Waiting for location data to start navigation...</p></div>
      )}
       <ProximityManager />
    </div>
  );
}

export default function MapPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-muted flex items-center justify-center"><p>Loading...</p></div>}>
            <MapPageContent />
        </Suspense>
    )
}
