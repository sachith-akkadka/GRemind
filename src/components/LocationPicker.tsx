
"use client";

import React, { useState, useMemo } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';

const mapContainerStyle = {
  width: '100%',
  height: '70vh',
};

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (latLng: { lat: number; lng: number }) => void;
  currentLocation: string;
}

export const LocationPicker = ({
  isOpen,
  onClose,
  onLocationSelect,
  currentLocation,
}: LocationPickerProps) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const center = useMemo(() => {
    const [lat, lng] = currentLocation.split(',').map(Number);
    return { lat, lng };
  }, [currentLocation]);

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      setSelectedLocation({
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      });
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  };
  
  const handleUseCurrentLocation = () => {
      onLocationSelect(center);
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select a Location</DialogTitle>
        </DialogHeader>
        <div className="relative">
          {loadError && <div>Error loading map</div>}
          {!isLoaded && <Skeleton className="h-[70vh] w-full" />}
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={15}
              onClick={handleMapClick}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
              }}
            >
              {!selectedLocation && <Marker position={center} title="Your Location" />}
              {selectedLocation && <Marker position={selectedLocation} />}
            </GoogleMap>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUseCurrentLocation}>Use My Current Location</Button>
          <Button onClick={handleConfirm} disabled={!selectedLocation}>
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
