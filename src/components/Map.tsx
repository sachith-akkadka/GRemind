
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { firebaseConfig } from "@/lib/firebase";

const containerStyle = {
  width: "100%",
  height: "100%",
};

interface MapProps {
    origin?: string | null;
    destination?: string | null;
    waypoints?: { location: string }[] | null;
}

const Map = ({ origin, destination, waypoints }: MapProps) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || firebaseConfig.apiKey;
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 19.0760, lng: 72.8777 }); // Default center

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            setMapCenter({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
        });
    }
  }, [])


  const directionsCallback = useCallback((
    response: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (status === "OK" && response) {
      setDirections(response);
    } else {
      console.error(`Directions request failed due to ${status}`);
    }
  }, []);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <p className="text-muted-foreground">
          Google Maps API key is missing. Please provide one in your environment variables.
        </p>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={13}>
        {!destination && <Marker position={mapCenter} />}
        {destination && origin && (
          <DirectionsService
            options={{
              origin: origin,
              destination: destination,
              waypoints: waypoints || [],
              travelMode: google.maps.TravelMode.DRIVING,
            }}
            callback={directionsCallback}
          />
        )}
        {directions && <DirectionsRenderer options={{ directions }} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default Map;
