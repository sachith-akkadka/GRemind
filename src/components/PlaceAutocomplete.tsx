// components/PlaceAutocomplete.tsx
import React, { useEffect, useRef, useState } from 'react';

type LatLng = { lat: number; lng: number };
type Suggestion = { description: string; place_id?: string; lat?: number; lng?: number; name?: string; vicinity?: string };

interface Props {
  taskTitle?: string;
  currentLocation?: LatLng | null;
  placeholder?: string;
  onSelect: (place: { placeId?: string; description: string; lat?: number; lng?: number; name?: string }) => void;
}

const PlaceAutocomplete: React.FC<Props> = ({ taskTitle = '', currentLocation = null, placeholder = 'Location (optional)', onSelect }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const acServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!(window as any).google) return;
    if (!acServiceRef.current) acServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
    if (!placesServiceRef.current) placesServiceRef.current = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
  }, []);

  async function fetchNearbyByTask() {
    if (!placesServiceRef.current || !currentLocation) {
      if (taskTitle && acServiceRef.current) {
        acServiceRef.current.getPlacePredictions({ input: taskTitle, locationBias: currentLocation ? new (window as any).google.maps.LatLng(currentLocation) : null }, (preds: any, status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) setSuggestions(preds || []);
        });
      }
      return;
    }
    const req = {
      location: new (window as any).google.maps.LatLng(currentLocation),
      radius: 5000,
      keyword: taskTitle || undefined,
      rankBy: (window as any).google.maps.places.RankBy.DISTANCE,
    };
    placesServiceRef.current.nearbySearch(req, (res: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        const preds = res.map((p: any) => ({
          description: p.name + (p.vicinity ? ' — ' + p.vicinity : ''),
          place_id: p.place_id,
          lat: p.geometry.location.lat(),
          lng: p.geometry.location.lng(),
          name: p.name,
          vicinity: p.vicinity,
        }));
        setSuggestions(preds);
      }
    });
  }

  function onFocus() {
    fetchNearbyByTask();
  }

  function onChangeHandler(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    if (!acServiceRef.current) return;
    const opts = { input: q, locationBias: currentLocation ? new (window as any).google.maps.LatLng(currentLocation) : undefined };
    acServiceRef.current.getPlacePredictions(opts, (preds: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        const list = preds.map((p: any) => ({ description: p.description, place_id: p.place_id }));
        setSuggestions(list);
      } else {
        setSuggestions([]);
      }
    });
  }

  function selectSuggestion(s: Suggestion) {
    if (!placesServiceRef.current || !s.place_id) {
      onSelect({ placeId: s.place_id, description: s.description, lat: s.lat, lng: s.lng, name: s.name });
      setSuggestions([]);
      if(inputRef.current) inputRef.current.value = s.description;
      return;
    }
    placesServiceRef.current.getDetails({ placeId: s.place_id, fields: ['name', 'geometry', 'formatted_address', 'place_id'] }, (place: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        const out = { placeId: place.place_id, description: place.formatted_address || place.name, lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), name: place.name };
        onSelect(out);
        setSuggestions([]);
        if (inputRef.current) inputRef.current.value = out.description;
      } else {
        onSelect({ placeId: s.place_id, description: s.description });
        setSuggestions([]);
        if(inputRef.current) inputRef.current.value = s.description;
      }
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <Input ref={inputRef} placeholder={placeholder} onFocus={onFocus} onChange={onChangeHandler} />
      {suggestions.length > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 50, background: 'hsl(var(--card))', borderRadius: 8, marginTop: 8, maxHeight: 220, overflowY: 'auto', border: '1px solid hsl(var(--border))' }}>
          {suggestions.map((s, i) => (
            <div key={i} onMouseDown={() => selectSuggestion(s)} style={{ padding: 10, cursor: 'pointer', borderBottom: '1px solid hsl(var(--border))' }}>
              <div style={{ fontSize: 14 }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaceAutocomplete;
