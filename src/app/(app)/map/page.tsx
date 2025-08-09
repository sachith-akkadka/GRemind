
'use client';

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, LocateFixed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    
    // This state will hold the map component's internal center
    const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);

    // This state will track the user's real-time location
    const [userLocation, setUserLocation] = useState<string | null>(null);


    useEffect(() => {
        // Set route details from URL params
        const originParam = searchParams.get('origin');
        const destinationParam = searchParams.get('destination');
        const waypointsParam = searchParams.getAll('waypoints').map(w => ({ location: w }));

        setDestination(destinationParam);
        setWaypoints(waypointsParam);
        setOrigin(originParam);

        // Watch user's current location
        let watchId: number;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = `${latitude},${longitude}`;
                    setUserLocation(newLocation);
                    
                    // On first load, set the origin and center the map
                    if (!origin) {
                        setOrigin(newLocation);
                        setMapCenter({ lat: latitude, lng: longitude });
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
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }

        return () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [searchParams, toast, origin]);

    const handleRecenter = () => {
        if (userLocation) {
            const [lat, lng] = userLocation.split(',').map(Number);
            setMapCenter({ lat, lng });
            toast({ title: 'Re-centered map!', duration: 2000 });
        } else {
            toast({ title: 'Current location not available', variant: 'destructive', duration: 3000 });
        }
    };

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
      <Map 
        origin={origin} 
        destination={destination} 
        waypoints={waypoints}
        center={mapCenter}
        userLocation={userLocation ? { lat: parseFloat(userLocation.split(',')[0]), lng: parseFloat(userLocation.split(',')[1]) } : undefined}
      />
    </div>
  );
}
