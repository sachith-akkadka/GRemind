
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey || "",
        libraries,
    });

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
        if (isLoaded && origin && destination) {
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
        } else {
            setDirectionsResponse(null);
        }
    }, [isLoaded, origin, destination, waypoints]);

    if (loadError) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-destructive/10 text-destructive text-center p-4">
                <div>
                    <h3 className="font-bold">Error Loading Map</h3>
                    <p className="text-sm">Please check the API key, ensure it's unrestricted or the domain is whitelisted, and that the required APIs (Maps JavaScript, Directions, Places) are enabled in your Google Cloud project.</p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return <Skeleton className="h-full w-full" />;
    }

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

export default Map;
