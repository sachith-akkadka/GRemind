// components/PlaceAutocomplete.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

type LatLng = { lat: number; lng: number };
type Suggestion = { description: string; place_id?: string; lat?: number; lng?: number; name?: string; vicinity?: string };

interface Props {
  taskTitle?: string;
  currentLocation?: LatLng | null;
  placeholder?: string;
  onSelect: (place: { placeId?: string; description: string; lat?: number; lng?: number; name?: string }) => void;
  onFocus?: () => void;
}

const PlaceAutocomplete: React.FC<Props> = ({ taskTitle = '', currentLocation = null, placeholder = 'Location (optional)', onSelect, onFocus: onFocusProp }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [inputValue, setInputValue] = useState('');
  const acServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!(window as any).google) return;
    if (!acServiceRef.current) acServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
    if (!placesServiceRef.current) placesServiceRef.current = new (window as any).google.maps.places.PlacesService(document.createElement('div'));
  }, []);

  async function fetchNearbyByTask() {
    if (!placesServiceRef.current || !currentLocation || !taskTitle) return;

    const req = {
      location: new (window as any).google.maps.LatLng(currentLocation),
      keyword: taskTitle,
      rankBy: (window as any).google.maps.places.RankBy.DISTANCE,
    };
    placesServiceRef.current.nearbySearch(req, (res: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        const preds = res.map((p: any) => ({
          description: p.name + (p.vicinity ? ` — ${p.vicinity}` : ''),
          place_id: p.place_id,
          name: p.name,
        }));
        setSuggestions(preds);
        setShowSuggestions(true);
      }
    });
  }
  
  const handleFocus = () => {
    onFocusProp?.();
    fetchNearbyByTask();
  };


  function onChangeHandler(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setInputValue(q);
    if (!acServiceRef.current || q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    };
    const opts = { input: q, locationBias: currentLocation ? new (window as any).google.maps.LatLng(currentLocation) : undefined };
    acServiceRef.current.getPlacePredictions(opts, (preds: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        const list = preds.map((p: any) => ({ description: p.description, place_id: p.place_id, name: p.structured_formatting.main_text }));
        setSuggestions(list);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    });
  }

  function selectSuggestion(s: Suggestion) {
    if (!placesServiceRef.current || !s.place_id) {
      onSelect({ placeId: s.place_id, description: s.description, name: s.name });
      setInputValue(s.description);
      setShowSuggestions(false);
      return;
    }
    placesServiceRef.current.getDetails({ placeId: s.place_id, fields: ['name', 'geometry', 'formatted_address', 'place_id'] }, (place: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        const out = { placeId: place.place_id, description: place.formatted_address || place.name, lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), name: place.name };
        onSelect(out);
        setInputValue(out.description);
        setShowSuggestions(false);
      } else {
        onSelect({ placeId: s.place_id, description: s.description, name: s.name });
        setInputValue(s.description);
        setShowSuggestions(false);
      }
    });
  }

  return (
    <div 
      className="relative w-full"
      onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setShowSuggestions(false);
          }
      }}
    >
      <Input
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={onChangeHandler}
        value={inputValue}
        autoComplete="off"
       />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 bg-card rounded-md mt-1 max-h-60 overflow-y-auto border">
          {suggestions.map((s, i) => (
            <div
              key={s.place_id || i}
              onMouseDown={() => selectSuggestion(s)}
              className="p-2 cursor-pointer hover:bg-muted text-sm"
            >
              {s.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaceAutocomplete;
