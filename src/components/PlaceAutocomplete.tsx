// components/PlaceAutocomplete.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SuggestLocationsOutput, suggestLocations } from '@/ai/flows/suggest-locations';
import { useDebounce } from 'use-debounce';
import { Loader2 } from 'lucide-react';

type LatLng = { lat: number; lng: number };
type Place = { placeId?: string; description: string; lat?: number; lng?: number; name?: string, address?: string, eta?: string };

interface Props {
  taskTitle?: string;
  currentLocation?: LatLng | null;
  placeholder?: string;
  onSelect: (place: Place) => void;
  onFocus?: () => void;
  initialValue?: string;
}

const PlaceAutocomplete: React.FC<Props> = ({ taskTitle = '', currentLocation = null, placeholder = 'Location (optional)', onSelect, onFocus: onFocusProp, initialValue }) => {
  const [suggestions, setSuggestions] = useState<SuggestLocationsOutput['suggestions']>([]);
  const [inputValue, setInputValue] = useState('');
  const [debouncedInput] = useDebounce(inputValue, 400);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialValue) {
        setInputValue(initialValue);
    }
  }, [initialValue]);

  const fetchSuggestions = async (query: string) => {
    if (!currentLocation || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
        const result = await suggestLocations({ query, userLocation: `${currentLocation.lat},${currentLocation.lng}` });
        setSuggestions(result.suggestions);
        setShowSuggestions(true);
    } catch (e) {
        console.error("Error fetching suggestions:", e);
        setSuggestions([]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(debouncedInput);
  }, [debouncedInput, currentLocation]);
  
  const handleFocus = () => {
    onFocusProp?.();
    if (inputValue) {
        setShowSuggestions(true);
    }
  };

  function onChangeHandler(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setInputValue(q);
  }

  function selectSuggestion(s: SuggestLocationsOutput['suggestions'][0]) {
    const [lat, lng] = s.latlon.split(',').map(Number);
    const place: Place = {
      name: s.name,
      description: s.address,
      lat: lat,
      lng: lng,
      eta: s.eta,
      address: s.address
    }
    onSelect(place);
    setInputValue(s.name);
    setShowSuggestions(false);
  }
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div 
      className="relative w-full"
      ref={containerRef}
    >
      <div className="relative">
        <Input
            placeholder={placeholder}
            onFocus={handleFocus}
            onChange={onChangeHandler}
            value={inputValue}
            autoComplete="off"
        />
        {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 bg-card rounded-md mt-1 max-h-60 overflow-y-auto border">
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => selectSuggestion(s)}
              className="p-3 cursor-pointer hover:bg-muted text-sm"
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-muted-foreground">{s.address}</p>
              {s.eta && <p className="text-xs text-primary font-bold">{s.eta}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaceAutocomplete;
