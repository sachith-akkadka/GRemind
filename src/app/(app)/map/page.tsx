
'use client';

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LocateFixed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { findNextLocationAndRoute } from "@/ai/flows/find-next-location-and-route";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProximityManager from "@/components/ProximityManager";

// Dynamically import MapNavigation to ensure it's client-side only
const MapNavigation = dynamic(() => import("@/components/MapNavigation"), { 
    ssr: false,
    loading: () => <div className="h-screen w-full bg-muted flex items-center justify-center"><p>Loading map...</p></div>
});


export default function MapPage() {
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

        setDestination(destParam);
        setWaypoints(waypointsParam);
        
        // Use a dedicated effect for watching the user's location
        let watchId: number;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = `${latitude},${longitude}`;
                    setUserLocation(newLocation);
                    
                    // On first valid location, set the origin if not already set by params
                    if (!origin) {
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
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }
        
        // If an origin is passed in the URL, prioritize it over GPS.
        if (originParam) {
           setOrigin(originParam);
        }


        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
        // Run this effect only once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        
        const allDestinations = [destination, ...waypoints.map(w => w.location)];
        
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
       <div className="absolute bottom-20 right-4 z-10">
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
