
"use client";

import { GoogleMap, Marker, DirectionsRenderer, useLoadScript } from '@react-google-maps/api';
import React, { useEffect, useState, useMemo, useRef } from 'react';
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
    center?: google.maps.LatLngLiteral | null;
    userLocation?: google.maps.LatLngLiteral;
}

const MapComponent = ({ origin, destination, waypoints, center, userLocation }: MapProps) => {
    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);

    const defaultCenter = useMemo(() => ({ lat: 34.0522, lng: -118.2437 }), []);

    useEffect(() => {
        if (center && mapRef.current) {
            mapRef.current.panTo(center);
        }
    }, [center]);

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
            center={center || defaultCenter}
            zoom={15}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
            onLoad={(map) => { mapRef.current = map; }}
        >
            {directionsResponse && (
                <DirectionsRenderer 
                    directions={directionsResponse}
                    options={{
                        suppressMarkers: true, // We'll render our own markers
                        polylineOptions: {
                            strokeColor: '#4A90E2',
                            strokeWeight: 6,
                            strokeOpacity: 0.8,
                        },
                    }}
                />
            )}
            {userLocation && (
                <Marker 
                    position={userLocation} 
                    title="Your Location"
                    icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    }}
                />
            )}
            {/* Markers for waypoints and destination */}
             {directionsResponse?.routes[0]?.legs.map((leg, index) => (
                <Marker
                    key={index}
                    position={leg.end_location}
                    label={String.fromCharCode(65 + index)}
                />
            ))}
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
