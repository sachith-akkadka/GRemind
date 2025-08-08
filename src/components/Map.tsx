
"use client";

import { useJsApiLoader, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import React, { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

interface MapProps {
    origin?: string | null;
    destination?: string | null;
    waypoints?: { location: string }[] | null;
}

const libraries: ('places' | 'directions')[] = ['places', 'directions'];

const Map = ({ origin, destination, waypoints }: MapProps) => {
    // This is the correct way to get the key client-side.
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey || "",
        libraries,
        preventGoogleFontsLoading: true,
        id: 'google-map-script',
        // Only attempt to load the script if the API key is present
        disabled: !apiKey,
    });

    const [mapCenter, setMapCenter] = useState({ lat: 19.0760, lng: 72.8777 }); // Default center
    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

    useEffect(() => {
        if (origin) {
            const [lat, lng] = origin.split(',').map(Number);
            setMapCenter({ lat, lng });
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
        // Reset directions when route changes
        setDirectionsResponse(null);
        if (!isLoaded || !origin || !destination) return;

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
                    console.error(`error fetching directions ${result}`);
                }
            }
        );
    }, [isLoaded, origin, destination, waypoints]);
    
    if (!apiKey) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive">
                Google Maps API Key not found. Please check your environment configuration.
            </div>
        )
    }

    if (loadError) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive">
                Error loading maps. Please check the API key, console, and ensure it is not restricted.
            </div>
        )
    }

    if (!isLoaded) {
        return <Skeleton className="h-full w-full" />;
    }

    return (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={13}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {!directionsResponse && origin && <Marker position={{ lat: parseFloat(origin.split(',')[0]), lng: parseFloat(origin.split(',')[1]) }} />}
            {!directionsResponse && destination && <Marker position={{ lat: parseFloat(destination.split(',')[0]), lng: parseFloat(destination.split(',')[1]) }} />}
            {directionsResponse && <DirectionsRenderer directions={directionsResponse} />}
        </GoogleMap>
    );
};

export default Map;
