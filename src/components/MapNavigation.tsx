// components/MapNavigation.tsx
import React, { useEffect, useRef, useState } from 'react';

type LatLng = { lat: number; lng: number };

interface MapNavigationProps {
  origin: LatLng | string;
  destination: LatLng | string;
  waypoints?: Array<{ location: LatLng | string }>;
  onStepChanged?: (stepIndex: number, step: any) => void;
  onRerouteRequested?: (currentLocation: LatLng) => void;
  proximityMeters?: number;
  voiceEnabled?: boolean;
}

const MapNavigation: React.FC<MapNavigationProps> = ({
  origin,
  destination,
  waypoints = [],
  onStepChanged = () => {},
  onRerouteRequested = () => {},
  proximityMeters = Number(process.env.NEXT_PUBLIC_DEFAULT_PROXIMITY_METERS || 100),
  voiceEnabled = true,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapObj, setMapObj] = useState<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const [route, setRoute] = useState<any>(null);
  const stepIndexRef = useRef<number>(0);
  const rerouteThrottleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!window || !(window as any).google) return;
    if (!mapRef.current) return;
    const g = (window as any).google;
    const map = new g.maps.Map(mapRef.current, {
      zoom: 15,
      center: (typeof origin === 'string' ? { lat: 0, lng: 0 } : origin) || { lat: 0, lng: 0 },
      disableDefaultUI: false,
    });
    setMapObj(map);
    directionsRendererRef.current = new g.maps.DirectionsRenderer({
      map,
      polylineOptions: { strokeWeight: 6, zIndex: 2 },
      preserveViewport: false,
    });
    directionsServiceRef.current = new g.maps.DirectionsService();
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapObj) return;
    requestRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapObj, origin, destination, JSON.stringify(waypoints)]);

  function speak(text: string) {
    if (!voiceEnabled || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function stripHtml(html: string) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function requestRoute() {
    if (!directionsServiceRef.current || !origin || !destination) return;
    const g = (window as any).google;
    const request = {
      origin,
      destination,
      travelMode: g.maps.TravelMode.DRIVING,
      waypoints,
      provideRouteAlternatives: false,
      optimizeWaypoints: true,
      drivingOptions: { departureTime: new Date() },
    };
    directionsServiceRef.current.route(request, (result: any, status: any) => {
      if (status === 'OK') {
        directionsRendererRef.current.setDirections(result);
        const r = result.routes[0];
        setRoute(r);
        const firstLeg = r.legs[0];
        if (firstLeg && firstLeg.steps && firstLeg.steps.length) {
          stepIndexRef.current = 0;
          onStepChanged(0, firstLeg.steps[0]);
          if (voiceEnabled) speak(stripHtml(firstLeg.steps[0].instructions));
        }
        startPositionWatcher();
      } else {
        console.error('Directions request failed:', status);
      }
    });
  }

  function startPositionWatcher() {
    if (!('geolocation' in navigator)) return;
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        checkProgress(latlng);
      },
      (err) => console.warn('watchPosition err', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function haversine(a: LatLng, b: LatLng) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2) ** 2;
    const sinDLon = Math.sin(dLon / 2) ** 2;
    const x = sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  function findClosestStepIndex(latlng: LatLng) {
    if (!route) return { idx: -1, minDist: Infinity };
    const leg = route.legs[0];
    let minDist = Infinity;
    let idx = -1;
    leg.steps.forEach((s: any, i: number) => {
      const stepLatLng = { lat: s.end_location.lat(), lng: s.end_location.lng() };
      const d = haversine(latlng, stepLatLng);
      if (d < minDist) {
        minDist = d;
        idx = i;
      }
    });
    return { idx, minDist };
  }

  function checkProgress(currentLatLng: LatLng) {
    if (!route) return;
    const { idx, minDist } = findClosestStepIndex(currentLatLng);
    if (idx === -1) return;
    const leg = route.legs[0];
    const step = leg.steps[idx];
    const destLoc = { lat: leg.end_location.lat(), lng: leg.end_location.lng() };
    const distToDest = haversine(currentLatLng, destLoc);

    if (distToDest <= proximityMeters) {
      window.dispatchEvent(new CustomEvent('gremind:proximity', { detail: { distance: Math.round(distToDest) } }));
    }

    const currentStepEnd = { lat: step.end_location.lat(), lng: step.end_location.lng() };
    const distToStepEnd = haversine(currentLatLng, currentStepEnd);
    if (distToStepEnd > 200) {
      // throttle reroute requests to once per 8s
      if (!rerouteThrottleRef.current) {
        if(onRerouteRequested) onRerouteRequested(currentLatLng);
        rerouteThrottleRef.current = window.setTimeout(() => {
          rerouteThrottleRef.current && window.clearTimeout(rerouteThrottleRef.current);
          rerouteThrottleRef.current = null;
        }, 8000);
      }
      if (directionsServiceRef.current) {
        const g = (window as any).google;
        const request = {
          origin: currentLatLng,
          destination,
          travelMode: g.maps.TravelMode.DRIVING,
          waypoints,
          provideRouteAlternatives: false,
        };
        directionsServiceRef.current.route(request, (result: any, status: any) => {
          if (status === 'OK') {
            directionsRendererRef.current.setDirections(result);
            setRoute(result.routes[0]);
          }
        });
      }
    } else {
      if (idx !== stepIndexRef.current) {
        stepIndexRef.current = idx;
        onStepChanged(idx, step);
        if (voiceEnabled) speak(stripHtml(step.instructions));
      }
    }
  }

  return <div style={{ width: '100%', height: '100%', position: 'relative' }}><div ref={mapRef} style={{ width: '100%', height: '100%' }} /></div>;
};

export default MapNavigation;
