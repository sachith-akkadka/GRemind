
"use client";

import { GoogleMap, Marker, DirectionsRenderer, useLoadScript } from '@react-google-maps/api';
import React, { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

interface MapProps {
    origin?: string | null;
    destination?: string | null;
    waypoints?: { location: string }[] | null;
}

const MapComponent = ({ origin, destination, waypoints }: MapProps) => {
    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
    const [mapCenter, setMapCenter] = useState({ lat: 19.0760, lng: 72.8777 }); // Default center

    useEffect(() => {
        if (origin) {
            const [lat, lng] = origin.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              setMapCenter({ lat, lng });
            }
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                setMapCenter({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            });
        }
    }, [origin]);

    useEffect(() => {
        if (!origin || !destination || typeof window === 'undefined' || !window.google) {
            setDirectionsResponse(null);
            return;
        }
        
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: origin,
                destination: destination,
                waypoints: waypoints?.map(wp => ({ location: wp.location, stopover: true })),
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirectionsResponse(result);
                } else {
                    console.error(`Error fetching directions: ${status}`);
                    setDirectionsResponse(null);
                }
            }
        );
    }, [origin, destination, waypoints]);

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={12}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {directionsResponse ? (
                <DirectionsRenderer directions={directionsResponse} />
            ) : (
                <>
                    {origin && <Marker position={{ lat: parseFloat(origin.split(',')[0]), lng: parseFloat(origin.split(',')[1]) }} />}
                    {destination && <Marker position={{ lat: parseFloat(destination.split(',')[0]), lng: parseFloat(destination.split(',')[1]) }} />}
                </>
            )}
        </GoogleMap>
    );
};

const Map = (props: MapProps) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    if (loadError) {
        return (
             <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive text-center p-4">
                <div>
                    <h3 className="font-bold">Map Load Error</h3>
                    <p className="text-sm">There was an error loading the map script. Please check the API key and console for more details.</p>
                </div>
            </div>
        )
    }

    if (!isLoaded) {
        return <Skeleton className="h-full w-full" />;
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
      return (
            <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive text-center p-4">
                <div>
                    <h3 className="font-bold">API Key Missing</h3>
                    <p className="text-sm">The Google Maps API Key is not configured. Please add it to your environment variables.</p>
                </div>
            </div>
        );
    }

    return <MapComponent {...props} />;
};

export default Map;
