
"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";


// Fix for default icon issues with webpack
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

interface MapProps {
    origin?: string | null;
    destination?: string | null;
    waypoints?: { location: string }[] | null;
}

const Routing = ({ origin, destination, waypoints }: MapProps) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !origin || !destination) return;

        const allWaypoints = [
            L.latLng(Number(origin.split(',')[0]), Number(origin.split(',')[1])),
            ...(waypoints?.map(wp => {
                const [lat, lon] = wp.location.split(',').map(Number);
                return L.latLng(lat, lon);
            }) || []),
            L.latLng(Number(destination.split(',')[0]), Number(destination.split(',')[1])),
        ];

        const routingControl = L.Routing.control({
            waypoints: allWaypoints,
            routeWhileDragging: true,
            show: false, // Hides the itinerary text box
            addWaypoints: false,
             lineOptions: {
                styles: [{ color: 'hsl(var(--primary))', opacity: 1, weight: 5 }]
            },
            createMarker: function() { return null; } // Hides start/end markers from routing machine
        }).addTo(map);

        return () => {
          try {
            if (map && routingControl) {
                map.removeControl(routingControl);
            }
          } catch (e) {
            console.log("Error removing routing control", e);
          }
        }
    }, [map, origin, destination, waypoints]);

    return null;
}


const Map = ({ origin, destination, waypoints }: MapProps) => {
    const [mapCenter, setMapCenter] = useState<[number, number]>([19.0760, 72.8777]); // Default center

    useEffect(() => {
        if (origin) {
            const [lat, lng] = origin.split(',').map(Number);
            setMapCenter([lat, lng]);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                setMapCenter([position.coords.latitude, position.coords.longitude]);
            });
        }
    }, [origin])
    
    // Create markers for origin and destination if they exist
    const originCoords = origin ? origin.split(',').map(Number) as [number, number] : null;
    const destinationCoords = destination ? destination.split(',').map(Number) as [number, number] : null;

    return (
        <MapContainer
            key={JSON.stringify(mapCenter)}
            center={mapCenter}
            zoom={13}
            style={mapContainerStyle}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
             {originCoords && <Marker position={originCoords}></Marker>}
             {destinationCoords && <Marker position={destinationCoords}></Marker>}
             {waypoints?.map((wp, index) => {
                const [lat, lon] = wp.location.split(',').map(Number);
                return <Marker key={index} position={[lat, lon]}></Marker>
             })}
            {origin && destination && <Routing origin={origin} destination={destination} waypoints={waypoints} />}
        </MapContainer>
    );
};

export default Map;
